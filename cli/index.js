#!/usr/bin/env node
const { Command } = require("commander");

const { registerSystem } = require("./commands/system");
const { registerAgent } = require("./commands/agent");
const { registerLead } = require("./commands/lead");
const { registerGmail } = require("./commands/gmail");
const { registerSearch } = require("./commands/search");
const { registerConfig } = require("./commands/config");
const { registerShell } = require("./commands/shell");

async function run() {
  const program = new Command();
  program
    .name("propai")
    .description("PropAI-Claw CLI")
    .version("0.2.0");

  registerSystem(program);
  registerAgent(program);
  registerLead(program);
  registerGmail(program);
  registerSearch(program);
  registerConfig(program);
  registerShell(program);

  await program.parseAsync(process.argv);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
