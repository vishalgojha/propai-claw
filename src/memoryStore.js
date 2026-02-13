const { getDb } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

async function upsertMemory({ scope, key, content, tags }) {
  const db = await getDb();
  const existing = await db.get(
    "SELECT id FROM memories WHERE scope = ? AND key = ?",
    scope,
    key
  );
  const tagValue = tags ? JSON.stringify(tags) : null;
  if (existing) {
    await db.run(
      "UPDATE memories SET content = ?, tags = ?, updated_at = ? WHERE id = ?",
      content,
      tagValue,
      nowIso(),
      existing.id
    );
    return existing.id;
  }
  const result = await db.run(
    "INSERT INTO memories (scope, key, content, tags, updated_at) VALUES (?, ?, ?, ?, ?)",
    scope,
    key,
    content,
    tagValue,
    nowIso()
  );
  return result.lastID;
}

async function getMemory(scope, key) {
  const db = await getDb();
  return db.get("SELECT * FROM memories WHERE scope = ? AND key = ?", scope, key);
}

async function listMemory(scope, limit = 50) {
  const db = await getDb();
  return db.all(
    "SELECT * FROM memories WHERE scope = ? ORDER BY updated_at DESC LIMIT ?",
    scope,
    limit
  );
}

module.exports = {
  upsertMemory,
  getMemory,
  listMemory
};
