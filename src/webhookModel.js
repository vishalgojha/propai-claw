const webhookStore = require("./webhookStore");

module.exports = {
  listWebhooks: webhookStore.listWebhooks,
  getWebhookById: webhookStore.getWebhookById,
  createWebhook: webhookStore.createWebhook,
  updateWebhook: webhookStore.updateWebhook,
  deleteWebhook: webhookStore.deleteWebhook
};
