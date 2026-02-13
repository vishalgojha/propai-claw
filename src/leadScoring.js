function scoreLead(lead, messages = []) {
  let score = 0;
  const reasons = [];

  if (lead.intent) {
    score += 2;
    reasons.push("intent provided");
  }
  if (lead.budget) {
    score += 2;
    reasons.push("budget provided");
  }
  if (lead.location) {
    score += 1;
    reasons.push("location provided");
  }
  if (lead.configuration) {
    score += 1;
    reasons.push("configuration provided");
  }
  if (lead.timeline) {
    score += 2;
    reasons.push("timeline provided");
    if (String(lead.timeline).toLowerCase().includes("urgent")) {
      score += 1;
      reasons.push("urgent timeline");
    }
  }

  if (messages.length >= 5) {
    score += 1;
    reasons.push("active conversation");
  }

  let status = "cold";
  if (score >= 6) status = "hot";
  else if (score >= 3) status = "warm";

  return { score, status, reasons };
}

module.exports = {
  scoreLead
};
