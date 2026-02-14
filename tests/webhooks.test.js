const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "propai-webhooks-"));
const dbPath = path.join(tempRoot, "data", "propai-test.db");
const configPath = path.join(tempRoot, "config.local.json");

process.env.PROPAI_CONFIG_PATH = configPath;

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(
  configPath,
  JSON.stringify(
    {
      app: { port: 0 },
      storage: { dbPath },
      ai: {
        provider: "ollama",
        model: "llama3.1",
        temperature: 0.4
      },
      providers: {
        ollama: {
          baseUrl: "http://localhost:11434/v1",
          model: "llama3.1"
        }
      }
    },
    null,
    2
  )
);

const { resetDbForTests } = require("../src/db");
const {
  createWebhook,
  listWebhooks,
  listWebhookDeliveries,
  getWebhookDeliveryById
} = require("../src/webhookStore");
const { dispatchEvent } = require("../src/webhookDispatcher");

async function resetTestDb() {
  await resetDbForTests();
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }
}

function createServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

function serverUrl(server) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

test.beforeEach(async () => {
  await resetTestDb();
});

test.after(async () => {
  await resetDbForTests();
  if (fs.existsSync(tempRoot)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("creates webhook subscriptions", async () => {
  const created = await createWebhook({
    eventType: "lead.created",
    url: "https://example.com/hooks/lead-created",
    secret: "secret-value",
    active: true
  });

  assert.ok(created.id > 0);
  assert.equal(created.event_type, "lead.created");
  assert.equal(created.url, "https://example.com/hooks/lead-created");
  assert.equal(created.secret, "secret-value");
  assert.equal(created.active, true);

  const list = await listWebhooks();
  assert.equal(list.length, 1);
});

test("dispatches webhook deliveries and stores success", async (t) => {
  let receivedBody = "";
  let receivedSignature = "";
  let receivedEventHeader = "";

  const server = await createServer((req, res) => {
    req.on("data", (chunk) => {
      receivedBody += chunk.toString("utf8");
    });
    req.on("end", () => {
      receivedSignature = req.headers["x-propai-signature"];
      receivedEventHeader = req.headers["x-propai-event"];
      res.statusCode = 200;
      res.end("ok");
    });
  });
  t.after(() => {
    server.close();
  });

  const secret = "dispatch-secret";
  await createWebhook({
    eventType: "lead.created",
    url: `${serverUrl(server)}/hook`,
    secret,
    active: true
  });

  const result = await dispatchEvent(
    "lead.created",
    { leadId: 99, status: "new" },
    { maxAttempts: 1, baseDelayMs: 1 }
  );

  assert.equal(result.queued, 1);
  assert.equal(receivedEventHeader, "lead.created");
  assert.ok(receivedBody.includes("\"leadId\":99"));

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(receivedBody)
    .digest("hex");
  assert.equal(receivedSignature, expectedSignature);

  const deliveries = await listWebhookDeliveries();
  assert.equal(deliveries.length, 1);

  const delivery = await getWebhookDeliveryById(deliveries[0].id);
  assert.equal(delivery.status, "success");
  assert.equal(delivery.attempts, 1);
  assert.equal(delivery.response_code, 200);
});

test("retries failed deliveries with exponential backoff", async (t) => {
  let requestCount = 0;
  const server = await createServer((_req, res) => {
    requestCount += 1;
    res.statusCode = 500;
    res.end("error");
  });
  t.after(() => {
    server.close();
  });

  await createWebhook({
    eventType: "lead.updated",
    url: `${serverUrl(server)}/hook`,
    secret: null,
    active: true
  });

  const result = await dispatchEvent(
    "lead.updated",
    { leadId: 7, changes: { status: "warm" } },
    { maxAttempts: 3, baseDelayMs: 1 }
  );

  assert.equal(result.queued, 1);
  assert.equal(requestCount, 3);

  const deliveries = await listWebhookDeliveries();
  assert.equal(deliveries.length, 1);
  const delivery = deliveries[0];
  assert.equal(delivery.status, "failed");
  assert.equal(delivery.attempts, 3);
  assert.equal(delivery.response_code, 500);
  assert.ok(delivery.last_error.includes("HTTP 500"));
});
