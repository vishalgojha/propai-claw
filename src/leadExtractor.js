const { generateResponse } = require("./aiClient");

const LEAD_FIELDS = [
  "signal",
  "lead_name",
  "phone",
  "email",
  "intent",
  "lead_type",
  "group_name",
  "contact",
  "budget",
  "location",
  "configuration",
  "timeline",
  "urgency_score",
  "source"
];

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

function normalizeLeadFields(raw, source, context) {
  const result = {};
  LEAD_FIELDS.forEach((field) => {
    if (raw && Object.prototype.hasOwnProperty.call(raw, field)) {
      result[field] = raw[field];
    }
  });

  if (result.lead_type && !result.intent) {
    const type = String(result.lead_type).toLowerCase();
    if (type === "buyer") result.intent = "buy";
    if (type === "seller") result.intent = "sell";
  }

  if (result.contact && !result.phone) {
    const contact = String(result.contact).trim();
    if (/\d/.test(contact)) {
      result.phone = contact;
    }
  }

  if (!result.group_name && context && context.whatsapp) {
    result.group_name = context.whatsapp.groupName || null;
  }

  result.source = result.source || source;
  return result;
}

function fallbackExtract(content, source, context) {
  const lower = content.toLowerCase();
  let intent;
  if (lower.includes("buy") || lower.includes("purchase")) intent = "buy";
  if (lower.includes("sell")) intent = "sell";
  if (lower.includes("rent") || lower.includes("lease")) intent = "rent";

  const phoneMatch = content.match(/(\+?\d[\d\s-]{7,}\d)/g);
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  const configMatch = content.match(/\b\d+\s*bhk\b/i);
  const configuration = configMatch ? configMatch[0].toUpperCase() : undefined;

  const timeline =
    lower.includes("urgent") || lower.includes("immediately")
      ? "urgent"
      : undefined;

  const signal = Boolean(
    intent || phone || configuration || timeline || lower.includes("budget")
  );

  const urgencyScore = timeline ? 80 : signal ? 40 : 0;

  return {
    signal,
    lead_name: undefined,
    phone,
    email: undefined,
    intent,
    lead_type: intent === "buy" ? "buyer" : intent === "sell" ? "seller" : null,
    group_name: context && context.whatsapp ? context.whatsapp.groupName : null,
    contact: phone,
    budget: undefined,
    location: undefined,
    configuration,
    timeline,
    urgency_score: urgencyScore,
    source
  };
}

async function extractLeadFields(content, source, config, context = {}) {
  const prompt = `You are PropAI-Claw. Determine if the message is SIGNAL or NOISE for real estate deals.\nReturn ONLY valid JSON with these keys: ${LEAD_FIELDS.join(
    ", "
  )}.\nRules:\n- signal must be true or false.\n- If signal is false, set all other fields to null and urgency_score to 0.\n- Do not hallucinate missing data. Use null when unknown.\n- lead_type is buyer or seller only when explicit.\n- urgency_score is 0-100 based on urgency language.\n\nMessage:\n"""${content}"""\n`;

  try {
    const response = await generateResponse(prompt, config);
    const parsed = safeJsonParse(response);
    if (!parsed) {
      return fallbackExtract(content, source, context);
    }
    const normalized = normalizeLeadFields(parsed, source, context);
    return normalized;
  } catch (_) {
    return fallbackExtract(content, source, context);
  }
}

module.exports = {
  extractLeadFields
};
