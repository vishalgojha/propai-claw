const { getDb } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

async function createWorkflowRun({ name, input }) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO workflow_runs
      (name, status, input_json, started_at)
     VALUES (?, ?, ?, ?)`,
    name,
    "running",
    JSON.stringify(input || {}),
    nowIso()
  );
  return result.lastID;
}

async function finishWorkflowRun({ id, status, output, error }) {
  const db = await getDb();
  await db.run(
    `UPDATE workflow_runs
     SET status = ?, output_json = ?, error = ?, finished_at = ?
     WHERE id = ?`,
    status,
    output ? JSON.stringify(output) : null,
    error || null,
    nowIso(),
    id
  );
}

async function createWorkflowStep({
  workflowRunId,
  stepName,
  toolName,
  input
}) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO workflow_steps
      (workflow_run_id, step_name, tool_name, status, input_json, started_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    workflowRunId,
    stepName,
    toolName,
    "running",
    JSON.stringify(input || {}),
    nowIso()
  );
  return result.lastID;
}

async function finishWorkflowStep({ id, status, output, error }) {
  const db = await getDb();
  await db.run(
    `UPDATE workflow_steps
     SET status = ?, output_json = ?, error = ?, finished_at = ?
     WHERE id = ?`,
    status,
    output ? JSON.stringify(output) : null,
    error || null,
    nowIso(),
    id
  );
}

async function listWorkflowRuns(limit = 20) {
  const db = await getDb();
  return db.all(
    `SELECT * FROM workflow_runs
     ORDER BY started_at DESC
     LIMIT ?`,
    limit
  );
}

async function getWorkflowRun(id) {
  const db = await getDb();
  return db.get("SELECT * FROM workflow_runs WHERE id = ?", id);
}

async function listWorkflowSteps(workflowRunId) {
  const db = await getDb();
  return db.all(
    `SELECT * FROM workflow_steps
     WHERE workflow_run_id = ?
     ORDER BY started_at ASC`,
    workflowRunId
  );
}

module.exports = {
  createWorkflowRun,
  finishWorkflowRun,
  createWorkflowStep,
  finishWorkflowStep,
  listWorkflowRuns,
  getWorkflowRun,
  listWorkflowSteps
};
