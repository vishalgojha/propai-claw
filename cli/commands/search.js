const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const { loadConfig } = require("../../src/configStore");
const { searchWeb } = require("../../src/searchTool");

function registerSearch(program) {
  program
    .command("search <query>")
    .description("Run web search")
    .action(async (query) => {
      const config = loadConfig();
      const results = await searchWeb(query, config);
      if (!results.length) {
        console.log("No results.");
        return;
      }
      results.forEach((item, index) => {
        console.log(chalk.cyan(`${index + 1}. ${item.title}`));
        console.log(`${item.link}`);
        console.log(`${item.snippet}\n`);
      });
    });
}

module.exports = {
  registerSearch
};
