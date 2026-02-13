const cron = require("node-cron");
const { runWorkflow } = require("./workflowEngine");

function startScheduler(config) {
  if (!config.scheduler || !config.scheduler.enabled) {
    return [];
  }

  const tasks = [];
  const timezone = config.scheduler.timezone || "UTC";
  const jobs = config.scheduler.jobs || [];

  jobs.forEach((job) => {
    if (!job.enabled) return;
    const task = cron.schedule(
      job.cron,
      async () => {
        try {
          if (job.workflow === "lead_followup_scan") {
            const result = await runWorkflow(
              "lead_followup_scan",
              { followupHours: job.followupHours || 48 },
              config,
              { source: "scheduler" }
            );
            const leads = (result.find_leads && result.find_leads.leads) || [];
            for (const lead of leads) {
              await runWorkflow(
                "lead_followup",
                { leadId: lead.id },
                config,
                { source: "scheduler", leadId: lead.id }
              );
            }
          } else {
            await runWorkflow(job.workflow, job.payload || {}, config, {
              source: "scheduler"
            });
          }
        } catch (error) {
          console.error(`Scheduler job failed (${job.name}):`, error.message);
        }
      },
      { timezone }
    );
    tasks.push(task);
  });

  return tasks;
}

module.exports = {
  startScheduler
};
