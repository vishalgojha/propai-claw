const { listLeadsNeedingFollowup, getLeadById } = require("./leadStore");

function buildFollowupPrompt(lead) {
  return `Draft a concise follow-up message for this real estate lead.\n` +
    `Lead:\n` +
    `Name: ${lead.lead_name || "-"}\n` +
    `Intent: ${lead.intent || "-"}\n` +
    `Budget: ${lead.budget || "-"}\n` +
    `Location: ${lead.location || "-"}\n` +
    `Timeline: ${lead.timeline || "-"}\n` +
    `Keep it professional and ask one clarifying question.`;
}

const WORKFLOWS = {
  lead_followup_scan: {
    name: "lead_followup_scan",
    description: "Scan for leads needing follow-up and draft messages",
    steps: [
      {
        name: "find_leads",
        retry: { retries: 2, delayMs: 500, backoffFactor: 2 },
        run: async (context) => {
          const leads = await listLeadsNeedingFollowup(
            context.followupHours || 48
          );
          return { leads };
        }
      }
    ]
  },
  lead_followup: {
    name: "lead_followup",
    description: "Generate follow-up draft for a specific lead",
    steps: [
      {
        name: "load_lead",
        run: async (context) => {
          const lead = await getLeadById(context.leadId);
          if (!lead) {
            throw new Error("Lead not found");
          }
          return { lead };
        }
      },
      {
        name: "compose_followup",
        tool: "ai_generate",
        retry: { retries: 2, delayMs: 800, backoffFactor: 2 },
        input: (context, stepResults) => {
          const lead = stepResults.load_lead.lead;
          return {
            prompt: buildFollowupPrompt(lead),
            systemPrompt: "You write follow-up messages for real estate leads."
          };
        }
      },
      {
        name: "save_followup",
        tool: "lead_update",
        retry: { retries: 1, delayMs: 300, backoffFactor: 2 },
        input: (context, stepResults) => {
          const lead = stepResults.load_lead.lead;
          const draft = stepResults.compose_followup.text;
          const notes = lead.notes
            ? `${lead.notes}\n\nFollow-up draft:\n${draft}`
            : `Follow-up draft:\n${draft}`;
          return {
            leadId: lead.id,
            fields: { notes }
          };
        }
      }
    ]
  }
};

module.exports = {
  WORKFLOWS
};
