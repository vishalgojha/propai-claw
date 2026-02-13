const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const { loadConfig, saveConfig } = require("../../src/configStore");

const ALIASES = {
  openai_key: "providers.openai.apiKey",
  openrouter_key: "providers.openrouter.apiKey",
  groq_key: "providers.groq.apiKey",
  together_key: "providers.together.apiKey",
  mistral_key: "providers.mistral.apiKey",
  anthropic_key: "providers.anthropic.apiKey",
  gemini_key: "providers.gemini.apiKey",
  cohere_key: "providers.cohere.apiKey",
  azure_key: "providers.azure_openai.apiKey",
  search_key: "search.apiKey",
  gmail_refresh: "gmail.refreshToken"
};

function isSensitiveKey(key) {
  return /key|token|secret|password/i.test(key);
}

function maskValue(value) {
  if (value === undefined || value === null) return value;
  const text = String(value);
  if (text.length <= 4) return "****";
  return `${text.slice(0, 2)}****${text.slice(-2)}`;
}

function maskConfig(obj) {
  if (Array.isArray(obj)) {
    return obj.map(maskConfig);
  }
  if (obj && typeof obj === "object") {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (isSensitiveKey(key)) {
        result[key] = maskValue(value);
      } else {
        result[key] = maskConfig(value);
      }
    });
    return result;
  }
  return obj;
}

function buildPatch(pathKey, value) {
  const keys = pathKey.split(".");
  const patch = {};
  let cursor = patch;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
    } else {
      cursor[key] = {};
      cursor = cursor[key];
    }
  });
  return patch;
}

function coerceValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function registerConfig(program) {
  const configCmd = program.command("config").description("Config commands");

  configCmd
    .command("show")
    .description("Show config (masked)")
    .action(() => {
      const config = loadConfig();
      const masked = maskConfig(config);
      console.log(JSON.stringify(masked, null, 2));
    });

  configCmd
    .command("set <pairs...>")
    .description("Set config values (key=value)")
    .action((pairs) => {
      let patch = {};
      pairs.forEach((pair) => {
        const [rawKey, ...rest] = pair.split("=");
        if (!rawKey || rest.length === 0) {
          console.log(chalk.yellow(`Skipping invalid pair: ${pair}`));
          return;
        }
        const key = ALIASES[rawKey] || rawKey;
        const value = coerceValue(rest.join("="));
        const piece = buildPatch(key, value);
        patch = deepMerge(patch, piece);
      });
      saveConfig(patch);
      console.log(chalk.green("Config updated."));
    });
}

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

module.exports = {
  registerConfig
};
