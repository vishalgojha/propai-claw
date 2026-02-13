const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { loadConfig } = require("./configStore");

let dbPromise;

async function initDb(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_key TEXT UNIQUE,
      lead_name TEXT,
      phone TEXT,
      email TEXT,
      group_name TEXT,
      lead_type TEXT,
      contact TEXT,
      urgency_score INTEGER,
      intent TEXT,
      budget TEXT,
      location TEXT,
      configuration TEXT,
      timeline TEXT,
      source TEXT,
      status TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER,
      source TEXT,
      direction TEXT,
      content TEXT,
      created_at TEXT,
      FOREIGN KEY(lead_id) REFERENCES leads(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);

    CREATE TABLE IF NOT EXISTS tool_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT,
      input_json TEXT,
      output_json TEXT,
      status TEXT,
      error TEXT,
      lead_id INTEGER,
      workflow_run_id INTEGER,
      source TEXT,
      started_at TEXT,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      status TEXT,
      input_json TEXT,
      output_json TEXT,
      error TEXT,
      started_at TEXT,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS workflow_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_run_id INTEGER,
      step_name TEXT,
      tool_name TEXT,
      status TEXT,
      input_json TEXT,
      output_json TEXT,
      error TEXT,
      started_at TEXT,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT,
      key TEXT,
      content TEXT,
      tags TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_workflow ON tool_calls(workflow_run_id);

    CREATE TABLE IF NOT EXISTS control_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT,
      action TEXT,
      status TEXT,
      result_json TEXT,
      role TEXT,
      created_at TEXT
    );
  `);

  await ensureLeadColumns(db);
}

async function ensureLeadColumns(db) {
  const columns = await db.all("PRAGMA table_info(leads)");
  const existing = new Set(columns.map((col) => col.name));
  const additions = [
    { name: "group_name", type: "TEXT" },
    { name: "lead_type", type: "TEXT" },
    { name: "contact", type: "TEXT" },
    { name: "urgency_score", type: "INTEGER" }
  ];

  for (const column of additions) {
    if (!existing.has(column.name)) {
      await db.exec(`ALTER TABLE leads ADD COLUMN ${column.name} ${column.type}`);
    }
  }
}

async function getDb() {
  if (!dbPromise) {
    const config = loadConfig();
    const dbPath = config.storage && config.storage.dbPath
      ? config.storage.dbPath
      : "data/propai.db";
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    }).then(async (db) => {
      await initDb(db);
      return db;
    });
  }
  return dbPromise;
}

module.exports = {
  getDb
};
