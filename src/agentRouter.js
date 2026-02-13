const { generateResponse } = require("./aiClient");
const { searchWeb } = require("./searchTool");
const { sendEmail } = require("./gmail");

function extractAfterPrefix(text, prefix) {
  const index = text.toLowerCase().indexOf(prefix);
  if (index === -1) return null;
  return text.slice(index + prefix.length).trim();
}

async function handleMessage(message, config) {
  const content = (message.content || "").trim();
  const lower = content.toLowerCase();

  if (lower.includes("search:")) {
    const query = extractAfterPrefix(content, "search:");
    if (!query) {
      return { reply: "Please provide a search query after 'search:'." };
    }
    const results = await searchWeb(query, config);
    const context = results
      .map((item, index) => `${index + 1}. ${item.title} - ${item.link}\n${item.snippet}`)
      .join("\n\n");
    const reply = await generateResponse(
      `User asked: ${query}\n\nSearch results:\n${context}`,
      config
    );
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
    return { reply: "Email sent.", meta: { tool: "gmail" } };
  }

  const reply = await generateResponse(content, config);
  return { reply, meta: { tool: "ai" } };
}

module.exports = {
  handleMessage
};
