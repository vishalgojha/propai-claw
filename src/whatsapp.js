const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

function startWhatsApp({ onMessage }) {
  const client = new Client({
    authStrategy: new LocalAuth()
  });

  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("WhatsApp client is ready.");
  });

  client.on("message", async (message) => {
    if (onMessage) {
      await onMessage(message);
    }
  });

  client.initialize();
  return client;
}

module.exports = {
  startWhatsApp
};
