const fs = require("fs");
const inquirer = require("inquirer");
const { run } = require("../../src/onboard-cli");
const { loadConfig, saveConfig } = require("../../src/configStore");
const { getGmailAuthUrl } = require("../../src/gmail");

function isLocalProvider(provider) {
  return ["ollama", "lmstudio"].includes(String(provider || "").toLowerCase());
}

function fileExists(filePath) {
  if (!filePath) return false;
  try {
    return fs.existsSync(filePath);
  } catch (_) {
    return false;
  }
}

function printStatus() {
  const config = loadConfig();
  const provider = config.ai && config.ai.provider;
  const providerConfig =
    (config.providers && config.providers[provider]) || {};
  const apiKeySet = isLocalProvider(provider)
    ? true
    : Boolean(providerConfig.apiKey);
  const searchKeySet = Boolean(config.search && config.search.apiKey);
  const whatsappEnabled = Boolean(config.whatsapp && config.whatsapp.enabled);
  const gmailEnabled = Boolean(config.gmail && config.gmail.enabled);
  const credPath = config.gmail && config.gmail.credentialsPath;
  const tokenPath = config.gmail && config.gmail.tokenPath;
  const credExists = fileExists(credPath);
  const tokenExists = fileExists(tokenPath);
  const webOnboarding =
    config.onboarding && config.onboarding.webEnabled ? "enabled" : "disabled";

  console.log("Onboarding status:");
  console.log(`- Provider: ${provider || "not set"}`);
  console.log(`- Model: ${config.ai && config.ai.model ? config.ai.model : "-"}`);
  console.log(`- API key: ${apiKeySet ? "set" : "missing"}`);
  console.log(`- Search key: ${searchKeySet ? "set" : "missing"}`);
  console.log(`- WhatsApp: ${whatsappEnabled ? "enabled" : "disabled"}`);
  console.log(
    `- Gmail: ${gmailEnabled ? "enabled" : "disabled"} (credentials: ${
      credExists ? "found" : "missing"
    }, token: ${tokenExists ? "found" : "missing"})`
  );
  console.log(`- Web onboarding: ${webOnboarding}`);
}

async function runSetupWizard() {
  console.log("PropAI setup wizard");
  const { runFull } = await inquirer.prompt([
    {
      type: "confirm",
      name: "runFull",
      message: "Run full onboarding now?",
      default: false
    }
  ]);

  if (runFull) {
    await run();
  }

  let config = loadConfig();

  const { enableWhatsapp } = await inquirer.prompt([
    {
      type: "confirm",
      name: "enableWhatsapp",
      message: "Enable WhatsApp integration?",
      default: Boolean(config.whatsapp && config.whatsapp.enabled)
    }
  ]);

  const { enableGmail } = await inquirer.prompt([
    {
      type: "confirm",
      name: "enableGmail",
      message: "Enable Gmail integration?",
      default: Boolean(config.gmail && config.gmail.enabled)
    }
  ]);

  const patch = {};
  if (enableWhatsapp !== undefined) {
    patch.whatsapp = { enabled: enableWhatsapp };
  }

  if (enableGmail) {
    const gmailAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "credentialsPath",
        message: "Gmail credentials path",
        default: config.gmail && config.gmail.credentialsPath
      },
      {
        type: "input",
        name: "tokenPath",
        message: "Gmail token path",
        default: config.gmail && config.gmail.tokenPath
      },
      {
        type: "input",
        name: "redirectUri",
        message: "Gmail redirect URI",
        default: config.gmail && config.gmail.redirectUri
      }
    ]);

    patch.gmail = {
      enabled: true,
      credentialsPath: gmailAnswers.credentialsPath,
      tokenPath: gmailAnswers.tokenPath,
      redirectUri: gmailAnswers.redirectUri
    };
  }

  if (Object.keys(patch).length) {
    saveConfig(patch);
  }

  config = loadConfig();
  if (config.gmail && config.gmail.enabled) {
    try {
      const url = getGmailAuthUrl(config);
      console.log("Gmail OAuth URL:");
      console.log(url);
      console.log("Open this URL in a browser to authorize Gmail.");
    } catch (error) {
      console.log("Unable to build Gmail OAuth URL:", error.message);
    }
  }

  console.log("Setup complete.");
}

function registerOnboard(program) {
  program
    .command("onboard")
    .description("Run interactive onboarding in the terminal")
    .action(async () => {
      await run();
    });

  program
    .command("setup")
    .description("Run the setup wizard (WhatsApp + Gmail)")
    .action(async () => {
      await runSetupWizard();
    });

  const onboarding = program
    .command("onboarding")
    .description("Onboarding utilities");

  onboarding
    .command("status")
    .description("Show onboarding status")
    .action(() => {
      printStatus();
    });
}

module.exports = {
  registerOnboard
};
