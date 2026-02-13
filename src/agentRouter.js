const { generateResponse } = require("./aiClient");
const { searchWeb } = require("./searchTool");
const { sendEmail } = require("./gmail");
const { extractLeadFields } = require("./leadExtractor");
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

function buildLeadKey(message) {
  const context = message.context || {};
  if (context.lead_id) return `lead:${context.lead_id}`;
  if (context.phone) return `phone:${context.phone}`;
  if (context.email) return `email:${context.email}`;
  if (context.whatsapp && context.whatsapp.from)
    return `wa:${context.whatsapp.from}`;
  if (context.sessionId) return `session:${context.sessionId}`;
  return `source:${message.source || "unknown"}`;
}

function summarizeLead(lead) {
  return [
    `Name: ${lead.lead_name || "-"}`,
    `Phone: ${lead.phone || "-"}`,
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
    .map(
      (message) =>
        `[${message.direction}] ${message.content}`.trim()
    )
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

function buildContextPrompt({ lead, messages, market }) {
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
    "Conversation History:",
    summarizeConversation(messages)
  ].join("\n");
}

async function handleMessage(message, config) {
  const content = (message.content || "").trim();
  const lower = content.toLowerCase();
  const leadKey = buildLeadKey(message);
  const lead = await getOrCreateLead({
    leadKey,
    source: message.source || "web",
    phone: message.context && message.context.phone,
    email: message.context && message.context.email
  });

  if (content) {
    await addMessage({
      leadId: lead.id,
      source: message.source || "web",
      direction: "in",
      content
    });
  }

  const extracted = await extractLeadFields(content, message.source, config);
  await updateLeadFields(lead.id, extracted);
  const updatedLead = await getLeadById(lead.id);
  const recentMessages = await listMessages(lead.id, 12);
  const contextPrompt = buildContextPrompt({
    lead: updatedLead,
    messages: recentMessages,
    market: config.market || {}
  });

  if (lower.includes("search:")) {
    const query = extractAfterPrefix(content, "search:");
    if (!query) {
      return { reply: "Please provide a search query after 'search:'." };
    }
    const results = await searchWeb(query, config);
    const context = results
      .map(
        (item, index) =>
          `${index + 1}. ${item.title} - ${item.link}\n${item.snippet}`
      )
      .join("\n\n");
    const reply = await generateResponse(
      `${contextPrompt}\n\nUser asked: ${query}\n\nSearch results:\n${context}`,
      config
    );
    await addMessage({
      leadId: lead.id,
      source: message.source || "web",
      direction: "out",
      content: reply
    });
    return { reply, meta: { tool: "search" } };
  }

  if (lower.includes("reply email:")) {
    const body = extractAfterPrefix(content, "reply email:");
    const emailContext = message.context && message.context.email;
    if (!emailContext || !emailContext.from) {
      return {
        reply:
          "Missing email context. Provide context.email.from and context.email.subject."
      };
    }
    const subject = emailContext.subject
      ? `Re: ${emailContext.subject}`
      : "Re: Your inquiry";

    await sendEmail(
      {
        to: emailContext.from,
        subject,
        body: body || "Thank you for your message."
      },
      config
    );
    await addMessage({
      leadId: lead.id,
      source: message.source || "web",
      direction: "out",
      content: "Email sent."
    });
    return { reply: "Email sent.", meta: { tool: "gmail" } };
  }

  const reply = await generateResponse(
    `${contextPrompt}\n\nUser message:\n${content}`,
    config
  );
  await addMessage({
    leadId: lead.id,
    source: message.source || "web",
    direction: "out",
    content: reply
  });
  return { reply, meta: { tool: "ai" } };
}

module.exports = {
  handleMessage
};
