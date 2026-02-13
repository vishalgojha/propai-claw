function normalizeEvent(payload) {
  const source = payload.source || "web";
  const context = payload.context || {};

  let leadKey = payload.leadKey;
  if (!leadKey && context.lead_id) leadKey = `lead:${context.lead_id}`;
  if (!leadKey && context.phone) leadKey = `phone:${context.phone}`;
  if (!leadKey && context.email) leadKey = `email:${context.email}`;
  if (!leadKey && context.whatsapp && context.whatsapp.from) {
    leadKey = `wa:${context.whatsapp.from}`;
  }
  if (!leadKey && context.sessionId) leadKey = `session:${context.sessionId}`;
  if (!leadKey) leadKey = `${source}:${Date.now()}`;

  return {
    source,
    content: payload.content || "",
    context,
    leadKey,
    timestamp: payload.timestamp || new Date().toISOString()
  };
}

module.exports = {
  normalizeEvent
};
