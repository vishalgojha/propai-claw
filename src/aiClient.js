const { DEFAULT_CONFIG } = require("../config");
const { applySoul } = require("./soul");

function buildMessages(systemPrompt, userPrompt) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });
  return messages;
}

function resolveProviderConfig(config, provider) {
  const defaults = DEFAULT_CONFIG.providers[provider] || {};
  const current = (config.providers && config.providers[provider]) || {};
  return { ...defaults, ...current };
}

async function callOpenAICompatible({
  baseUrl,
  apiKey,
  model,
  temperature,
  systemPrompt,
  prompt
}) {
  if (!baseUrl) throw new Error("Missing baseUrl for OpenAI-compatible provider.");
  if (!model) throw new Error("Missing model for OpenAI-compatible provider.");

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const payload = {
    model,
    messages: buildMessages(systemPrompt, prompt),
    temperature
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) || "Provider error";
    throw new Error(message);
  }
  return (data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "")
    .trim();
}

async function callAzureOpenAI({
  baseUrl,
  apiKey,
  deployment,
  apiVersion,
  model,
  temperature,
  systemPrompt,
  prompt
}) {
  if (!baseUrl || !deployment || !apiVersion) {
    throw new Error("Azure OpenAI requires baseUrl, deployment, and apiVersion.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const payload = {
    model,
    messages: buildMessages(systemPrompt, prompt),
    temperature
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) || "Azure OpenAI error";
    throw new Error(message);
  }
  return (data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "")
    .trim();
}

async function callAnthropic({
  baseUrl,
  apiKey,
  apiVersion,
  model,
  maxTokens,
  systemPrompt,
  prompt
}) {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/messages`;
  const payload = {
    model,
    max_tokens: maxTokens || 1024,
    messages: [{ role: "user", content: prompt }]
  };
  if (systemPrompt) payload.system = systemPrompt;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": apiVersion || "2023-06-01"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) || "Anthropic error";
    throw new Error(message);
  }
  const content = data.content && data.content[0] && data.content[0].text;
  return (content || "").trim();
}

async function callGemini({ baseUrl, apiKey, model, prompt, systemPrompt }) {
  const url = `${baseUrl.replace(/\/$/, "")}/v1beta/models/${model}:generateContent`;
  const text = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const payload = {
    contents: [{ parts: [{ text }] }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) || "Gemini error";
    throw new Error(message);
  }
  const content =
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;
  return (content || "").trim();
}

async function callCohere({ baseUrl, apiKey, model, prompt, temperature }) {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/chat`;
  const payload = {
    model,
    message: prompt,
    temperature
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    const message = (data && data.message) || "Cohere error";
    throw new Error(message);
  }
  return (data.text || "").trim();
}

async function generateResponse(prompt, config, options = {}) {
  const provider = (config.ai.provider || "openai").toLowerCase();
  const providerConfig = resolveProviderConfig(config, provider);
  const model = config.ai.model || providerConfig.model;
  const temperature = config.ai.temperature;
  const systemPrompt = applySoul(
    options.systemPrompt || config.ai.systemPrompt,
    config
  );

  switch (provider) {
    case "openai":
    case "openrouter":
    case "groq":
    case "together":
    case "mistral":
    case "ollama":
    case "lmstudio":
      return callOpenAICompatible({
        baseUrl: providerConfig.baseUrl,
        apiKey: providerConfig.apiKey || "local",
        model,
        temperature,
        systemPrompt,
        prompt
      });
    case "azure_openai":
      return callAzureOpenAI({
        baseUrl: providerConfig.baseUrl,
        apiKey: providerConfig.apiKey,
        deployment: providerConfig.deployment,
        apiVersion: providerConfig.apiVersion,
        model: model || providerConfig.deployment,
        temperature,
        systemPrompt,
        prompt
      });
    case "anthropic":
      return callAnthropic({
        baseUrl: providerConfig.baseUrl,
        apiKey: providerConfig.apiKey,
        apiVersion: providerConfig.apiVersion,
        model,
        maxTokens: 1024,
        systemPrompt,
        prompt
      });
    case "gemini":
      return callGemini({
        baseUrl: providerConfig.baseUrl,
        apiKey: providerConfig.apiKey,
        model,
        systemPrompt,
        prompt
      });
    case "cohere":
      return callCohere({
        baseUrl: providerConfig.baseUrl,
        apiKey: providerConfig.apiKey,
        model,
        prompt,
        temperature
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

module.exports = {
  generateResponse
};
