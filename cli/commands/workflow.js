const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const { loadConfig } = require("../../src/configStore");
const { runWorkflow } = require("../../src/workflowEngine");
const {
  listWorkflowRuns,
  getWorkflowRun,
  listWorkflowSteps
} = require("../../src/workflowStore");

function parseJsonInput(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("Invalid JSON input.");
  }
}

function registerWorkflow(program) {
  const workflow = program.command("workflow").description("Workflow controls");

  workflow
    .command("list")
    .description("List recent workflow runs")
    .option("-n, --limit <count>", "Number of runs", "10")
    .action(async (options) => {
      const limit = Number(options.limit) || 10;
      const runs = await listWorkflowRuns(limit);
      if (!runs.length) {
        console.log("No workflow runs.");
        return;
      }
      runs.forEach((run) => {
        console.log(
          `#${run.id} ${run.name} | ${run.status} | ${run.started_at || "-"}`
        );
      });
    });

  workflow
    .command("show <id>")
    .description("Show workflow run details")
    .action(async (id) => {
      const run = await getWorkflowRun(Number(id));
      if (!run) {
        console.log(chalk.red("Workflow run not found."));
        return;
      }
      console.log(chalk.cyan(`Run #${run.id} - ${run.name}`));
      console.log(`Status: ${run.status}`);
      console.log(`Started: ${run.started_at || "-"}`);
      console.log(`Finished: ${run.finished_at || "-"}`);
      if (run.error) console.log(`Error: ${run.error}`);
      const steps = await listWorkflowSteps(run.id);
      if (steps.length) {
        console.log("\nSteps:");
        steps.forEach((step) => {
          console.log(
            `- ${step.step_name} (${step.tool_name}) | ${step.status}`
          );
        });
      }
    });

  workflow
    .command("run <name>")
    .description("Run a workflow")
    .option("--input <json>", "JSON input payload")
    .option("--lead <id>", "Lead id shortcut")
    .action(async (name, options) => {
      const config = loadConfig();
      const input = parseJsonInput(options.input);
      if (options.lead) {
        input.leadId = Number(options.lead);
      }
      const result = await runWorkflow(name, input, config, {
        source: "cli",
        leadId: input.leadId
      });
      console.log(chalk.green("Workflow completed."));
      console.log(JSON.stringify(result, null, 2));
    });
}

module.exports = {
  registerWorkflow
};
