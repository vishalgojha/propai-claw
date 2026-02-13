const path = require("path");

const CONFIG_PATH =
  process.env.PROPAI_CONFIG_PATH || path.join(__dirname, "config.local.json");

const { DEFAULT_MODEL_CATALOG } = require("./src/modelCatalog");

const DEFAULT_CONFIG = {
  app: {
    port: 3000
  },
  storage: {
    dbPath: "data/propai.db"
  },
  market: {
    city: "Mumbai",
    notes: ""
  },
  ai: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.4,
    systemPrompt:
      "You are PropAI-Claw, a helpful real estate assistant. Be concise and actionable."
  },
  providers: {
    openai: {
      baseUrl: "https://api.openai.com/v1",
      apiKey: ""
    },
    openrouter: {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: ""
    },
    groq: {
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: ""
    },
    together: {
      baseUrl: "https://api.together.xyz/v1",
      apiKey: ""
    },
    mistral: {
      baseUrl: "https://api.mistral.ai/v1",
      apiKey: ""
    },
    anthropic: {
      baseUrl: "https://api.anthropic.com",
      apiKey: "",
      apiVersion: "2023-06-01"
    },
    gemini: {
      baseUrl: "https://generativelanguage.googleapis.com",
      apiKey: ""
    },
    cohere: {
      baseUrl: "https://api.cohere.com",
      apiKey: ""
    },
    azure_openai: {
      baseUrl: "",
      apiKey: "",
      apiVersion: "2024-10-21",
      deployment: ""
    },
    ollama: {
      baseUrl: "http://localhost:11434/v1",
      model: "llama3.1"
    },
    lmstudio: {
      baseUrl: "http://localhost:1234/v1",
      model: "local-model"
    }
  },
  search: {
    provider: "serper",
    apiKey: "",
    cx: ""
  },
  gmail: {
    enabled: false,
    credentialsPath: "auth/gmail_credentials.json",
    tokenPath: "auth/gmail_token.json",
    redirectUri: "http://localhost:3000/gmail/oauth2callback",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send"
    ]
  },
  whatsapp: {
    enabled: false
  },
  onboarding: {
    webEnabled: false
  },
  auth: {
    tokens: {
      admin: [],
      operator: [],
      viewer: []
    }
  },
  automations: {
    autoDraft: true
  },
  leadScoring: {
    hot: 6,
    warm: 3
  },
  tools: {
    disabled: [],
    permissions: {}
  },
  scheduler: {
    enabled: false,
    timezone: "Asia/Kolkata",
    jobs: [
      {
        name: "lead_followup_scan",
        cron: "0 */6 * * *",
        workflow: "lead_followup_scan",
        enabled: false
      }
    ]
  },
  agents: {
    default: {
      name: "Operator",
      systemPrompt:
        "You are PropAI-Claw, a helpful real estate assistant. Be concise and actionable."
    },
    researcher: {
      name: "Researcher",
      systemPrompt:
        "You are a real estate market researcher. Provide concise, cited insights and highlight risk."
    },
    analyzer: {
      name: "Analyzer",
      systemPrompt:
        "You analyze property brochures and deals. Provide pros, risks, pricing checks, and negotiation angles."
    },
    negotiator: {
      name: "Negotiator",
      systemPrompt:
        "You draft negotiation responses and counter-offers. Be firm, professional, and data-driven."
    }
  },
  memory: {
    enabled: true
  },
  modelCatalog: DEFAULT_MODEL_CATALOG
};

module.exports = {
  CONFIG_PATH,
  DEFAULT_CONFIG
};
