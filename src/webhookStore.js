const { getDb } = require("./db");

function nowIso() {
  return new Date().toISOString();
}

function normalizeWebhookRow(row) {
  if (!row) return null;
  return {
    ...row,
    active: Boolean(row.active)
  };
}

function normalizeDeliveryRow(row) {
  if (!row) return null;
  let parsedPayload = null;
  if (row.payload) {
    try {
      parsedPayload = JSON.parse(row.payload);
    } catch (_) {
      parsedPayload = null;
    }
  }
  return {
    ...row,
    payload: parsedPayload
  };
}

async function listWebhooks() {
  const db = await getDb();
  const rows = await db.all(
    "SELECT * FROM webhooks ORDER BY created_at DESC, id DESC"
  );
  return rows.map(normalizeWebhookRow);
}

async function getWebhookById(id) {
  const db = await getDb();
  const row = await db.get("SELECT * FROM webhooks WHERE id = ?", id);
  return normalizeWebhookRow(row);
}

async function createWebhook({ eventType, url, secret, active = true }) {
  const db = await getDb();
  const timestamp = nowIso();
  const result = await db.run(
    `INSERT INTO webhooks
      (event_type, url, secret, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    eventType,
    url,
    secret || null,
    active ? 1 : 0,
    timestamp,
    timestamp
  );
  return getWebhookById(result.lastID);
}

async function updateWebhook(id, patch) {
  const updates = [];
  const values = [];
  if (patch.eventType !== undefined) {
    updates.push("event_type = ?");
    values.push(patch.eventType);
  }
  if (patch.url !== undefined) {
    updates.push("url = ?");
    values.push(patch.url);
  }
  if (patch.secret !== undefined) {
    updates.push("secret = ?");
    values.push(patch.secret || null);
  }
  if (patch.active !== undefined) {
    updates.push("active = ?");
    values.push(patch.active ? 1 : 0);
  }

  if (!updates.length) {
    return getWebhookById(id);
  }

  const db = await getDb();
  values.push(nowIso());
  values.push(id);

  await db.run(
    `UPDATE webhooks
     SET ${updates.join(", ")}, updated_at = ?
     WHERE id = ?`,
    values
  );
  return getWebhookById(id);
}

async function deleteWebhook(id) {
  const db = await getDb();
  const result = await db.run("DELETE FROM webhooks WHERE id = ?", id);
  return result.changes > 0;
}

async function listActiveWebhooksForEvent(eventType) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT * FROM webhooks
     WHERE event_type = ? AND active = 1
     ORDER BY id ASC`,
    eventType
  );
  return rows.map(normalizeWebhookRow);
}

async function createWebhookDelivery({ webhookId, payload }) {
  const db = await getDb();
  const timestamp = nowIso();
  const result = await db.run(
    `INSERT INTO webhook_deliveries
      (webhook_id, payload, status, attempts, last_error, response_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    webhookId,
    JSON.stringify(payload || {}),
    "pending",
    0,
    null,
    null,
    timestamp,
    timestamp
  );
  return result.lastID;
}

async function updateWebhookDelivery({
  id,
  status,
  attempts,
  lastError,
  responseCode
}) {
  const db = await getDb();
  await db.run(
    `UPDATE webhook_deliveries
     SET status = ?, attempts = ?, last_error = ?, response_code = ?, updated_at = ?
     WHERE id = ?`,
    status,
    attempts,
    lastError || null,
    responseCode || null,
    nowIso(),
    id
  );
}

async function getWebhookDeliveryById(id) {
  const db = await getDb();
  const row = await db.get("SELECT * FROM webhook_deliveries WHERE id = ?", id);
  return normalizeDeliveryRow(row);
}

async function listWebhookDeliveries(limit = 100) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT * FROM webhook_deliveries
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    limit
  );
  return rows.map(normalizeDeliveryRow);
}

module.exports = {
  listWebhooks,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  listActiveWebhooksForEvent,
  createWebhookDelivery,
  updateWebhookDelivery,
  getWebhookDeliveryById,
  listWebhookDeliveries
};
