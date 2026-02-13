const express = require("express");
const { loadConfig } = require("./configStore");
const { renderOnboardPage, handleOnboardPost } = require("./onboard");
const { handleMessage } = require("./agentRouter");
const { startWhatsApp } = require("./whatsapp");
const { getGmailAuthUrl, handleGmailOAuthCallback } = require("./gmail");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  const config = loadConfig();
  if (!config.ai || !config.ai.provider) {
    return res.redirect("/onboard");
  }
  res.send("PropAI-Claw is running. Visit /onboard to update settings.");
});

app.get("/onboard", (req, res) => {
  const config = loadConfig();
  res.send(renderOnboardPage(config));
});

app.post("/onboard", (req, res) => {
  handleOnboardPost(req.body || {});
  res.redirect("/");
});

app.get("/gmail/oauth", (req, res) => {
  const config = loadConfig();
  const url = getGmailAuthUrl(config);
  res.redirect(url);
});

app.get("/gmail/oauth2callback", async (req, res) => {
  const config = loadConfig();
  if (!req.query.code) {
    return res.status(400).send("Missing code.");
  }
  await handleGmailOAuthCallback(req.query.code, config);
  res.send("Gmail connected. You can close this window.");
});

app.post("/chat", async (req, res) => {
  const config = loadConfig();
  const payload = req.body || {};
  const result = await handleMessage(
    {
      source: payload.source || "web",
      content: payload.content || "",
      context: payload.context || {}
    },
    config
  );
  res.json(result);
});

const config = loadConfig();
const port = process.env.PORT || config.app.port || 3000;

app.listen(port, () => {
  console.log(`PropAI-Claw listening on http://localhost:${port}`);
});

if (config.whatsapp && config.whatsapp.enabled) {
  startWhatsApp({
    onMessage: async (message) => {
      const latestConfig = loadConfig();
      const result = await handleMessage(
        {
          source: "whatsapp",
          content: message.body,
          context: {
            whatsapp: { from: message.from }
          }
        },
        latestConfig
      );
      await message.reply(result.reply);
    }
  });
}
