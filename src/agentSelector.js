function extractAgentOverride(content) {
  const match = content.match(/@([a-zA-Z0-9_-]+)/);
  return match ? match[1].toLowerCase() : null;
}

function selectAgent(content, config) {
  const agents = config.agents || {};
  const override = extractAgentOverride(content || "");
  if (override && agents[override]) {
    return { id: override, ...agents[override] };
  }

  const lower = (content || "").toLowerCase();
  if (lower.includes("search:")) {
    return { id: "researcher", ...(agents.researcher || agents.default) };
  }
  if (lower.includes("analyze brochure") || lower.includes("brochure:")) {
    return { id: "analyzer", ...(agents.analyzer || agents.default) };
  }
  if (lower.includes("counter") || lower.includes("offer")) {
    return { id: "negotiator", ...(agents.negotiator || agents.default) };
  }
  return { id: "default", ...(agents.default || {}) };
}

module.exports = {
  selectAgent
};
