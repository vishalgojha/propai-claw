const webhookModel = require("./webhookModel");
const {
  validateCreateWebhookInput,
  validateUpdateWebhookInput
} = require("./webhookValidation");

function parseWebhookId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

async function listWebhooks(_req, res) {
  const records = await webhookModel.listWebhooks();
  res.json(records);
}

async function createWebhook(req, res) {
  const { errors, value } = validateCreateWebhookInput(req.body || {});
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const created = await webhookModel.createWebhook(value);
  res.status(201).json(created);
}

async function getWebhook(req, res) {
  const id = parseWebhookId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid webhook id." });
  }

  const record = await webhookModel.getWebhookById(id);
  if (!record) {
    return res.status(404).json({ error: "Webhook not found." });
  }
  res.json(record);
}

async function updateWebhook(req, res) {
  const id = parseWebhookId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid webhook id." });
  }

  const existing = await webhookModel.getWebhookById(id);
  if (!existing) {
    return res.status(404).json({ error: "Webhook not found." });
  }

  const { errors, value } = validateUpdateWebhookInput(req.body || {});
  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const updated = await webhookModel.updateWebhook(id, value);
  res.json(updated);
}

async function deleteWebhook(req, res) {
  const id = parseWebhookId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid webhook id." });
  }

  const deleted = await webhookModel.deleteWebhook(id);
  if (!deleted) {
    return res.status(404).json({ error: "Webhook not found." });
  }
  res.status(204).send();
}

module.exports = {
  listWebhooks,
  createWebhook,
  getWebhook,
  updateWebhook,
  deleteWebhook
};
