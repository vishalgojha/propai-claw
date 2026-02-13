const chalkImport = require("chalk");
const chalk = chalkImport.default || chalkImport;
const {
  startServer,
  stopServer,
  getStatus,
  readLogs,
  checkHealth
} = require("../lib/system");

function registerSystem(program) {
  program
    .command("start")
    .description("Start the PropAI server")
    .option("-p, --port <port>", "Override port")
    .action((options) => {
      const port = options.port ? Number(options.port) : undefined;
      const result = startServer(port);
      if (result.started) {
        console.log(
          chalk.green(
            `Started on port ${result.port} (pid ${result.pid}).`
          )
        );
      } else {
        console.log(
          chalk.yellow(
            `Already running on port ${result.port} (pid ${result.pid}).`
          )
        );
      }
    });

  program
    .command("stop")
    .description("Stop the PropAI server")
    .action(() => {
      const result = stopServer();
      if (result.stopped) {
        console.log(chalk.green(`Stopped (pid ${result.pid}).`));
        return;
      }
      if (result.reason === "no_pid") {
        console.log(chalk.yellow("Not running (pid file missing)."));
        return;
      }
      console.log(chalk.yellow("Not running (stale pid file removed)."));
    });

  program
    .command("restart")
    .description("Restart the PropAI server")
    .action(() => {
      stopServer();
      const result = startServer();
      console.log(
        chalk.green(`Started on port ${result.port} (pid ${result.pid}).`)
      );
    });

  program
    .command("status")
    .description("Show server status")
    .action(() => {
      const status = getStatus();
      if (status.running) {
        console.log(
          chalk.green(`Running on port ${status.port} (pid ${status.pid}).`)
        );
        return;
      }
      console.log(chalk.yellow("Not running."));
    });

  program
    .command("logs")
    .description("Show recent logs")
    .option("-n, --lines <count>", "Number of lines", "200")
    .action((options) => {
      const lines = Number(options.lines) || 200;
      const content = readLogs(lines);
      if (!content) {
        console.log(chalk.yellow("No logs found."));
        return;
      }
      console.log(content);
    });

  program
    .command("health")
    .description("Run /health check")
    .option("-p, --port <port>", "Override port")
    .action(async (options) => {
      const port = options.port ? Number(options.port) : undefined;
      const result = await checkHealth(port);
      console.log(chalk.green(`Health: ${JSON.stringify(result)}`));
    });
}

module.exports = {
  registerSystem
};
