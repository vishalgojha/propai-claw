# PropAI-Claw

Local real estate AI assistant with WhatsApp, Gmail, web search, and multi-provider AI (hosted plus local).

## Quickstart

1. npm install
2. propai onboard
3. propai start --port 1310
4. Open http://localhost:1310/dashboard for leads

## Terminal Onboarding

Run:

```
propai onboard
```

This walks you through provider, search, Gmail, and WhatsApp configuration from the terminal.

## CLI Commands

Run:

```
npm run propai
```

Commands include:
- System: `propai start`, `propai stop`, `propai restart`, `propai status`, `propai logs`, `propai health`
- Agent: `propai agent list`, `propai agent config`, `propai agent test "<text>"`, `propai agent reset --lead <id>|--all`
- Leads: `propai lead list`, `propai lead show <id>`, `propai lead update <id> --intent buy`, `propai lead score <id>`
- Gmail: `propai gmail test`, `propai gmail read`, `propai gmail send --to x --subject y --body z`
- Search: `propai search "Andheri circle rate"`
- Config: `propai config show`, `propai config set openai_key=xxxx`
- Shell: `propai shell`
- Workflows: `propai workflow list`, `propai workflow run lead_followup --lead 3`, `propai workflow show 12`
- Memory: `propai memory list lead`, `propai memory get lead 3`, `propai memory set market Mumbai "Circle rate notes"`
- Onboarding: `propai onboard`

To install the CLI globally:

```
npm link
propai --help
```

## Command Center UI (React)

The UI runs separately from the backend.

1. Start backend on port 1310:

```
propai start --port 1310
```

2. Start the UI:

```
cd web
npm install
npm run dev
```

3. Open the UI:

```
http://localhost:3001
```

## Providers

Supported providers:
- OpenAI
- Anthropic
- Gemini
- Mistral
- Groq
- Together
- OpenRouter
- Cohere
- Azure OpenAI
- Ollama (local)
- LM Studio (local)

## WhatsApp

1. Set `whatsapp.enabled` to true in `config.local.json`
2. Start the server and scan the QR code in the terminal

## Gmail

1. Create OAuth credentials in Google Cloud Console
2. Save the JSON as `auth/gmail_credentials.json`
3. Start the server and visit `http://localhost:3000/gmail/oauth` once

## Web Search

Set `search.provider` and `search.apiKey` in `config.local.json`. Default provider is Serper.

## Storage

Uses SQLite at `data/propai.db` by default. Change via `storage.dbPath` in `config.local.json`.

## Dashboard

Open `http://localhost:3000/dashboard` for a simple lead list and conversation history.

## Scheduler & Workflows

The scheduler can run workflows on a cron schedule. Configure in `config.local.json`:

```
{
  "scheduler": {
    "enabled": true,
    "timezone": "Asia/Kolkata",
    "jobs": [
      {
        "name": "lead_followup_scan",
        "cron": "0 */6 * * *",
        "workflow": "lead_followup_scan",
        "enabled": true
      }
    ]
  }
}
```

Workflows live in `src/workflows.js` and are executed with audit logs in SQLite.

Retry policy per step:

```
{
  "name": "compose_followup",
  "tool": "ai_generate",
  "retry": { "retries": 2, "delayMs": 800, "backoffFactor": 2 }
}
```

## Memory API

```
GET /api/memory?scope=lead&key=3
GET /api/memory?scope=market&key=Mumbai
GET /api/memory?scope=global&limit=5
```

## Tool Registry

Tools are declared in `src/toolRegistry.js` with metadata and can be disabled via:

```
{
  "tools": { "disabled": ["gmail_send"] }
}
```

## Notes

- Secrets are stored in `config.local.json` and `auth/`. Both are ignored by git.
- If you switch AI providers, reopen `/onboard` and update the selection.
