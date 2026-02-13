# PropAI-Claw

Local real estate AI assistant with WhatsApp, Gmail, web search, and multi-provider AI (hosted plus local).

## Quickstart

1. npm install
2. node src/app.js
3. Open http://localhost:3000/onboard and choose your AI provider

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

## Notes

- Secrets are stored in `config.local.json` and `auth/`. Both are ignored by git.
- If you switch AI providers, reopen `/onboard` and update the selection.
