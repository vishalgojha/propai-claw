const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const { upsertMemory, getMemory, listMemory } = require("../../src/memoryStore");

function registerMemory(program) {
  const memory = program.command("memory").description("Memory store");

  memory
    .command("list <scope>")
    .description("List memory entries by scope")
    .option("-n, --limit <count>", "Number of entries", "10")
    .action(async (scope, options) => {
      const limit = Number(options.limit) || 10;
      const entries = await listMemory(scope, limit);
      if (!entries.length) {
        console.log("No memory entries.");
        return;
      }
      entries.forEach((entry) => {
        console.log(
          `${entry.scope}:${entry.key} | ${entry.updated_at || "-"}`
        );
      });
    });

  memory
    .command("get <scope> <key>")
    .description("Get a memory entry")
    .action(async (scope, key) => {
      const entry = await getMemory(scope, key);
      if (!entry) {
        console.log(chalk.yellow("Memory not found."));
        return;
      }
      console.log(entry.content);
    });

  memory
    .command("set <scope> <key> <content...>")
    .description("Set a memory entry")
    .action(async (scope, key, contentParts) => {
      const content = Array.isArray(contentParts)
        ? contentParts.join(" ")
        : String(contentParts || "");
      await upsertMemory({ scope, key, content });
      console.log(chalk.green("Memory saved."));
    });
}

module.exports = {
  registerMemory
};
