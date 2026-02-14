const {
  ALLOWED_WEBHOOK_EVENTS,
  isAllowedWebhookEvent
} = require("./webhookEvents");

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function normalizeActive(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return null;
}

function isValidWebhookUrl(value) {
  if (!hasValue(value)) return false;
  try {
    const parsed = new URL(String(value));
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (_) {
    return false;
  }
}

function buildCreatePayload(input) {
  const body = input || {};
  const eventType = hasValue(body.event_type) ? String(body.event_type).trim() : "";
  const url = hasValue(body.url) ? String(body.url).trim() : "";
  const secret = hasValue(body.secret) ? String(body.secret).trim() : null;
  const active = normalizeActive(body.active, true);
  return { eventType, url, secret, active };
}

function validateCreateWebhookInput(input) {
  const payload = buildCreatePayload(input);
  const errors = [];

  if (!payload.eventType) {
    errors.push("event_type is required.");
  } else if (!isAllowedWebhookEvent(payload.eventType)) {
    errors.push(
      `event_type must be one of: ${ALLOWED_WEBHOOK_EVENTS.join(", ")}`
    );
  }

  if (!payload.url) {
    errors.push("url is required.");
  } else if (!isValidWebhookUrl(payload.url)) {
    errors.push("url must be a valid http/https URL.");
  }

  if (payload.active === null) {
    errors.push("active must be a boolean.");
  }

  return {
    errors,
    value: payload
  };
}

function buildUpdatePayload(input) {
  const body = input || {};
  const output = {};

  if (body.event_type !== undefined) {
    output.eventType = hasValue(body.event_type)
      ? String(body.event_type).trim()
      : "";
  }
  if (body.url !== undefined) {
    output.url = hasValue(body.url) ? String(body.url).trim() : "";
  }
  if (body.secret !== undefined) {
    output.secret = hasValue(body.secret) ? String(body.secret).trim() : null;
  }
  if (body.active !== undefined) {
    output.active = normalizeActive(body.active, null);
  }

  return output;
}

function validateUpdateWebhookInput(input) {
  const payload = buildUpdatePayload(input);
  const errors = [];

  if (!Object.keys(payload).length) {
    errors.push("At least one field is required to update.");
  }

  if (payload.eventType !== undefined) {
    if (!payload.eventType) {
      errors.push("event_type cannot be empty.");
    } else if (!isAllowedWebhookEvent(payload.eventType)) {
      errors.push(
        `event_type must be one of: ${ALLOWED_WEBHOOK_EVENTS.join(", ")}`
      );
    }
  }

  if (payload.url !== undefined) {
    if (!payload.url) {
      errors.push("url cannot be empty.");
    } else if (!isValidWebhookUrl(payload.url)) {
      errors.push("url must be a valid http/https URL.");
    }
  }

  if (
    payload.active === null &&
    input &&
    Object.prototype.hasOwnProperty.call(input, "active")
  ) {
    errors.push("active must be a boolean.");
  }

  return {
    errors,
    value: payload
  };
}

module.exports = {
  validateCreateWebhookInput,
  validateUpdateWebhookInput,
  isValidWebhookUrl
};
