const crypto = require("crypto");
const {
  listActiveWebhooksForEvent,
  createWebhookDelivery,
  updateWebhookDelivery
} = require("./webhookStore");
const { isAllowedWebhookEvent } = require("./webhookEvents");

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSignature(secret, payloadString) {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");
}

function buildPayload(eventType, data) {
  return {
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    data: data || {}
  };
}

async function deliverWebhook(
  webhook,
  deliveryId,
  payload,
  {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    fetchImpl = fetch
  } = {}
) {
  const payloadString = JSON.stringify(payload);
  let attempt = 0;
  let lastError = null;
  let lastResponseCode = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "PropAI-Webhooks/1.0",
        "X-PropAI-Event": payload.event_type
      };

      if (webhook.secret) {
        headers["X-PropAI-Signature"] = buildSignature(
          webhook.secret,
          payloadString
        );
      }

      const response = await fetchImpl(webhook.url, {
        method: "POST",
        headers,
        body: payloadString
      });

      lastResponseCode = response.status;
      if (response.ok) {
        await updateWebhookDelivery({
          id: deliveryId,
          status: "success",
          attempts: attempt,
          responseCode: response.status,
          lastError: null
        });
        return {
          deliveryId,
          webhookId: webhook.id,
          status: "success",
          attempts: attempt,
          responseCode: response.status
        };
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }

    await updateWebhookDelivery({
      id: deliveryId,
      status: "failed",
      attempts: attempt,
      responseCode: lastResponseCode,
      lastError
    });

    if (attempt < maxAttempts) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  console.error(
    `Webhook delivery failed (webhook ${webhook.id}, delivery ${deliveryId}): ${lastError}`
  );

  return {
    deliveryId,
    webhookId: webhook.id,
    status: "failed",
    attempts: attempt,
    responseCode: lastResponseCode,
    error: lastError
  };
}

async function dispatchEvent(eventType, data, options = {}) {
  if (!isAllowedWebhookEvent(eventType)) {
    throw new Error(`Unsupported webhook event: ${eventType}`);
  }

  const webhooks = await listActiveWebhooksForEvent(eventType);
  if (!webhooks.length) {
    return { eventType, queued: 0, deliveries: [] };
  }

  const payload = buildPayload(eventType, data);
  const tasks = webhooks.map(async (webhook) => {
    const deliveryId = await createWebhookDelivery({
      webhookId: webhook.id,
      payload
    });
    return deliverWebhook(webhook, deliveryId, payload, options);
  });

  const deliveries = await Promise.all(tasks);
  return {
    eventType,
    queued: webhooks.length,
    deliveries
  };
}

module.exports = {
  dispatchEvent
};
