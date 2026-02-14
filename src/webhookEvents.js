const ALLOWED_WEBHOOK_EVENTS = [
  "lead.created",
  "lead.updated",
  "lead.hot",
  "workflow.completed"
];

function isAllowedWebhookEvent(eventType) {
  return ALLOWED_WEBHOOK_EVENTS.includes(String(eventType || "").trim());
}

module.exports = {
  ALLOWED_WEBHOOK_EVENTS,
  isAllowedWebhookEvent
};
