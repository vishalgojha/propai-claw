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
  `);
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
