const { loadConfig, saveConfig } = require("./configStore");
const { updateLeadFields, getLeadById, findLeadsByName } = require("./leadStore");
const { runWorkflow } = require("./workflowEngine");
const { checkHealth } = require("../cli/lib/system");
const { invokeTool } = require("./toolRegistry");

const ACTIONS = {
  set_provider: { role: "admin" },
  set_model: { role: "admin" },
  set_followup_hours: { role: "operator" },
  toggle_scheduler: { role: "operator" },
  update_lead_status: { role: "operator" },
  run_health_check: { role: "viewer" },
  test_gmail: { role: "operator" },
  run_workflow: { role: "operator" },
  toggle_auto_draft: { role: "admin" }
};

function normalizeProvider(value) {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  const map = {
    openai: "openai",
    openrouter: "openrouter",
    groq: "groq",
    together: "together",
    mistral: "mistral",
    anthropic: "anthropic",
    gemini: "gemini",
    cohere: "cohere",
    azure: "azure_openai",
    azureopenai: "azure_openai",
    ollama: "ollama",
    lmstudio: "lmstudio"
  };
  return map[normalized] || null;
}

function parseCommand(message) {
  const text = message.trim();
  const lower = text.toLowerCase();

  const providerMatch =
    lower.match(/switch to ([a-z\s]+)/) || lower.match(/set provider to ([a-z\s]+)/);
  if (providerMatch) {
    return { action: "set_provider", provider: providerMatch[1] };
  }

  const modelMatch =
    lower.match(/set model to ([^]+)$/) || lower.match(/switch model to ([^]+)$/);
  if (modelMatch) {
    return { action: "set_model", model: modelMatch[1].trim() };
  }

  const followupMatch =
    lower.match(/follow-?up default to (\d+)\s*(day|days|hour|hours)/);
  if (followupMatch) {
    const amount = Number(followupMatch[1]);
    const unit = followupMatch[2];
    const hours = unit.startsWith("day") ? amount * 24 : amount;
    return { action: "set_followup_hours", hours };
  }

  if (lower.includes("enable scheduler") || lower.includes("turn on automation")) {
    return { action: "toggle_scheduler", enabled: true };
  }
  if (lower.includes("disable scheduler") || lower.includes("turn off automation")) {
    return { action: "toggle_scheduler", enabled: false };
  }

  const leadIdMatch = lower.match(/mark lead (\d+) as (hot|warm|cold)/);
  if (leadIdMatch) {
    return {
      action: "update_lead_status",
      leadId: Number(leadIdMatch[1]),
      status: leadIdMatch[2]
    };
  }

  const leadNameMatch = lower.match(/mark ([a-z\s]+) as (hot|warm|cold)/);
  if (leadNameMatch) {
    return {
      action: "update_lead_status",
      leadName: leadNameMatch[1].trim(),
      status: leadNameMatch[2]
    };
  }

  if (lower.includes("health check") || lower.includes("system status")) {
    return { action: "run_health_check" };
  }

  if (lower.includes("test gmail")) {
    return { action: "test_gmail" };
  }

  const workflowMatch = lower.match(/run workflow ([a-z_]+)/);
  if (workflowMatch) {
    return { action: "run_workflow", workflow: workflowMatch[1] };
  }

  if (lower.includes("turn off auto-draft") || lower.includes("disable auto draft")) {
    return { action: "toggle_auto_draft", enabled: false };
  }
  if (lower.includes("turn on auto-draft") || lower.includes("enable auto draft")) {
    return { action: "toggle_auto_draft", enabled: true };
  }

  return { action: "unknown" };
}

async function executeAction(command, role) {
  const config = loadConfig();
  const parsed = parseCommand(command);
  if (parsed.action === "unknown") {
    return {
      status: "unknown",
      message: "I couldn't map that command. Try: switch provider, set model, mark lead, run workflow."
    };
  }

  const actionSpec = ACTIONS[parsed.action];
  if (!actionSpec) {
    return { status: "error", message: "Action not allowed." };
  }

  if (parsed.action === "set_provider") {
    const provider = normalizeProvider(parsed.provider);
    if (!provider || !config.providers[provider]) {
      return { status: "error", message: "Unknown provider." };
    }
    saveConfig({ ai: { provider } });
    return { status: "success", message: `Provider set to ${provider}.` };
  }

  if (parsed.action === "set_model") {
    const model = parsed.model;
    if (!model) {
      return { status: "error", message: "Model not specified." };
    }
    saveConfig({ ai: { model } });
    return { status: "success", message: `Model set to ${model}.` };
  }

  if (parsed.action === "set_followup_hours") {
    const jobs = (config.scheduler && config.scheduler.jobs) || [];
    const existing = jobs.find((job) => job.workflow === "lead_followup_scan");
    if (existing) {
      existing.followupHours = parsed.hours;
      saveConfig({ scheduler: { jobs } });
    } else {
      jobs.push({
        name: "lead_followup_scan",
        cron: "0 */6 * * *",
        workflow: "lead_followup_scan",
        enabled: false,
        followupHours: parsed.hours
      });
      saveConfig({ scheduler: { jobs } });
    }
    return {
      status: "success",
      message: `Follow-up default set to ${parsed.hours} hours.`
    };
  }

  if (parsed.action === "toggle_scheduler") {
    saveConfig({ scheduler: { enabled: parsed.enabled } });
    return {
      status: "success",
      message: `Scheduler ${parsed.enabled ? "enabled" : "disabled"}.`
    };
  }

  if (parsed.action === "update_lead_status") {
    let leadId = parsed.leadId;
    if (!leadId && parsed.leadName) {
      const leads = await findLeadsByName(parsed.leadName);
      if (!leads.length) {
        return { status: "error", message: "Lead not found." };
      }
      if (leads.length > 1) {
        return {
          status: "error",
          message: `Multiple leads matched: ${leads
            .map((lead) => `#${lead.id} ${lead.lead_name}`)
            .join(", ")}`
        };
      }
      leadId = leads[0].id;
    }
    await updateLeadFields(leadId, { status: parsed.status });
    const lead = await getLeadById(leadId);
    return {
      status: "success",
      message: `Lead ${lead.lead_name || lead.id} marked ${parsed.status}.`
    };
  }

  if (parsed.action === "run_health_check") {
    const result = await checkHealth();
    return {
      status: "success",
      message: `Health check: ${JSON.stringify(result)}`
    };
  }

  if (parsed.action === "test_gmail") {
    const output = await invokeTool(
      "gmail_read",
      { filter: "newer_than:7d", limit: 1 },
      config,
      { source: "control" }
    );
    return {
      status: "success",
      message: output.emails.length
        ? `Gmail OK. Latest: ${output.emails[0].subject}`
        : "Gmail OK. No recent emails."
    };
  }

  if (parsed.action === "run_workflow") {
    const result = await runWorkflow(
      parsed.workflow,
      {},
      config,
      { source: "control" }
    );
    return { status: "success", message: "Workflow executed.", result };
  }

  if (parsed.action === "toggle_auto_draft") {
    saveConfig({ automations: { autoDraft: parsed.enabled } });
    return {
      status: "success",
      message: `Auto-draft ${parsed.enabled ? "enabled" : "disabled"}.`
    };
  }

  return { status: "error", message: "Unsupported action." };
}

module.exports = {
  executeAction,
  ACTIONS,
  parseCommand
};
