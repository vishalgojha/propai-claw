const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const { loadConfig } = require("../../src/configStore");
const { readEmails, sendEmail } = require("../../src/gmail");

function registerGmail(program) {
  const gmail = program.command("gmail").description("Gmail commands");

  gmail
    .command("test")
    .description("Test Gmail connectivity")
    .action(async () => {
      const config = loadConfig();
      const results = await readEmails("newer_than:30d", config, 1);
      if (!results.length) {
        console.log(chalk.yellow("Connected. No recent emails found."));
        return;
      }
      const mail = results[0];
      console.log(
        chalk.green(`Connected. Latest: ${mail.from} | ${mail.subject}`)
      );
    });

  gmail
    .command("read")
    .description("Read recent emails")
    .option("-f, --filter <query>", "Gmail search query", "")
    .option("-n, --limit <count>", "Number of emails", "5")
    .action(async (options) => {
      const config = loadConfig();
      const limit = Number(options.limit) || 5;
      const results = await readEmails(options.filter, config, limit);
      if (!results.length) {
        console.log("No emails found.");
        return;
      }
      results.forEach((mail) => {
        console.log(`${mail.from} | ${mail.subject}`);
      });
    });

  gmail
    .command("send")
    .description("Send an email")
    .requiredOption("--to <email>", "Recipient")
    .requiredOption("--subject <subject>", "Subject")
    .requiredOption("--body <body>", "Body")
    .action(async (options) => {
      const config = loadConfig();
      await sendEmail(
        {
          to: options.to,
          subject: options.subject,
          body: options.body
        },
        config
      );
      console.log(chalk.green("Email sent."));
    });
}

module.exports = {
  registerGmail
};
