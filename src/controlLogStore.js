const { getDb } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

async function addControlLog({ command, action, status, result, role }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO control_logs
      (command, action, status, result_json, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    command,
    action,
    status,
    result ? JSON.stringify(result) : null,
    role || null,
    nowIso()
  );
}

async function listControlLogs(limit = 20) {
  const db = await getDb();
  return db.all(
    `SELECT * FROM control_logs
     ORDER BY created_at DESC
     LIMIT ?`,
    limit
  );
}

module.exports = {
  addControlLog,
  listControlLogs
};
