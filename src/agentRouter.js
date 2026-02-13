const { extractLeadFields } = require("./leadExtractor");
const { invokeTool } = require("./toolRegistry");
const { selectAgent } = require("./agentSelector");
const { upsertMemory, getMemory, listMemory } = require("./memoryStore");
const {
  getOrCreateLead,
  updateLeadFields,
  addMessage,
  listMessages,
  getLeadById
} = require("./leadStore");

function extractAfterPrefix(text, prefix) {
  const index = text.toLowerCase().indexOf(prefix);
  if (index === -1) return null;
  return text.slice(index + prefix.length).trim();
}

function summarizeLead(lead) {
  return [
    `Name: ${lead.lead_name || "-"}`,
    `Phone: ${lead.phone || "-"}`,
    `Email: ${lead.email || "-"}`,
    `Intent: ${lead.intent || "-"}`,
    `Budget: ${lead.budget || "-"}`,
    `Location: ${lead.location || "-"}`,
    `Configuration: ${lead.configuration || "-"}`,
    `Timeline: ${lead.timeline || "-"}`,
    `Status: ${lead.status || "-"}`
  ].join("\n");
}

function summarizeConversation(messages) {
  if (!messages.length) return "No prior messages.";
  const ordered = [...messages].reverse();
  return ordered
    .map((message) => `[${message.direction}] ${message.content}`.trim())
    .join("\n");
}

function missingLeadFields(lead) {
  const required = [
    { key: "intent", label: "intent (buy/sell/rent)" },
    { key: "budget", label: "budget" },
    { key: "location", label: "location" },
    { key: "configuration", label: "configuration (BHK)" },
    { key: "timeline", label: "timeline" }
  ];
  return required
    .filter((item) => !lead[item.key])
    .map((item) => item.label);
}

function formatMemorySection(title, content) {
  if (!content) return "";
  return `${title}:\n${content}\n`;
}

async function buildMemoryContext(lead, config) {
  const leadMemory = await getMemory("lead", String(lead.id));
  const marketKey = config.market && config.market.city ? config.market.city : null;
  const marketMemory = marketKey
    ? await getMemory("market", marketKey)
    : null;
  const globalMemories = await listMemory("global", 3);

  const globalText = globalMemories.length
    ? globalMemories.map((item) => `- ${item.content}`).join("\n")
    : "";

  return [
    formatMemorySection("Lead Memory", leadMemory && leadMemory.content),
    formatMemorySection("Market Memory", marketMemory && marketMemory.content),
    formatMemorySection("Global Memory", globalText)
  ]
    .filter(Boolean)
    .join("\n");
}

function buildContextPrompt({ lead, messages, market, memory }) {
  const missing = missingLeadFields(lead);
  const qualifier = missing.length
    ? `Qualification needed: ask for ${missing.join(", ")}.`
    : "Lead is qualified.";

  const marketLine = market && market.city
    ? `Market: ${market.city}${market.notes ? ` (${market.notes})` : ""}`
    : "Market: -";

  return [
    "Lead Profile:",
    summarizeLead(lead),
    "",
    marketLine,
    qualifier,
    "",
    memory ? `Memory Context:\n${memory}` : "",
    "Conversation History:",
    summarizeConversation(messages)
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleEvent(event, config) {
  const content = (event.content || "").trim();
  const lower = content.toLowerCase();
  const agent = selectAgent(content, config);
  const systemPrompt =
    (agent && agent.systemPrompt) || config.ai.systemPrompt;

  const lead = await getOrCreateLead({
    leadKey: event.leadKey,
    source: event.source || "web",
    phone: event.context && event.context.phone,
    email: event.context && event.context.email
  });

  if (content) {
    await addMessage({
      leadId: lead.id,
      source: event.source || "web",
      direction: "in",
      content
    });
  }

  const extracted = await extractLeadFields(content, event.source, config);
  await updateLeadFields(lead.id, extracted);
  const updatedLead = await getLeadById(lead.id);
  const recentMessages = await listMessages(lead.id, 12);

  const leadSummary = summarizeLead(updatedLead);
  if (config.memory && config.memory.enabled) {
    await upsertMemory({
      scope: "lead",
      key: String(updatedLead.id),
      content: leadSummary,
      tags: ["lead", updatedLead.intent || "unknown"]
    });
  }

  const memoryContext = config.memory && config.memory.enabled
    ? await buildMemoryContext(updatedLead, config)
    : "";

  const contextPrompt = buildContextPrompt({
    lead: updatedLead,
    messages: recentMessages,
    market: config.market || {},
    memory: memoryContext
  });

  if (lower.includes("search:")) {
    const query = extractAfterPrefix(content, "search:");
    if (!query) {
      return { reply: "Please provide a search query after 'search:'." };
    }
    const result = await invokeTool(
      "search_web",
      { query },
      config,
      { leadId: lead.id, source: event.source }
    );
    const context = (result.results || [])
      .map(
        (item, index) =>
          `${index + 1}. ${item.title} - ${item.link}\n${item.snippet}`
      )
      .join("\n\n");
    const replyResult = await invokeTool(
      "ai_generate",
      {
        prompt: `${contextPrompt}\n\nUser asked: ${query}\n\nSearch results:\n${context}`,
        systemPrompt
      },
      config,
      { leadId: lead.id, source: event.source }
    );
    const reply = replyResult.text;
    await addMessage({
      leadId: lead.id,
      source: event.source || "web",
      direction: "out",
      content: reply
    });
    return { reply, meta: { tool: "search", agent: agent.id } };
  }

  if (lower.includes("reply email:")) {
    const body = extractAfterPrefix(content, "reply email:");
    const emailContext = event.context && event.context.email;
    if (!emailContext || !emailContext.from) {
      return {
        reply:
          "Missing email context. Provide context.email.from and context.email.subject."
      };
    }
    const subject = emailContext.subject
      ? `Re: ${emailContext.subject}`
      : "Re: Your inquiry";

    await invokeTool(
      "gmail_send",
      {
        to: emailContext.from,
        subject,
        body: body || "Thank you for your message."
      },
      config,
      { leadId: lead.id, source: event.source }
    );
    await addMessage({
      leadId: lead.id,
      source: event.source || "web",
      direction: "out",
      content: "Email sent."
    });
    return { reply: "Email sent.", meta: { tool: "gmail", agent: agent.id } };
  }

  const replyResult = await invokeTool(
    "ai_generate",
    {
      prompt: `${contextPrompt}\n\nUser message:\n${content}`,
      systemPrompt
    },
    config,
    { leadId: lead.id, source: event.source }
  );
  const reply = replyResult.text;
  await addMessage({
    leadId: lead.id,
    source: event.source || "web",
    direction: "out",
    content: reply
  });
  return { reply, meta: { tool: "ai", agent: agent.id } };
}

module.exports = {
  handleEvent
};
