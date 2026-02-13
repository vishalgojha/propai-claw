const { getDb } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

async function createToolCall({ toolName, input, leadId, workflowRunId, source }) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO tool_calls
      (tool_name, input_json, status, lead_id, workflow_run_id, source, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    toolName,
    JSON.stringify(input || {}),
    "running",
    leadId || null,
    workflowRunId || null,
    source || null,
    nowIso()
  );
  return result.lastID;
}

async function finishToolCall({ id, output, status, error }) {
  const db = await getDb();
  await db.run(
    `UPDATE tool_calls
     SET output_json = ?, status = ?, error = ?, finished_at = ?
     WHERE id = ?`,
    output ? JSON.stringify(output) : null,
    status,
    error || null,
    nowIso(),
    id
  );
}

module.exports = {
  createToolCall,
  finishToolCall
};
