const fs = require("fs");
const path = require("path");
const { CONFIG_PATH, DEFAULT_CONFIG } = require("../config");

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(target, source) {
  const output = { ...target };
  if (!isObject(source)) {
    return output;
  }

  for (const [key, value] of Object.entries(source)) {
    if (isObject(value) && isObject(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

function readConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {};
  }
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("config.local.json is not valid JSON.");
  }
}

function writeConfigFile(config) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function applyEnvOverrides(config) {
  const next = { ...config };
  if (process.env.AI_PROVIDER) next.ai.provider = process.env.AI_PROVIDER;
  if (process.env.AI_MODEL) next.ai.model = process.env.AI_MODEL;
  if (process.env.AI_TEMPERATURE)
    next.ai.temperature = Number(process.env.AI_TEMPERATURE);
  if (process.env.OPENAI_API_KEY)
    next.providers.openai.apiKey = process.env.OPENAI_API_KEY;
  return next;
}

function loadConfig() {
  const fileConfig = readConfigFile();
  const merged = deepMerge(DEFAULT_CONFIG, fileConfig);
  return applyEnvOverrides(merged);
}

function saveConfig(patch) {
  const current = readConfigFile();
  const merged = deepMerge(DEFAULT_CONFIG, deepMerge(current, patch));
  writeConfigFile(merged);
  return merged;
}

module.exports = {
  loadConfig,
  saveConfig
};
