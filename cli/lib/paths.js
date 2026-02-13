const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const PID_FILE = path.join(DATA_DIR, "propai.pid");
const LOG_FILE = path.join(DATA_DIR, "propai.log");
const STATE_FILE = path.join(DATA_DIR, "propai.state.json");

module.exports = {
  ROOT,
  DATA_DIR,
  PID_FILE,
  LOG_FILE,
  STATE_FILE
};
