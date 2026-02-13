const { generateResponse } = require("./aiClient");

const LEAD_FIELDS = [
  "lead_name",
  "phone",
  "intent",
  "budget",
  "location",
  "configuration",
  "timeline",
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

function normalizeLeadFields(raw) {
  const result = {};
  LEAD_FIELDS.forEach((field) => {
    if (raw && Object.prototype.hasOwnProperty.call(raw, field)) {
      result[field] = raw[field];
    }
  });
  return result;
}

function fallbackExtract(content, source) {
  const lower = content.toLowerCase();
  let intent;
  if (lower.includes("buy") || lower.includes("purchase")) intent = "buy";
  if (lower.includes("sell")) intent = "sell";
  if (lower.includes("rent") || lower.includes("lease")) intent = "rent";

  const phoneMatch = content.match(
    /(\+?\d[\d\s-]{7,}\d)/g
  );
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  const configMatch = content.match(/\b\d+\s*bhk\b/i);
  const configuration = configMatch ? configMatch[0].toUpperCase() : undefined;

  const timeline =
    lower.includes("urgent") || lower.includes("immediately")
      ? "urgent"
      : undefined;

  return {
    lead_name: undefined,
    phone,
    intent,
    budget: undefined,
    location: undefined,
    configuration,
    timeline,
    source
  };
}

async function extractLeadFields(content, source, config) {
  const prompt = `Extract lead information from this message.\nReturn ONLY valid JSON with these keys: ${LEAD_FIELDS.join(
    ", "
  )}.\nIf unknown, set the value to null.\n\nMessage:\n"""${content}"""\n`;

  try {
    const response = await generateResponse(prompt, config);
    const parsed = safeJsonParse(response);
    if (!parsed) {
      return fallbackExtract(content, source);
    }
    const normalized = normalizeLeadFields(parsed);
    normalized.source = normalized.source || source;
    return normalized;
  } catch (_) {
    return fallbackExtract(content, source);
  }
}

module.exports = {
  extractLeadFields
};
