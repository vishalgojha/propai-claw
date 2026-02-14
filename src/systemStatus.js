const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio"]);

function isLocalProvider(provider) {
  return LOCAL_PROVIDERS.has(String(provider || "").toLowerCase());
}

function hasValue(value) {
  return Boolean(String(value || "").trim());
}

function evaluateProviderConfig(config) {
  const provider = String(
    (config.ai && config.ai.provider) || "openai"
  ).toLowerCase();
  const providerConfig = (config.providers && config.providers[provider]) || {};
  const model =
    (config.ai && config.ai.model) || providerConfig.model || "";

  const issues = [];

  if (!hasValue(model)) {
    issues.push("AI model is not configured.");
  }

  if (provider === "azure_openai") {
    if (!hasValue(providerConfig.baseUrl)) {
      issues.push("Azure base URL is missing.");
    }
    if (!hasValue(providerConfig.apiKey)) {
      issues.push("Azure API key is missing.");
    }
    if (!hasValue(providerConfig.deployment)) {
      issues.push("Azure deployment is missing.");
    }
    if (!hasValue(providerConfig.apiVersion)) {
      issues.push("Azure API version is missing.");
    }
  } else if (isLocalProvider(provider)) {
    if (!hasValue(providerConfig.baseUrl)) {
      issues.push("Local provider base URL is missing.");
    }
  } else {
    if (!hasValue(providerConfig.baseUrl)) {
      issues.push("Provider base URL is missing.");
    }
    if (!hasValue(providerConfig.apiKey)) {
      issues.push("Provider API key is missing.");
    }
  }

  return {
    provider,
    aiProviderConfigured: issues.length === 0,
    issues
  };
}

function getSystemStatus(config, runtime = {}) {
  const providerStatus = evaluateProviderConfig(config);
  const whatsappEnabled = Boolean(config.whatsapp && config.whatsapp.enabled);
  const whatsappConnected = Boolean(runtime.whatsappConnected);
  const whatsappError = runtime.whatsappError || null;

  const criticalIssues = [...providerStatus.issues];
  if (whatsappEnabled && whatsappError) {
    criticalIssues.push(`WhatsApp error: ${whatsappError}`);
  }

  return {
    configured: providerStatus.aiProviderConfigured,
    systemReady: providerStatus.aiProviderConfigured,
    aiProviderConfigured: providerStatus.aiProviderConfigured,
    provider: providerStatus.provider,
    whatsappEnabled,
    whatsappConnected,
    whatsappError,
    backendStarted: true,
    criticalIssues
  };
}

module.exports = {
  getSystemStatus
};
