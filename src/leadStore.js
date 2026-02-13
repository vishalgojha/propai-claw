const { getDb } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

function cleanValue(value) {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
}

async function getOrCreateLead({ leadKey, source, phone, email }) {
  const db = await getDb();
  const existing = await db.get(
    "SELECT * FROM leads WHERE lead_key = ?",
    leadKey
  );
  if (existing) return existing;

  const timestamp = nowIso();
  const result = await db.run(
    `INSERT INTO leads (
      lead_key, source, phone, email, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    leadKey,
    source,
    cleanValue(phone),
    cleanValue(email),
    "new",
    timestamp,
    timestamp
  );
  return db.get("SELECT * FROM leads WHERE id = ?", result.lastID);
}

async function updateLeadFields(leadId, fields) {
  const updates = {};
  Object.entries(fields || {}).forEach(([key, value]) => {
    const cleaned = cleanValue(value);
    if (cleaned !== undefined) {
      updates[key] = cleaned;
    }
  });

  const keys = Object.keys(updates);
  if (!keys.length) return;

  const db = await getDb();
  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const values = keys.map((key) => updates[key]);
  values.push(nowIso());
  values.push(leadId);

  await db.run(
    `UPDATE leads SET ${setClause}, updated_at = ? WHERE id = ?`,
    values
  );
}

async function addMessage({ leadId, source, direction, content }) {
  const db = await getDb();
  await db.run(
    `INSERT INTO messages (lead_id, source, direction, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    leadId,
    source,
    direction,
    content,
    nowIso()
  );
}

async function getLeadById(leadId) {
  const db = await getDb();
  return db.get("SELECT * FROM leads WHERE id = ?", leadId);
}

async function listLeads(limit = 200) {
  const db = await getDb();
  return db.all(
    `SELECT
      l.*,
      m.content AS last_message,
      m.created_at AS last_message_at
     FROM leads l
     LEFT JOIN messages m
       ON m.id = (
         SELECT id FROM messages
         WHERE lead_id = l.id
         ORDER BY created_at DESC
         LIMIT 1
       )
     ORDER BY l.updated_at DESC
     LIMIT ?`,
    limit
  );
}

async function listMessages(leadId, limit = 20) {
  const db = await getDb();
  return db.all(
    `SELECT * FROM messages
     WHERE lead_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    leadId,
    limit
  );
}

async function deleteMessagesForLead(leadId) {
  const db = await getDb();
  await db.run("DELETE FROM messages WHERE lead_id = ?", leadId);
}

async function deleteAllMessages() {
  const db = await getDb();
  await db.run("DELETE FROM messages");
}

module.exports = {
  getOrCreateLead,
  updateLeadFields,
  addMessage,
  getLeadById,
  listLeads,
  listMessages,
  deleteMessagesForLead,
  deleteAllMessages
};
