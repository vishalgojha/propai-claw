const { WORKFLOWS } = require("./workflows");
const { invokeTool } = require("./toolRegistry");
const {
  createWorkflowRun,
  finishWorkflowRun,
  createWorkflowStep,
  finishWorkflowStep
} = require("./workflowStore");

async function runWorkflow(name, input, config, context = {}) {
  const workflow = WORKFLOWS[name];
  if (!workflow) {
    throw new Error(`Workflow not found: ${name}`);
  }

  const runId = await createWorkflowRun({ name, input });
  const results = {};
  let status = "success";
  let errorMessage = null;

  try {
    for (const step of workflow.steps) {
      if (step.when && !step.when(context, results)) {
        continue;
      }

      const stepInput = step.input ? step.input(context, results) : input;
      const retryConfig = step.retry || {};
      const maxAttempts = (retryConfig.retries || 0) + 1;
      let delayMs = retryConfig.delayMs || 0;
      const backoffFactor = retryConfig.backoffFactor || 1;
      let attempt = 0;

      while (attempt < maxAttempts) {
        attempt += 1;
        const inputWithAttempt =
          stepInput && typeof stepInput === "object"
            ? { ...stepInput, _attempt: attempt, _maxAttempts: maxAttempts }
            : { value: stepInput, _attempt: attempt, _maxAttempts: maxAttempts };

        const stepId = await createWorkflowStep({
          workflowRunId: runId,
          stepName: step.name,
          toolName: step.tool || "inline",
          input: inputWithAttempt
        });

        try {
          let output;
          if (step.run) {
            output = await step.run(context, results);
          } else if (step.tool) {
            output = await invokeTool(step.tool, stepInput, config, {
              workflowRunId: runId,
              source: context.source,
              leadId: context.leadId
            });
          } else {
            throw new Error("Step missing tool/run handler");
          }
          results[step.name] = output;
          await finishWorkflowStep({
            id: stepId,
            status: "success",
            output
          });
          break;
        } catch (stepError) {
          await finishWorkflowStep({
            id: stepId,
            status: "error",
            error: stepError.message
          });
          if (attempt >= maxAttempts) {
            throw stepError;
          }
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs = Math.floor(delayMs * backoffFactor);
          }
        }
      }
    }
  } catch (error) {
    status = "error";
    errorMessage = error.message;
  }

  await finishWorkflowRun({
    id: runId,
    status,
    output: results,
    error: errorMessage
  });

  if (status === "error") {
    throw new Error(errorMessage);
  }

  return results;
}

module.exports = {
  runWorkflow
};
