const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const {
  listLeads,
  getLeadById,
  listMessages,
  updateLeadFields
} = require("../../src/leadStore");
const { scoreLead } = require("../../src/leadScoring");

function registerLead(program) {
  const lead = program.command("lead").description("Lead management");

  lead
    .command("list")
    .description("List leads")
    .option("-n, --limit <count>", "Number of leads", "20")
    .action(async (options) => {
      const limit = Number(options.limit) || 20;
      const leads = await listLeads(limit);
      if (!leads.length) {
        console.log("No leads yet.");
        return;
      }
      leads.forEach((item) => {
        console.log(
          `#${item.id} ${item.lead_name || "-"} | ${item.phone || "-"} | ${item.intent || "-"} | ${item.status || "-"}`
        );
      });
    });

  lead
    .command("show <id>")
    .description("Show a lead and recent messages")
    .action(async (id) => {
      const leadRecord = await getLeadById(Number(id));
      if (!leadRecord) {
        console.log(chalk.red("Lead not found."));
        return;
      }
      console.log(chalk.cyan(`Lead #${leadRecord.id}`));
      console.log(`Name: ${leadRecord.lead_name || "-"}`);
      console.log(`Phone: ${leadRecord.phone || "-"}`);
      console.log(`Intent: ${leadRecord.intent || "-"}`);
      console.log(`Budget: ${leadRecord.budget || "-"}`);
      console.log(`Location: ${leadRecord.location || "-"}`);
      console.log(`Configuration: ${leadRecord.configuration || "-"}`);
      console.log(`Timeline: ${leadRecord.timeline || "-"}`);
      console.log(`Status: ${leadRecord.status || "-"}`);
      console.log(`Notes: ${leadRecord.notes || "-"}`);

      const messages = await listMessages(leadRecord.id, 10);
      if (messages.length) {
        console.log("\nRecent Messages:");
        messages
          .slice()
          .reverse()
          .forEach((message) => {
            console.log(
              `[${message.created_at}] ${message.direction}: ${message.content}`
            );
          });
      }
    });

  lead
    .command("update <id>")
    .description("Update lead fields")
    .option("--name <value>", "Lead name")
    .option("--phone <value>", "Phone number")
    .option("--email <value>", "Email")
    .option("--intent <value>", "Intent (buy/sell/rent)")
    .option("--budget <value>", "Budget")
    .option("--location <value>", "Location")
    .option("--configuration <value>", "Configuration (BHK)")
    .option("--timeline <value>", "Timeline")
    .option("--status <value>", "Status")
    .option("--notes <value>", "Notes")
    .action(async (id, options) => {
      const fields = {
        lead_name: options.name,
        phone: options.phone,
        email: options.email,
        intent: options.intent,
        budget: options.budget,
        location: options.location,
        configuration: options.configuration,
        timeline: options.timeline,
        status: options.status,
        notes: options.notes
      };
      await updateLeadFields(Number(id), fields);
      console.log(chalk.green(`Lead ${id} updated.`));
    });

  lead
    .command("score <id>")
    .description("Score a lead (hot/warm/cold)")
    .action(async (id) => {
      const leadRecord = await getLeadById(Number(id));
      if (!leadRecord) {
        console.log(chalk.red("Lead not found."));
        return;
      }
      const messages = await listMessages(leadRecord.id, 20);
      const result = scoreLead(leadRecord, messages);
      await updateLeadFields(leadRecord.id, { status: result.status });
      console.log(
        chalk.green(
          `Lead ${leadRecord.id} scored ${result.score} => ${result.status}`
        )
      );
      if (result.reasons.length) {
        console.log(`Reasons: ${result.reasons.join(", ")}`);
      }
    });
}

module.exports = {
  registerLead
};
