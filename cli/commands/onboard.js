const { run } = require("../../src/onboard-cli");

function registerOnboard(program) {
  program
    .command("onboard")
    .description("Run interactive onboarding in the terminal")
    .action(async () => {
      await run();
    });
}

module.exports = {
  registerOnboard
};
