const readline = require("readline");
const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const { loadConfig } = require("../../src/configStore");
const { generateResponse } = require("../../src/aiClient");
const { searchWeb } = require("../../src/searchTool");
const { listLeads, getLeadById, listMessages } = require("../../src/leadStore");
const { run: runOnboard } = require("../../src/onboard-cli");
const { getStatus } = require("../lib/system");

function printShellHelp() {
  console.log("\nShell commands:");
  console.log("  help");
  console.log("  exit");
  console.log("  status");
  console.log("  onboard");
  console.log("  config show");
  console.log("  agent test <text>");
  console.log("  lead list");
  console.log("  lead show <id>");
  console.log("  search <query>");
  console.log("");
}

async function handleShellCommand(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (trimmed === "help") {
    printShellHelp();
    return;
  }
  if (trimmed === "exit" || trimmed === "quit") {
    return "exit";
  }
  if (trimmed === "status") {
    const status = getStatus();
    console.log(
      status.running
        ? `Running on port ${status.port} (pid ${status.pid})`
        : "Not running"
    );
    return;
  }
  if (trimmed === "onboard") {
    await runOnboard();
    return;
  }
  if (trimmed === "config show") {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  if (trimmed.startsWith("agent test ")) {
    const text = trimmed.slice("agent test ".length);
    const config = loadConfig();
    const reply = await generateResponse(text, config);
    console.log(chalk.green(reply));
    return;
  }
  if (trimmed === "lead list") {
    const leads = await listLeads(10);
    leads.forEach((lead) => {
      console.log(
        `#${lead.id} ${lead.lead_name || "-"} | ${lead.intent || "-"} | ${lead.status || "-"}`
      );
    });
    return;
  }
  if (trimmed.startsWith("lead show ")) {
    const id = Number(trimmed.slice("lead show ".length));
    const lead = await getLeadById(id);
    if (!lead) {
      console.log("Lead not found.");
      return;
    }
    console.log(`Name: ${lead.lead_name || "-"}`);
    console.log(`Phone: ${lead.phone || "-"}`);
    console.log(`Intent: ${lead.intent || "-"}`);
    const messages = await listMessages(lead.id, 5);
    messages
      .slice()
      .reverse()
      .forEach((message) => {
        console.log(
          `[${message.created_at}] ${message.direction}: ${message.content}`
        );
      });
    return;
  }
  if (trimmed.startsWith("search ")) {
    const query = trimmed.slice("search ".length);
    const config = loadConfig();
    const results = await searchWeb(query, config);
    results.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`${item.link}`);
      console.log(`${item.snippet}\n`);
    });
    return;
  }

  console.log("Unknown command. Type 'help'.");
}

function registerShell(program) {
  program
    .command("shell")
    .description("Interactive shell")
    .action(async () => {
      console.log(chalk.cyan("PropAI shell. Type 'help' for commands."));
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "propai> "
      });
      rl.prompt();
      rl.on("line", async (line) => {
        const result = await handleShellCommand(line);
        if (result === "exit") {
          rl.close();
          return;
        }
        rl.prompt();
      });
    });
}

module.exports = {
  registerShell
};
