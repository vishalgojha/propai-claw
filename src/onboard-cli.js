const readline = require("readline");
const { loadConfig, saveConfig } = require("./configStore");
const { DEFAULT_MODEL_CATALOG } = require("./modelCatalog");

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "gemini", label: "Gemini" },
  { id: "mistral", label: "Mistral" },
  { id: "groq", label: "Groq" },
  { id: "together", label: "Together" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "cohere", label: "Cohere" },
  { id: "azure_openai", label: "Azure OpenAI" },
  { id: "ollama", label: "Ollama (local)" },
  { id: "lmstudio", label: "LM Studio (local)" }
];

const SEARCH_PROVIDERS = [
  { id: "serper", label: "Serper (Google)" },
  { id: "google_cse", label: "Google Custom Search" }
];

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

function displayOptions(options, currentId) {
  options.forEach((option, index) => {
    const marker = option.id === currentId ? "*" : " ";
    console.log(` ${index + 1}. ${option.label} ${marker}`);
  });
}

function parseIndex(answer, max) {
  const value = Number(answer);
  if (!Number.isInteger(value)) return null;
  if (value < 1 || value > max) return null;
  return value - 1;
}

async function selectOption(rl, label, options, currentId) {
  console.log(`\n${label}`);
  displayOptions(options, currentId);
  const currentLabel =
    options.find((option) => option.id === currentId)?.label || "none";
  const answer = await ask(
    rl,
    `Choose 1-${options.length} (Enter to keep ${currentLabel}): `
  );
  if (!answer.trim()) return currentId;
  const index = parseIndex(answer.trim(), options.length);
  if (index === null) {
    console.log("Invalid selection. Keeping current.");
    return currentId;
  }
  return options[index].id;
}

async function selectModel(rl, provider, currentModel, catalog) {
  const models = catalog[provider] || [];
  if (!models.length) {
    return promptInput(rl, "Model", currentModel);
  }

  console.log("\nModel");
  models.forEach((modelName, index) => {
    const marker = modelName === currentModel ? "*" : " ";
    console.log(` ${index + 1}. ${modelName} ${marker}`);
  });
  console.log(` ${models.length + 1}. Custom model`);

  const answer = await ask(
    rl,
    `Choose 1-${models.length + 1} (Enter to keep ${currentModel || "none"}): `
  );
  if (!answer.trim()) return undefined;
  const index = parseIndex(answer.trim(), models.length + 1);
  if (index === null) {
    console.log("Invalid selection. Keeping current.");
    return undefined;
  }
  if (index === models.length) {
    return promptInput(rl, "Custom model", currentModel);
  }
  return models[index];
}

async function promptInput(rl, label, currentValue) {
  const suffix = currentValue ? ` [current: ${currentValue}]` : "";
  const answer = await ask(rl, `${label}${suffix}: `);
  const trimmed = answer.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

async function promptBoolean(rl, label, currentValue) {
  const hint = currentValue ? "Y/n" : "y/N";
  const answer = await ask(rl, `${label} (${hint}): `);
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return currentValue;
  if (["y", "yes", "true", "1"].includes(trimmed)) return true;
  if (["n", "no", "false", "0"].includes(trimmed)) return false;
  console.log("Invalid input. Keeping current.");
  return currentValue;
}

async function run() {
  const config = loadConfig();
  const modelCatalog = config.modelCatalog || DEFAULT_MODEL_CATALOG;
  const rl = createInterface();

  console.log("PropAI-Claw terminal onboarding");
  console.log("Press Enter to keep current values.\n");

  const provider = await selectOption(
    rl,
    "AI Provider",
    PROVIDERS,
    config.ai.provider
  );
  const providerConfig = (config.providers && config.providers[provider]) || {};

  const model = await selectModel(
    rl,
    provider,
    config.ai.model,
    modelCatalog
  );
  const apiKey = await promptInput(rl, "API key", providerConfig.apiKey);
  const baseUrl = await promptInput(rl, "Base URL", providerConfig.baseUrl);

  let deployment;
  let apiVersion;
  if (provider === "azure_openai") {
    deployment = await promptInput(
      rl,
      "Azure deployment name",
      providerConfig.deployment
    );
    apiVersion = await promptInput(
      rl,
      "Azure API version",
      providerConfig.apiVersion
    );
  }

  const configureSearch = await promptBoolean(
    rl,
    "Configure web search",
    Boolean(config.search && config.search.apiKey)
  );
  let searchProvider;
  let searchKey;
  let searchCx;
  if (configureSearch) {
    searchProvider = await selectOption(
      rl,
      "Search provider",
      SEARCH_PROVIDERS,
      config.search.provider || "serper"
    );
    searchKey = await promptInput(
      rl,
      "Search API key",
      config.search.apiKey
    );
    if (searchProvider === "google_cse") {
      searchCx = await promptInput(rl, "Google CSE cx", config.search.cx);
    }
  }

  const gmailEnabled = await promptBoolean(
    rl,
    "Enable Gmail integration",
    config.gmail.enabled
  );
  let gmailCredentialsPath;
  let gmailTokenPath;
  let gmailRedirectUri;
  if (gmailEnabled) {
    gmailCredentialsPath = await promptInput(
      rl,
      "Gmail credentials path",
      config.gmail.credentialsPath
    );
    gmailTokenPath = await promptInput(
      rl,
      "Gmail token path",
      config.gmail.tokenPath
    );
    gmailRedirectUri = await promptInput(
      rl,
      "Gmail redirect URI",
      config.gmail.redirectUri
    );
  }

  const whatsappEnabled = await promptBoolean(
    rl,
    "Enable WhatsApp integration",
    config.whatsapp.enabled
  );

  const marketCity = await promptInput(
    rl,
    "Market city",
    config.market && config.market.city
  );
  const marketNotes = await promptInput(
    rl,
    "Market notes",
    config.market && config.market.notes
  );

  const patch = {
    ai: {
      provider
    },
    providers: {
      [provider]: {}
    }
  };

  if (model !== undefined) patch.ai.model = model;
  if (model !== undefined) patch.providers[provider].model = model;
  if (apiKey !== undefined) patch.providers[provider].apiKey = apiKey;
  if (baseUrl !== undefined) patch.providers[provider].baseUrl = baseUrl;
  if (deployment !== undefined) patch.providers[provider].deployment = deployment;
  if (apiVersion !== undefined) patch.providers[provider].apiVersion = apiVersion;

  if (configureSearch) {
    patch.search = {};
    if (searchProvider !== undefined) patch.search.provider = searchProvider;
    if (searchKey !== undefined) patch.search.apiKey = searchKey;
    if (searchCx !== undefined) patch.search.cx = searchCx;
  }

  if (gmailEnabled !== undefined) {
    patch.gmail = { enabled: gmailEnabled };
    if (gmailCredentialsPath !== undefined)
      patch.gmail.credentialsPath = gmailCredentialsPath;
    if (gmailTokenPath !== undefined) patch.gmail.tokenPath = gmailTokenPath;
    if (gmailRedirectUri !== undefined)
      patch.gmail.redirectUri = gmailRedirectUri;
  }

  if (whatsappEnabled !== undefined) {
    patch.whatsapp = { enabled: whatsappEnabled };
  }

  if (marketCity !== undefined || marketNotes !== undefined) {
    patch.market = {};
    if (marketCity !== undefined) patch.market.city = marketCity;
    if (marketNotes !== undefined) patch.market.notes = marketNotes;
  }

  saveConfig(patch);
  rl.close();

  console.log("\nSaved configuration to config.local.json.");
  console.log("Start the server with: npm start");
}

if (require.main === module) {
  run().catch((error) => {
    console.error("Onboarding failed:", error.message);
    process.exit(1);
  });
}

module.exports = {
  run
};
