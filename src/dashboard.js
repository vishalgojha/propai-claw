function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLeadRow(lead) {
  return `<tr>
    <td>${lead.id}</td>
    <td>${escapeHtml(lead.lead_name || "-")}</td>
    <td>${escapeHtml(lead.phone || "-")}</td>
    <td>${escapeHtml(lead.intent || "-")}</td>
    <td>${escapeHtml(lead.budget || "-")}</td>
    <td>${escapeHtml(lead.location || "-")}</td>
    <td>${escapeHtml(lead.status || "-")}</td>
    <td>${escapeHtml(lead.last_message_at || "-")}</td>
    <td><a href="/dashboard/leads/${lead.id}">View</a></td>
  </tr>`;
}

function renderDashboard(leads) {
  const rows = leads.map(renderLeadRow).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PropAI-Claw Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f6f6f6; margin: 0; padding: 30px; }
    h1 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 14px; }
    th { background: #f0f0f0; }
    .card { background: #fff; padding: 18px; border-radius: 10px; box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
  </style>
</head>
<body>
  <div class="card">
    <h1>PropAI-Claw Leads</h1>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Phone</th>
          <th>Intent</th>
          <th>Budget</th>
          <th>Location</th>
          <th>Status</th>
          <th>Last Message</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="9">No leads yet.</td></tr>`}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function renderLeadDetail(lead, messages) {
  const messageRows = messages
    .map(
      (message) => `<tr>
        <td>${escapeHtml(message.created_at)}</td>
        <td>${escapeHtml(message.direction)}</td>
        <td>${escapeHtml(message.content)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lead ${lead.id}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f6f6f6; margin: 0; padding: 30px; }
    h1 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 14px; }
    th { background: #f0f0f0; }
    .card { background: #fff; padding: 18px; border-radius: 10px; box-shadow: 0 6px 16px rgba(0,0,0,0.06); margin-bottom: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <a href="/dashboard">Back</a>
    <h1>Lead ${lead.id}</h1>
    <p><strong>Name:</strong> ${escapeHtml(lead.lead_name || "-")}</p>
    <p><strong>Phone:</strong> ${escapeHtml(lead.phone || "-")}</p>
    <p><strong>Intent:</strong> ${escapeHtml(lead.intent || "-")}</p>
    <p><strong>Budget:</strong> ${escapeHtml(lead.budget || "-")}</p>
    <p><strong>Location:</strong> ${escapeHtml(lead.location || "-")}</p>
    <p><strong>Configuration:</strong> ${escapeHtml(lead.configuration || "-")}</p>
    <p><strong>Timeline:</strong> ${escapeHtml(lead.timeline || "-")}</p>
    <p><strong>Status:</strong> ${escapeHtml(lead.status || "-")}</p>
  </div>

  <div class="card">
    <h2>Messages</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Direction</th>
          <th>Content</th>
        </tr>
      </thead>
      <tbody>
        ${messageRows || `<tr><td colspan="3">No messages yet.</td></tr>`}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

module.exports = {
  renderDashboard,
  renderLeadDetail
};
