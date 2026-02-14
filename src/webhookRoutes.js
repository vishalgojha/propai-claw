const express = require("express");
const {
  listWebhooks,
  createWebhook,
  getWebhook,
  updateWebhook,
  deleteWebhook
} = require("./webhookController");

function registerWebhookRoutes(app) {
  const router = express.Router();

  router.get("/", listWebhooks);
  router.post("/", createWebhook);
  router.get("/:id", getWebhook);
  router.put("/:id", updateWebhook);
  router.delete("/:id", deleteWebhook);

  app.use("/api/webhooks", router);
}

module.exports = {
  registerWebhookRoutes
};
