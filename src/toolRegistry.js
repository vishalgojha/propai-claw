const { generateResponse } = require("./aiClient");
const { searchWeb } = require("./searchTool");
const { sendEmail, readEmails } = require("./gmail");
const { updateLeadFields, getLeadById } = require("./leadStore");
const { createToolCall, finishToolCall } = require("./toolStore");

const TOOL_REGISTRY = {
  ai_generate: {
    name: "ai_generate",
    description: "Generate a response with the configured LLM",
    inputs: ["prompt", "systemPrompt"],
    outputs: ["text"],
    run: async (input, config) => {
      const text = await generateResponse(input.prompt, config, {
        systemPrompt: input.systemPrompt
      });
      return { text };
    }
  },
  search_web: {
    name: "search_web",
    description: "Run web search via configured provider",
    inputs: ["query"],
    outputs: ["results"],
    run: async (input, config) => {
      const results = await searchWeb(input.query, config);
      return { results };
    }
  },
  gmail_send: {
    name: "gmail_send",
    description: "Send an email via Gmail",
    inputs: ["to", "subject", "body"],
    outputs: ["status"],
    run: async (input, config) => {
      await sendEmail(
        { to: input.to, subject: input.subject, body: input.body },
        config
      );
      return { status: "sent" };
    }
  },
  gmail_read: {
    name: "gmail_read",
    description: "Read emails via Gmail",
    inputs: ["filter", "limit"],
    outputs: ["emails"],
    run: async (input, config) => {
      const emails = await readEmails(input.filter, config, input.limit || 5);
      return { emails };
    }
  },
  lead_update: {
    name: "lead_update",
    description: "Update lead fields",
    inputs: ["leadId", "fields"],
    outputs: ["lead"],
    run: async (input) => {
      await updateLeadFields(input.leadId, input.fields);
      const lead = await getLeadById(input.leadId);
      return { lead };
    }
  }
};

function isToolEnabled(toolName, config) {
  const disabled = (config.tools && config.tools.disabled) || [];
  return !disabled.includes(toolName);
}

function isToolPermitted(toolName, config, context) {
  const permissions = (config.tools && config.tools.permissions) || {};
  const allowed = permissions[toolName];
  if (!allowed || !allowed.length) return true;
  const source = context.source || "web";
  return allowed.includes(source);
}

async function invokeTool(toolName, input, config, context = {}) {
  const tool = TOOL_REGISTRY[toolName];
  if (!tool) {
    throw new Error(`Tool not registered: ${toolName}`);
  }
  if (!isToolEnabled(toolName, config)) {
    throw new Error(`Tool disabled: ${toolName}`);
  }
  if (!isToolPermitted(toolName, config, context)) {
    throw new Error(`Tool not permitted for source: ${toolName}`);
  }

  const callId = await createToolCall({
    toolName,
    input,
    leadId: context.leadId,
    workflowRunId: context.workflowRunId,
    source: context.source
  });

  try {
    const output = await tool.run(input, config, context);
    await finishToolCall({
      id: callId,
      output,
      status: "success"
    });
    return output;
  } catch (error) {
    await finishToolCall({
      id: callId,
      output: null,
      status: "error",
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  TOOL_REGISTRY,
  invokeTool
};
