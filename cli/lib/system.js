const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { loadConfig } = require("../../src/configStore");
const { ROOT, DATA_DIR, PID_FILE, LOG_FILE, STATE_FILE } = require("./paths");

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getPort(override) {
  if (override) return override;
  const config = loadConfig();
  return process.env.PORT || config.app.port || 3000;
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function readPid() {
  const state = readState();
  if (state && Number.isInteger(state.pid)) return state.pid;
  if (!fs.existsSync(PID_FILE)) return null;
  const raw = fs.readFileSync(PID_FILE, "utf8").trim();
  const pid = Number(raw);
  if (!Number.isInteger(pid)) return null;
  return pid;
}

function isRunning(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function writeState({ pid, port }) {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({ pid, port }, null, 2));
  fs.writeFileSync(PID_FILE, String(pid));
}

function clearPid() {
  if (fs.existsSync(PID_FILE)) {
    fs.unlinkSync(PID_FILE);
  }
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

function startServer(portOverride) {
  const port = getPort(portOverride);
  const existingPid = readPid();
  if (existingPid && isRunning(existingPid)) {
    return { started: false, pid: existingPid, port };
  }

  ensureDataDir();
  const out = fs.openSync(LOG_FILE, "a");
  const err = fs.openSync(LOG_FILE, "a");
  const child = spawn(process.execPath, ["src/app.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: port },
    detached: true,
    stdio: ["ignore", out, err]
  });
  child.unref();
  writeState({ pid: child.pid, port });
  return { started: true, pid: child.pid, port };
}

function stopServer() {
  const pid = readPid();
  if (!pid) return { stopped: false, reason: "no_pid" };
  if (!isRunning(pid)) {
    clearPid();
    return { stopped: false, reason: "not_running" };
  }
  process.kill(pid);
  clearPid();
  return { stopped: true, pid };
}

function getStatus() {
  const pid = readPid();
  const running = pid ? isRunning(pid) : false;
  const state = readState();
  const port = state && state.port ? state.port : getPort();
  return { pid, running, port };
}

function readLogs(lines = 200) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const content = fs.readFileSync(LOG_FILE, "utf8");
  const allLines = content.split(/\r?\n/);
  return allLines.slice(Math.max(allLines.length - lines, 0)).join("\n");
}

async function checkHealth(portOverride) {
  const port = getPort(portOverride);
  const url = `http://localhost:${port}/health`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

module.exports = {
  startServer,
  stopServer,
  getStatus,
  readLogs,
  checkHealth,
  getPort
};
