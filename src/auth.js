function resolveRole(token, config) {
  const tokens = (config.auth && config.auth.tokens) || {};
  if (token && tokens.admin && tokens.admin.includes(token)) return "admin";
  if (token && tokens.operator && tokens.operator.includes(token))
    return "operator";
  if (token && tokens.viewer && tokens.viewer.includes(token)) return "viewer";
  return null;
}

function roleRank(role) {
  if (role === "admin") return 3;
  if (role === "operator") return 2;
  if (role === "viewer") return 1;
  return 0;
}

function canExecute(role, requiredRole) {
  if (!requiredRole) return true;
  return roleRank(role) >= roleRank(requiredRole);
}

function maskToken(token) {
  if (!token) return "";
  const text = String(token);
  if (text.length <= 6) return "***";
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

module.exports = {
  resolveRole,
  canExecute,
  maskToken
};
