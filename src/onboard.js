const { DEFAULT_CONFIG } = require("../config");
const { saveConfig, loadConfig } = require("./configStore");

const PROVIDERS = [
  { id: "openai", label: "OpenAI", requiresKey: true },
  { id: "anthropic", label: "Anthropic", requiresKey: true },
  { id: "gemini", label: "Gemini", requiresKey: true },
  { id: "mistral", label: "Mistral", requiresKey: true },
  { id: "groq", label: "Groq", requiresKey: true },
  { id: "together", label: "Together", requiresKey: true },
  { id: "openrouter", label: "OpenRouter", requiresKey: true },
  { id: "cohere", label: "Cohere", requiresKey: true },
  { id: "azure_openai", label: "Azure OpenAI", requiresKey: true },
  { id: "ollama", label: "Ollama (local)", requiresKey: false },
  { id: "lmstudio", label: "LM Studio (local)", requiresKey: false }
];

const SEARCH_PROVIDERS = [
  { id: "serper", label: "Serper (Google)" },
  { id: "google_cse", label: "Google Custom Search" }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderOnboardPage(config) {
  const activeProvider = (config.ai && config.ai.provider) || "openai";
  const providerConfig =
    (config.providers && config.providers[activeProvider]) || {};
  const activeSearchProvider =
    (config.search && config.search.provider) || "serper";
  const searchConfig = config.search || {};
  const gmailConfig = config.gmail || {};
  const whatsappConfig = config.whatsapp || {};

  const providerOptions = PROVIDERS.map((provider) => {
    const selected = provider.id === activeProvider ? "selected" : "";
    return `<option value="${provider.id}" ${selected}>${provider.label}</option>`;
  }).join("");

  const searchProviderOptions = SEARCH_PROVIDERS.map((provider) => {
    const selected = provider.id === activeSearchProvider ? "selected" : "";
    return `<option value="${provider.id}" ${selected}>${provider.label}</option>`;
  }).join("");

  const modelValue = config.ai && config.ai.model ? escapeHtml(config.ai.model) : "";
  const baseUrlValue = providerConfig.baseUrl
    ? escapeHtml(providerConfig.baseUrl)
    : "";
  const deploymentValue = providerConfig.deployment
    ? escapeHtml(providerConfig.deployment)
    : "";
  const apiVersionValue = providerConfig.apiVersion
    ? escapeHtml(providerConfig.apiVersion)
    : "";
  const searchCxValue = searchConfig.cx ? escapeHtml(searchConfig.cx) : "";
  const gmailCredentialsValue = gmailConfig.credentialsPath
    ? escapeHtml(gmailConfig.credentialsPath)
    : "";
  const gmailTokenValue = gmailConfig.tokenPath
    ? escapeHtml(gmailConfig.tokenPath)
    : "";
  const gmailRedirectValue = gmailConfig.redirectUri
    ? escapeHtml(gmailConfig.redirectUri)
    : "";

  const providerHasKey = Boolean(providerConfig.apiKey);
  const searchHasKey = Boolean(searchConfig.apiKey);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PropAI-Claw Onboard</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f6f6f6; margin: 0; padding: 40px; }
    .card { max-width: 820px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
    h1 { margin-top: 0; }
    label { display: block; margin-top: 12px; font-weight: 600; }
    input, select { width: 100%; padding: 10px; margin-top: 6px; border: 1px solid #ccc; border-radius: 6px; }
    input[type="checkbox"] { width: auto; margin-right: 8px; }
    .row { display: flex; gap: 16px; }
    .row > div { flex: 1; }
    .hint { color: #666; font-size: 12px; margin-top: 6px; }
    button { margin-top: 20px; padding: 12px 16px; border: none; background: #1d4ed8; color: #fff; border-radius: 8px; cursor: pointer; }
    .section { margin-top: 18px; padding-top: 18px; border-top: 1px solid #eee; }
    .checkbox-row { display: flex; align-items: center; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>PropAI-Claw Onboarding</h1>
    <p>Select your AI provider and tools. You can update these later.</p>
    <form method="post" action="/onboard">
      <label for="provider">AI Provider</label>
      <select id="provider" name="provider" onchange="onProviderChange()">
        ${providerOptions}
      </select>

      <label for="model">Model</label>
      <input id="model" name="model" value="${modelValue}" placeholder="gpt-4o-mini, claude-sonnet, llama3.1, etc" />

      <div class="section">
        <div class="row">
          <div>
            <label for="apiKey">API Key (leave blank to keep existing)</label>
            <input id="apiKey" name="apiKey" type="password" placeholder="sk-..." />
            <div class="hint">${providerHasKey ? "Existing key is saved." : "No key saved yet."}</div>
          </div>
          <div>
            <label for="baseUrl">Base URL (optional)</label>
            <input id="baseUrl" name="baseUrl" value="${baseUrlValue}" placeholder="https://api.openai.com/v1" />
          </div>
        </div>

        <div id="azureFields" style="display:none;">
          <label for="deployment">Azure Deployment Name</label>
          <input id="deployment" name="deployment" value="${deploymentValue}" placeholder="my-deployment" />
          <label for="apiVersion">Azure API Version</label>
          <input id="apiVersion" name="apiVersion" value="${apiVersionValue}" placeholder="2024-10-21" />
        </div>

        <div class="hint" id="providerHint"></div>
      </div>

      <div class="section">
        <h3>Web Search</h3>
        <label for="searchProvider">Search Provider</label>
        <select id="searchProvider" name="searchProvider" onchange="onSearchProviderChange()">
          ${searchProviderOptions}
        </select>
        <label for="searchKey">Search API Key (leave blank to keep existing)</label>
        <input id="searchKey" name="searchKey" type="password" placeholder="search-api-key" />
        <div class="hint">${searchHasKey ? "Existing search key is saved." : "No search key saved yet."}</div>
        <div id="googleCseFields" style="display:none;">
          <label for="searchCx">Google CSE CX</label>
          <input id="searchCx" name="searchCx" value="${searchCxValue}" placeholder="custom-search-engine-id" />
        </div>
      </div>

      <div class="section">
        <h3>Gmail</h3>
        <input type="hidden" name="gmailEnabled" value="false" />
        <div class="checkbox-row">
          <input id="gmailEnabled" name="gmailEnabled" type="checkbox" value="true" ${gmailConfig.enabled ? "checked" : ""} />
          <label for="gmailEnabled">Enable Gmail integration</label>
        </div>
        <label for="gmailCredentialsPath">Credentials Path</label>
        <input id="gmailCredentialsPath" name="gmailCredentialsPath" value="${gmailCredentialsValue}" placeholder="auth/gmail_credentials.json" />
        <label for="gmailTokenPath">Token Path</label>
        <input id="gmailTokenPath" name="gmailTokenPath" value="${gmailTokenValue}" placeholder="auth/gmail_token.json" />
        <label for="gmailRedirectUri">Redirect URI</label>
        <input id="gmailRedirectUri" name="gmailRedirectUri" value="${gmailRedirectValue}" placeholder="http://localhost:3000/gmail/oauth2callback" />
      </div>

      <div class="section">
        <h3>WhatsApp</h3>
        <input type="hidden" name="whatsappEnabled" value="false" />
        <div class="checkbox-row">
          <input id="whatsappEnabled" name="whatsappEnabled" type="checkbox" value="true" ${whatsappConfig.enabled ? "checked" : ""} />
          <label for="whatsappEnabled">Enable WhatsApp integration</label>
        </div>
        <div class="hint">If enabled, start the server and scan the QR code in the terminal.</div>
      </div>

      <button type="submit">Save Configuration</button>
    </form>
  </div>

  <script>
    const providerDefaults = ${JSON.stringify(DEFAULT_CONFIG.providers)};

    function onProviderChange() {
      const provider = document.getElementById("provider").value;
      const hint = document.getElementById("providerHint");
      const baseUrl = document.getElementById("baseUrl");
      const model = document.getElementById("model");
      const azureFields = document.getElementById("azureFields");

      const defaults = providerDefaults[provider] || {};
      if (defaults.baseUrl) baseUrl.placeholder = defaults.baseUrl;
      if (defaults.model) model.placeholder = defaults.model;

      if (provider === "ollama") {
        hint.textContent = "Ollama runs locally. Ensure Ollama is running on http://localhost:11434.";
      } else if (provider === "lmstudio") {
        hint.textContent = "LM Studio runs locally. Ensure the local server is running on http://localhost:1234.";
      } else if (provider === "azure_openai") {
        hint.textContent = "Azure OpenAI requires base URL, deployment name, and api-version.";
      } else {
        hint.textContent = "";
      }

      azureFields.style.display = provider === "azure_openai" ? "block" : "none";
    }

    function onSearchProviderChange() {
      const provider = document.getElementById("searchProvider").value;
      const googleFields = document.getElementById("googleCseFields");
      googleFields.style.display = provider === "google_cse" ? "block" : "none";
    }

    onProviderChange();
    onSearchProviderChange();
  </script>
</body>
</html>`;
}

function normalizeValue(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeBoolean(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).toLowerCase().trim();
  if (["true", "on", "1", "yes"].includes(normalized)) return true;
  if (["false", "off", "0", "no"].includes(normalized)) return false;
  return undefined;
}

function handleOnboardPost(formData) {
  const config = loadConfig();
  const provider = normalizeValue(formData.provider) || config.ai.provider;
  const model = normalizeValue(formData.model);
  const apiKey = normalizeValue(formData.apiKey);
  const baseUrl = normalizeValue(formData.baseUrl);
  const deployment = normalizeValue(formData.deployment);
  const apiVersion = normalizeValue(formData.apiVersion);
  const searchProvider = normalizeValue(formData.searchProvider);
  const searchKey = normalizeValue(formData.searchKey);
  const searchCx = normalizeValue(formData.searchCx);
  const gmailEnabled = normalizeBoolean(formData.gmailEnabled);
  const gmailCredentialsPath = normalizeValue(formData.gmailCredentialsPath);
  const gmailTokenPath = normalizeValue(formData.gmailTokenPath);
  const gmailRedirectUri = normalizeValue(formData.gmailRedirectUri);
  const whatsappEnabled = normalizeBoolean(formData.whatsappEnabled);

  const patch = {
    ai: {
      provider
    },
    providers: {
      [provider]: {}
    }
  };

  if (model) patch.ai.model = model;
  if (model) patch.providers[provider].model = model;
  if (apiKey) patch.providers[provider].apiKey = apiKey;
  if (baseUrl) patch.providers[provider].baseUrl = baseUrl;
  if (deployment) patch.providers[provider].deployment = deployment;
  if (apiVersion) patch.providers[provider].apiVersion = apiVersion;

  if (searchProvider || searchKey || searchCx) {
    patch.search = {};
    if (searchProvider) patch.search.provider = searchProvider;
    if (searchKey) patch.search.apiKey = searchKey;
    if (searchCx) patch.search.cx = searchCx;
  }

  if (gmailEnabled !== undefined || gmailCredentialsPath || gmailTokenPath || gmailRedirectUri) {
    patch.gmail = {};
    if (gmailEnabled !== undefined) patch.gmail.enabled = gmailEnabled;
    if (gmailCredentialsPath) patch.gmail.credentialsPath = gmailCredentialsPath;
    if (gmailTokenPath) patch.gmail.tokenPath = gmailTokenPath;
    if (gmailRedirectUri) patch.gmail.redirectUri = gmailRedirectUri;
  }

  if (whatsappEnabled !== undefined) {
    patch.whatsapp = { enabled: whatsappEnabled };
  }

  return saveConfig(patch);
}

module.exports = {
  renderOnboardPage,
  handleOnboardPost
};
