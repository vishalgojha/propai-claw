const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

function startWhatsApp({
  onMessage,
  onReady,
  onAuthFailure,
  onDisconnected,
  onError
}) {
  const sessionDataPath = process.env.PROPAI_WHATSAPP_DATA_DIR;
  const executablePath = process.env.PROPAI_PUPPETEER_EXECUTABLE_PATH;

  const client = new Client({
    authStrategy: new LocalAuth(
      sessionDataPath ? { dataPath: sessionDataPath } : {}
    ),
    puppeteer: {
      executablePath: executablePath || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  });

  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("WhatsApp client is ready.");
    if (onReady) onReady();
  });

  client.on("auth_failure", (message) => {
    console.error("WhatsApp authentication failed:", message);
    if (onAuthFailure) onAuthFailure(message);
  });

  client.on("disconnected", (reason) => {
    console.error("WhatsApp client disconnected:", reason);
    if (onDisconnected) onDisconnected(reason);
  });

  client.on("message", async (message) => {
    if (onMessage) {
      await onMessage(message);
    }
  });

  client
    .initialize()
    .catch((error) => {
      console.error("WhatsApp client initialization failed:", error.message);
      if (onError) onError(error);
    });

  return client;
}

module.exports = {
  startWhatsApp
};
