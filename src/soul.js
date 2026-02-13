const fs = require("fs");
const path = require("path");
const { DEFAULT_CONFIG } = require("../config");

function resolveSoulPath(config) {
  const configured =
    config && config.identity && config.identity.soulPath
      ? config.identity.soulPath
      : DEFAULT_CONFIG.identity && DEFAULT_CONFIG.identity.soulPath
        ? DEFAULT_CONFIG.identity.soulPath
        : "identity/soul.md";
  return path.isAbsolute(configured)
    ? configured
    : path.join(__dirname, "..", configured);
}

function loadSoulText(config) {
  const soulPath = resolveSoulPath(config);
  if (!fs.existsSync(soulPath)) return "";
  return fs.readFileSync(soulPath, "utf8").trim();
}

function applySoul(basePrompt, config) {
  const soul = loadSoulText(config);
  if (!soul) return basePrompt || "";
  const base = basePrompt ? String(basePrompt).trim() : "";
  if (base && base.includes(soul)) return base;
  return [base, "Soul:", soul].filter(Boolean).join("\n\n");
}

module.exports = {
  loadSoulText,
  applySoul
};
