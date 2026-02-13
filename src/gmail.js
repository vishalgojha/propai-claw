const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

function getCredentials(config) {
  const credentialsPath = config.gmail.credentialsPath;
  if (!fs.existsSync(credentialsPath)) {
    throw new Error("Gmail credentials file not found.");
  }
  const raw = fs.readFileSync(credentialsPath, "utf8");
  return JSON.parse(raw);
}

function getOAuthClient(config) {
  const credentials = getCredentials(config);
  const { client_id, client_secret, redirect_uris } =
    credentials.installed || credentials.web;
  const redirectUri = config.gmail.redirectUri || redirect_uris[0];
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

function getTokenPath(config) {
  return config.gmail.tokenPath || "auth/gmail_token.json";
}

function saveToken(config, token) {
  const tokenPath = getTokenPath(config);
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
}

function loadToken(config) {
  const tokenPath = getTokenPath(config);
  if (!fs.existsSync(tokenPath)) return null;
  const raw = fs.readFileSync(tokenPath, "utf8");
  return JSON.parse(raw);
}

function getGmailClient(config) {
  const oauth2Client = getOAuthClient(config);
  const token = loadToken(config);
  if (!token) {
    throw new Error("Gmail token not found. Complete OAuth first.");
  }
  oauth2Client.setCredentials(token);
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function getGmailAuthUrl(config) {
  const oauth2Client = getOAuthClient(config);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: config.gmail.scopes
  });
}

async function handleGmailOAuthCallback(code, config) {
  const oauth2Client = getOAuthClient(config);
  const { tokens } = await oauth2Client.getToken(code);
  saveToken(config, tokens);
  return tokens;
}

async function sendEmail({ to, subject, body }, config) {
  const gmail = getGmailClient(config);
  const messageParts = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    `Subject: ${subject}`,
    "",
    body
  ];

  const rawMessage = Buffer.from(messageParts.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: rawMessage }
  });
}

async function readEmails(filter, config, limit = 5) {
  const gmail = getGmailClient(config);
  const list = await gmail.users.messages.list({
    userId: "me",
    q: filter || ""
  });
  const messages = list.data.messages || [];
  const results = [];

  for (const message of messages.slice(0, limit)) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject"]
    });
    const headers = detail.data.payload.headers || [];
    const from = headers.find((h) => h.name === "From")?.value || "";
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    results.push({ id: message.id, from, subject });
  }

  return results;
}

module.exports = {
  getGmailAuthUrl,
  handleGmailOAuthCallback,
  sendEmail,
  readEmails
};
