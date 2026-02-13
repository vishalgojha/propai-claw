const crypto = require("crypto");
const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const { loadConfig, saveConfig } = require("../../src/configStore");
const { maskToken } = require("../../src/auth");

function getTokenStore(config) {
  const tokens = (config.auth && config.auth.tokens) || {};
  return {
    admin: Array.isArray(tokens.admin) ? tokens.admin : [],
    operator: Array.isArray(tokens.operator) ? tokens.operator : [],
    viewer: Array.isArray(tokens.viewer) ? tokens.viewer : []
  };
}

function generateToken(existing = new Set()) {
  let token = "";
  do {
    token = crypto.randomBytes(16).toString("hex");
  } while (existing.has(token));
  return token;
}

function listTokens(tokens) {
  ["admin", "operator", "viewer"].forEach((role) => {
    console.log(chalk.cyan(role.toUpperCase()));
    if (!tokens[role].length) {
      console.log("  (no tokens)");
      return;
    }
    tokens[role].forEach((token, index) => {
      console.log(`  [${index}] ${maskToken(token)}`);
    });
  });
}

function registerAuth(program) {
  const auth = program.command("auth").description("Manage access tokens");

  auth
    .command("list")
    .description("List masked tokens by role")
    .action(() => {
      const config = loadConfig();
      const tokens = getTokenStore(config);
      listTokens(tokens);
    });

  auth
    .command("create")
    .description("Create a new token for a role")
    .requiredOption("-r, --role <role>", "admin | operator | viewer")
    .option("--token <value>", "Provide a specific token value")
    .action((options) => {
      const role = String(options.role || "").toLowerCase();
      if (!["admin", "operator", "viewer"].includes(role)) {
        console.log(chalk.red("Invalid role. Use admin, operator, or viewer."));
        return;
      }
      const config = loadConfig();
      const tokens = getTokenStore(config);
      const existing = new Set(
        [...tokens.admin, ...tokens.operator, ...tokens.viewer].filter(Boolean)
      );
      const newToken = options.token
        ? String(options.token)
        : generateToken(existing);
      if (existing.has(newToken)) {
        console.log(chalk.red("Token already exists."));
        return;
      }
      tokens[role].push(newToken);
      saveConfig({ auth: { tokens } });
      console.log(
        chalk.green(
          `Created ${role} token. Store securely: ${newToken}`
        )
      );
    });

  auth
    .command("revoke")
    .description("Revoke a token by role + index or value")
    .requiredOption("-r, --role <role>", "admin | operator | viewer")
    .option("-i, --index <index>", "Token index from auth list")
    .option("-t, --token <value>", "Exact token value to revoke")
    .action((options) => {
      const role = String(options.role || "").toLowerCase();
      if (!["admin", "operator", "viewer"].includes(role)) {
        console.log(chalk.red("Invalid role. Use admin, operator, or viewer."));
        return;
      }
      const config = loadConfig();
      const tokens = getTokenStore(config);
      let removed = null;
      if (options.token) {
        const index = tokens[role].indexOf(String(options.token));
        if (index === -1) {
          console.log(chalk.yellow("Token not found."));
          return;
        }
        removed = tokens[role].splice(index, 1)[0];
      } else if (options.index !== undefined) {
        const index = Number(options.index);
        if (!Number.isInteger(index)) {
          console.log(chalk.red("Index must be an integer."));
          return;
        }
        if (index < 0 || index >= tokens[role].length) {
          console.log(chalk.yellow("Token index not found."));
          return;
        }
        removed = tokens[role].splice(index, 1)[0];
      } else {
        console.log(chalk.red("Provide --index or --token to revoke."));
        return;
      }
      saveConfig({ auth: { tokens } });
      console.log(
        chalk.green(`Revoked ${role} token ${maskToken(removed)}.`)
      );
    });
}

module.exports = {
  registerAuth
};
