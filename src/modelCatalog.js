const DEFAULT_MODEL_CATALOG = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: ["claude-3.5-sonnet", "claude-3.5-haiku", "claude-3-opus"],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  mistral: ["mistral-small", "mistral-medium", "mistral-large"],
  groq: ["llama-3.1-70b", "llama-3.1-8b", "mixtral-8x7b"],
  together: ["meta-llama/Llama-3.1-70B-Instruct", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
  openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-70b-instruct"],
  cohere: ["command-r", "command-r-plus"],
  azure_openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  ollama: ["llama3.1", "qwen2.5", "mistral", "mixtral"],
  lmstudio: ["local-model"]
};

module.exports = {
  DEFAULT_MODEL_CATALOG
};
