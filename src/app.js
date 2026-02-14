const crypto = require("crypto");
const express = require("express");
const { loadConfig, saveConfig } = require("./configStore");
const { renderOnboardPage, handleOnboardPost } = require("./onboard");
const { handleEvent } = require("./agentRouter");
const { normalizeEvent } = require("./gateway");
const { startWhatsApp } = require("./whatsapp");
const { getGmailAuthUrl, handleGmailOAuthCallback } = require("./gmail");
const { listLeads, getLeadById, listMessages } = require("./leadStore");
const { renderDashboard, renderLeadDetail } = require("./dashboard");
const { startScheduler } = require("./scheduler");
const { runWorkflow } = require("./workflowEngine");
const {
  listWorkflowRuns,
  getWorkflowRun,
  listWorkflowSteps
} = require("./workflowStore");
const { listMemory, getMemory, upsertMemory } = require("./memoryStore");
const { executeAction, parseCommand, ACTIONS } = require("./agentControl");
const { addControlLog, listControlLogs } = require("./controlLogStore");
const { resolveRole, canExecute, maskToken } = require("./auth");
const { getSystemStatus } = require("./systemStatus");
const { registerWebhookRoutes } = require("./webhookRoutes");

let whatsappClient = null;
const whatsappRuntime = {
  connected: false,
  error: null
};

function getTokenStore(config) {
  const tokens = (config.auth && config.auth.tokens) || {};
  return {
    admin: Array.isArray(tokens.admin) ? tokens.admin : [],
    operator: Array.isArray(tokens.operator) ? tokens.operator : [],
    viewer: Array.isArray(tokens.viewer) ? tokens.viewer : []
  };
}

function listTokensMasked(tokens) {
  return Object.fromEntries(
    Object.entries(tokens).map(([role, list]) => [
      role,
      list.map((token, index) => ({
        index,
        masked: maskToken(token)
      }))
    ])
  );
}

function generateToken(existing = new Set()) {
  let token = "";
  do {
    token = crypto.randomBytes(16).toString("hex");
  } while (existing.has(token));
  return token;
}

function ensureWhatsAppClient() {
  if (whatsappClient) {
    return { status: "running" };
  }
  whatsappClient = startWhatsApp({
    onReady: () => {
      whatsappRuntime.connected = true;
      whatsappRuntime.error = null;
    },
    onAuthFailure: (message) => {
      whatsappRuntime.connected = false;
      whatsappRuntime.error = message || "Authentication failed.";
    },
    onDisconnected: (reason) => {
      whatsappRuntime.connected = false;
      whatsappRuntime.error = reason || "Client disconnected.";
      whatsappClient = null;
    },
    onError: (error) => {
      whatsappRuntime.connected = false;
      whatsappRuntime.error =
        (error && error.message) || "WhatsApp failed to initialize.";
      whatsappClient = null;
    },
    onMessage: async (message) => {
      const chat = await message.getChat();
      const isGroup = chat && chat.isGroup;
      const latestConfig = loadConfig();
      const event = normalizeEvent({
        source: isGroup ? "whatsapp_group" : "whatsapp",
        content: message.body,
        context: {
          whatsapp: {
            from: message.from,
            author: message.author || null,
            isGroup: Boolean(isGroup),
            groupName: isGroup ? chat.name : null
          }
        }
      });
      const result = await handleEvent(event, latestConfig);
      if (result && result.reply && result.reply.trim()) {
        await message.reply(result.reply);
      }
    }
  });
  whatsappRuntime.connected = false;
  whatsappRuntime.error = null;
  return { status: "started" };
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
registerWebhookRoutes(app);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  const config = loadConfig();
  const host = req.headers.host || "localhost";
  if (!config.ai || !config.ai.provider) {
    return res.send(
      `PropAI-Claw is running at http://${host}. Run "propai onboard" to configure.`
    );
  }
  res.send(
    `PropAI-Claw is running at http://${host}. Run "propai onboard" to update settings.`
  );
});

app.get("/onboard", (req, res) => {
  const config = loadConfig();
  if (!config.onboarding || !config.onboarding.webEnabled) {
    return res
      .status(404)
      .send("Web onboarding disabled. Use `propai onboard`.");
  }
  res.send(renderOnboardPage(config));
});

app.post("/onboard", (req, res) => {
  const config = loadConfig();
  if (!config.onboarding || !config.onboarding.webEnabled) {
    return res
      .status(404)
      .send("Web onboarding disabled. Use `propai onboard`.");
  }
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
  const event = normalizeEvent({
    source: payload.source || "web",
    content: payload.content || "",
    context: payload.context || {}
  });
  const result = await handleEvent(event, config);
  res.json(result);
});

app.get("/dashboard", async (req, res) => {
  const leads = await listLeads(200);
  res.send(renderDashboard(leads));
});

app.get("/dashboard/leads/:id", async (req, res) => {
  const lead = await getLeadById(Number(req.params.id));
  if (!lead) {
    return res.status(404).send("Lead not found.");
  }
  const messages = await listMessages(lead.id, 50);
  res.send(renderLeadDetail(lead, messages));
});

app.get("/api/leads", async (req, res) => {
  const leads = await listLeads(200);
  res.json(leads);
});

app.get("/api/leads/:id", async (req, res) => {
  const lead = await getLeadById(Number(req.params.id));
  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }
  res.json(lead);
});

app.get("/api/leads/:id/messages", async (req, res) => {
  const messages = await listMessages(Number(req.params.id), 100);
  res.json(messages);
});

app.get("/api/market", (req, res) => {
  const config = loadConfig();
  res.json(config.market || {});
});

app.get("/api/system/status", (req, res) => {
  const config = loadConfig();
  const status = getSystemStatus(config, {
    whatsappConnected: whatsappRuntime.connected,
    whatsappError: whatsappRuntime.error
  });
  res.json(status);
});

app.get("/api/memory", async (req, res) => {
  const scope = req.query.scope;
  if (!scope) {
    return res.status(400).json({ error: "Missing scope" });
  }
  if (req.query.key) {
    const entry = await getMemory(scope, String(req.query.key));
    if (!entry) {
      return res.status(404).json({ error: "Memory not found" });
    }
    return res.json(entry);
  }
  const limit = Number(req.query.limit) || 20;
  const entries = await listMemory(scope, limit);
  return res.json(entries);
});

app.post("/api/memory", async (req, res) => {
  const body = req.body || {};
  if (!body.scope || !body.key || !body.content) {
    return res
      .status(400)
      .json({ error: "Missing scope, key, or content" });
  }
  await upsertMemory({
    scope: body.scope,
    key: String(body.key),
    content: body.content,
    tags: body.tags || null
  });
  res.json({ status: "ok" });
});

app.post("/api/agent/command", async (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const message = (req.body && req.body.message) || "";
  if (!message.trim()) {
    return res.status(400).json({ error: "Missing message" });
  }

  const parsed = parseCommand(message);
  const actionSpec = ACTIONS[parsed.action];
  const requiredRole =
    parsed.action === "unknown" ? "viewer" : actionSpec ? actionSpec.role : "admin";
  if (!canExecute(role, requiredRole)) {
    await addControlLog({
      command: message,
      action: parsed.action,
      status: "forbidden",
      result: { error: "Insufficient role" },
      role
    });
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const result = await executeAction(message, role);
    await addControlLog({
      command: message,
      action: parsed.action,
      status: result.status || "success",
      result,
      role
    });
    res.json({
      status: result.status,
      message: result.message,
      result: result.result || null,
      role
    });
  } catch (error) {
    await addControlLog({
      command: message,
      action: parsed.action,
      status: "error",
      result: { error: error.message },
      role
    });
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/me", (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ role });
});

app.get("/api/auth/tokens", (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role || !canExecute(role, "admin")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const tokens = getTokenStore(config);
  res.json({ tokens: listTokensMasked(tokens) });
});

app.post("/api/auth/tokens", (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role || !canExecute(role, "admin")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const body = req.body || {};
  const roleName = String(body.role || "").toLowerCase();
  if (!["admin", "operator", "viewer"].includes(roleName)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const tokens = getTokenStore(config);
  const existing = new Set(
    [...tokens.admin, ...tokens.operator, ...tokens.viewer].filter(Boolean)
  );
  const newToken = generateToken(existing);
  tokens[roleName].push(newToken);
  saveConfig({ auth: { tokens } });
  res.json({
    role: roleName,
    token: newToken,
    masked: maskToken(newToken),
    index: tokens[roleName].length - 1
  });
});

app.delete("/api/auth/tokens", (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role || !canExecute(role, "admin")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const body = req.body || {};
  const roleName = String(body.role || "").toLowerCase();
  if (!["admin", "operator", "viewer"].includes(roleName)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  const index = Number(body.index);
  if (!Number.isInteger(index)) {
    return res.status(400).json({ error: "Invalid token index" });
  }
  const tokens = getTokenStore(config);
  if (index < 0 || index >= tokens[roleName].length) {
    return res.status(404).json({ error: "Token not found" });
  }
  const [removed] = tokens[roleName].splice(index, 1);
  saveConfig({ auth: { tokens } });
  res.json({ removed: maskToken(removed), role: roleName, index });
});

app.get("/api/control/logs", async (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role || !canExecute(role, "admin")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const logs = await listControlLogs(50);
  res.json(logs);
});

app.get("/api/whatsapp/status", (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({
    enabled: Boolean(config.whatsapp && config.whatsapp.enabled),
    running: Boolean(whatsappClient),
    connected: whatsappRuntime.connected,
    error: whatsappRuntime.error
  });
});

app.post("/api/whatsapp/start", (req, res) => {
  const config = loadConfig();
  const token = req.headers["x-propai-token"];
  const role = resolveRole(token, config);
  if (!role || !canExecute(role, "operator")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!config.whatsapp || !config.whatsapp.enabled) {
    return res
      .status(400)
      .json({ error: "WhatsApp is disabled in config." });
  }
  const result = ensureWhatsAppClient();
  res.json(result);
});

app.get("/api/workflows", async (req, res) => {
  const runs = await listWorkflowRuns(50);
  res.json(runs);
});

app.get("/api/workflows/:id", async (req, res) => {
  const run = await getWorkflowRun(Number(req.params.id));
  if (!run) {
    return res.status(404).json({ error: "Workflow not found" });
  }
  const steps = await listWorkflowSteps(run.id);
  res.json({ run, steps });
});

app.post("/api/workflows/run", async (req, res) => {
  const config = loadConfig();
  const body = req.body || {};
  if (!body.name) {
    return res.status(400).json({ error: "Missing workflow name" });
  }
  try {
    const result = await runWorkflow(body.name, body.input || {}, config, {
      source: "api",
      leadId: body.input && body.input.leadId
    });
    res.json({ status: "ok", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/leads/:id/followup", async (req, res) => {
  const config = loadConfig();
  const leadId = Number(req.params.id);
  try {
    const result = await runWorkflow(
      "lead_followup",
      { leadId },
      config,
      { source: "api", leadId }
    );
    res.json({ status: "ok", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const config = loadConfig();
const port = process.env.PORT || config.app.port || 3000;

app.listen(port, () => {
  console.log(`PropAI-Claw listening on http://localhost:${port}`);
  console.log("Run `npm run onboard` for terminal setup.");
  startScheduler(config);
});

if (config.whatsapp && config.whatsapp.enabled) {
  ensureWhatsAppClient();
}
