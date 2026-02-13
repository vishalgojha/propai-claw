const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const inquirer = require("inquirer");
const { loadConfig } = require("../../src/configStore");
const { generateResponse } = require("../../src/aiClient");
const {
  deleteMessagesForLead,
  deleteAllMessages
} = require("../../src/leadStore");

function registerAgent(program) {
  const agent = program.command("agent").description("Agent controls");

  agent
    .command("list")
    .description("Show active agent provider")
    .action(() => {
      const config = loadConfig();
      console.log(`Provider: ${config.ai.provider || "not set"}`);
      console.log(`Model: ${config.ai.model || "not set"}`);
    });

  agent
    .command("config")
    .description("Show agent configuration")
    .action(() => {
      const config = loadConfig();
      const provider = config.ai.provider || "not set";
      console.log(chalk.cyan("Agent Config"));
      console.log(`Provider: ${provider}`);
      console.log(`Model: ${config.ai.model || "-"}`);
      console.log(`Temperature: ${config.ai.temperature}`);
      const providerConfig =
        (config.providers && config.providers[provider]) || {};
      console.log(`Base URL: ${providerConfig.baseUrl || "-"}`);
    });

  agent
    .command("test <text>")
    .description("Test the agent with a prompt")
    .action(async (text) => {
      const config = loadConfig();
      const reply = await generateResponse(text, config);
      console.log(chalk.green(reply));
    });

  agent
    .command("reset")
    .description("Reset agent memory (messages)")
    .option("--lead <id>", "Reset messages for a single lead")
    .option("--all", "Reset messages for all leads")
    .action(async (options) => {
      if (!options.lead && !options.all) {
        console.log("Specify --lead <id> or --all.");
        return;
      }

      const target = options.all
        ? "ALL lead messages"
        : `messages for lead ${options.lead}`;
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `Are you sure you want to delete ${target}?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow("Cancelled."));
        return;
      }

      if (options.all) {
        await deleteAllMessages();
        console.log(chalk.green("All messages cleared."));
        return;
      }

      await deleteMessagesForLead(Number(options.lead));
      console.log(chalk.green(`Messages cleared for lead ${options.lead}.`));
    });
}

module.exports = {
  registerAgent
};
