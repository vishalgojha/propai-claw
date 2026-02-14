const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  shell
} = require("electron");

const APP_TITLE = "PropAI Deal OS";
const BACKEND_PORT = 1310;
const UI_PORT = 3001;
const BACKEND_BASE_URL = `http://localhost:${BACKEND_PORT}`;
const UI_BASE_URL = `http://localhost:${UI_PORT}`;
const APP_ROOT = path.resolve(__dirname, "..");
const BACKEND_ENTRY = path.join(APP_ROOT, "src", "app.js");
const WEB_DIST_DIR = path.join(APP_ROOT, "web", "dist");

const status = {
  backendStarted: false,
  whatsappConnected: false,
  aiProviderConfigured: false,
  systemReady: false,
  configured: false,
  criticalIssues: [],
  backendError: null,
  whatsappError: null
};

let runtimePaths = null;
let backendProcess = null;
let backendLogStream = null;
let uiServer = null;
let statusTimer = null;
let splashWindow = null;
let mainWindow = null;
let onboardingWindow = null;
let isQuitting = false;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function mergeObjects(target, source) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key])
    ) {
      out[key] = mergeObjects(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function getRuntimePaths() {
  const userData = app.getPath("userData");
  return {
    userData,
    configPath: path.join(userData, "config.local.json"),
    dataDir: path.join(userData, "data"),
    logsDir: path.join(userData, "logs"),
    backendLogPath: path.join(userData, "logs", "backend.log"),
    whatsappDir: path.join(userData, "whatsapp-session"),
    authDir: path.join(userData, "auth")
  };
}

function ensureRuntimeConfig(paths) {
  // Keep user config in Electron's userData so packaged apps are portable and persistent.
  const templatePath = path.join(APP_ROOT, "config.local.json");
  const template = readJson(templatePath, {});
  const current = readJson(paths.configPath, {});
  const merged = mergeObjects(template, current);

  merged.app = merged.app || {};
  merged.app.port = BACKEND_PORT;
  merged.storage = merged.storage || {};
  merged.storage.dbPath = path.join(paths.dataDir, "propai.db");
  merged.onboarding = merged.onboarding || {};
  merged.onboarding.webEnabled = true;
  merged.gmail = merged.gmail || {};
  if (!merged.gmail.credentialsPath) {
    merged.gmail.credentialsPath = path.join(paths.authDir, "gmail_credentials.json");
  }
  if (!merged.gmail.tokenPath) {
    merged.gmail.tokenPath = path.join(paths.authDir, "gmail_token.json");
  }

  writeJson(paths.configPath, merged);
}

function statusBroadcastTargets() {
  return [mainWindow, onboardingWindow].filter(
    (windowRef) => windowRef && !windowRef.isDestroyed()
  );
}

function broadcastStatus() {
  for (const windowRef of statusBroadcastTargets()) {
    windowRef.webContents.send("propai:status", status);
  }
}

function updateStatus(patch) {
  Object.assign(status, patch || {});
  broadcastStatus();
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 300,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    show: true,
    backgroundColor: "#0b0e12"
  });
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function closeSplash() {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.close();
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    title: APP_TITLE,
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    show: false,
    backgroundColor: "#0b0e12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.on("close", (event) => {
    if (process.platform === "darwin" && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.loadURL(UI_BASE_URL);
  mainWindow.once("ready-to-show", () => {
    closeSplash();
    mainWindow.show();
  });

  return mainWindow;
}

function createOnboardingWindow() {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.focus();
    return onboardingWindow;
  }

  onboardingWindow = new BrowserWindow({
    title: `${APP_TITLE} - Onboarding`,
    width: 960,
    height: 760,
    minWidth: 860,
    minHeight: 640,
    show: true,
    backgroundColor: "#111827",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  onboardingWindow.loadURL(`${BACKEND_BASE_URL}/onboard`);
  onboardingWindow.on("closed", () => {
    onboardingWindow = null;
  });

  return onboardingWindow;
}

function closeOnboardingWindow() {
  if (!onboardingWindow || onboardingWindow.isDestroyed()) return;
  onboardingWindow.close();
}

function createMenu() {
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        {
          label: "Open Logs",
          click: () => {
            openLogsInFolder();
          }
        },
        {
          label: "Reset App",
          click: async () => {
            await resetAppData();
          }
        },
        {
          label: "Clear WhatsApp Session",
          click: async () => {
            await clearWhatsAppSession();
          }
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload UI",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            dialog.showMessageBox({
              type: "info",
              title: "About PropAI Deal OS",
              message: APP_TITLE,
              detail:
                "Desktop operator console for PropAI-Claw.\nIncludes backend runtime, UI command center, and WhatsApp/Gmail integrations."
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

async function waitForBackendReady(timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/health`);
      if (response.ok) {
        return;
      }
    } catch (_) {
      // Backend still warming up.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    "Backend did not become healthy in time. Check logs from File -> Open Logs."
  );
}

function startBackend() {
  if (backendProcess) return;

  // Backend logs are kept in userData so operators can inspect runtime issues from the menu.
  ensureDir(runtimePaths.logsDir);
  backendLogStream = fs.createWriteStream(runtimePaths.backendLogPath, {
    flags: "a"
  });

  backendProcess = spawn(process.execPath, [BACKEND_ENTRY], {
    // Run backend as a child Node process from Electron using ELECTRON_RUN_AS_NODE.
    cwd: runtimePaths.userData,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(BACKEND_PORT),
      PROPAI_CONFIG_PATH: runtimePaths.configPath,
      PROPAI_WHATSAPP_DATA_DIR: runtimePaths.whatsappDir
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  backendProcess.stdout.pipe(backendLogStream);
  backendProcess.stderr.pipe(backendLogStream);

  backendProcess.on("error", (error) => {
    const message = `Failed to start backend: ${error.message}`;
    updateStatus({
      backendStarted: false,
      systemReady: false,
      backendError: message
    });
    dialog.showErrorBox(APP_TITLE, message);
  });

  backendProcess.on("exit", (code, signal) => {
    if (isQuitting) return;
    const message = `Backend exited unexpectedly (code: ${
      code == null ? "none" : code
    }, signal: ${signal || "none"}).`;
    updateStatus({
      backendStarted: false,
      systemReady: false,
      backendError: message
    });
    dialog.showErrorBox(APP_TITLE, `${message}\n\nCheck logs for details.`);
  });

  updateStatus({ backendStarted: true, backendError: null });
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backendProcess) {
      if (backendLogStream) {
        backendLogStream.end();
        backendLogStream = null;
      }
      resolve();
      return;
    }

    const processRef = backendProcess;
    backendProcess = null;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (backendLogStream) {
        backendLogStream.end();
        backendLogStream = null;
      }
      resolve();
    };

    processRef.once("exit", finish);
    try {
      processRef.kill();
    } catch (_) {
      finish();
      return;
    }

    setTimeout(() => {
      try {
        processRef.kill("SIGKILL");
      } catch (_) {
        // Already exited.
      }
      finish();
    }, 5000);
  });
}

async function startUiServer() {
  const indexPath = path.join(WEB_DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      "UI build not found at web/dist. Run `npm run build:web` before launching Electron."
    );
  }

  // UI server hosts the built React app at localhost:3001 and proxies API calls to backend.
  const serverApp = express();
  const proxy = createProxyMiddleware({
    target: BACKEND_BASE_URL,
    changeOrigin: true,
    ws: true
  });

  serverApp.use(
    ["/api", "/chat", "/health", "/dashboard", "/onboard", "/gmail"],
    proxy
  );
  serverApp.use(express.static(WEB_DIST_DIR));
  serverApp.get("*", (_req, res) => {
    res.sendFile(indexPath);
  });

  await new Promise((resolve, reject) => {
    uiServer = serverApp
      .listen(UI_PORT, "127.0.0.1", resolve)
      .on("error", reject);
  });
}

function stopUiServer() {
  return new Promise((resolve) => {
    if (!uiServer) {
      resolve();
      return;
    }
    uiServer.close(() => {
      uiServer = null;
      resolve();
    });
  });
}

async function fetchSystemStatus() {
  const response = await fetch(`${BACKEND_BASE_URL}/api/system/status`);
  if (!response.ok) {
    throw new Error(`Status endpoint failed: ${response.status}`);
  }
  return response.json();
}

async function refreshSystemStatus() {
  try {
    const next = await fetchSystemStatus();
    updateStatus({
      backendStarted: true,
      configured: Boolean(next.configured),
      aiProviderConfigured: Boolean(next.aiProviderConfigured),
      whatsappConnected: Boolean(next.whatsappConnected),
      systemReady: Boolean(next.systemReady),
      criticalIssues: Array.isArray(next.criticalIssues)
        ? next.criticalIssues
        : [],
      whatsappError: next.whatsappError || null,
      backendError: null
    });

    // First-run onboarding stays inside Electron by opening backend /onboard in a BrowserWindow.
    if (!next.configured) {
      closeSplash();
      createOnboardingWindow();
      return;
    }

    closeOnboardingWindow();
    createMainWindow();
  } catch (error) {
    updateStatus({
      systemReady: false,
      backendError: error.message
    });
  }
}

function startStatusPolling() {
  if (statusTimer) return;
  statusTimer = setInterval(() => {
    refreshSystemStatus().catch(() => {});
  }, 3000);
}

function stopStatusPolling() {
  if (!statusTimer) return;
  clearInterval(statusTimer);
  statusTimer = null;
}

function openLogsInFolder() {
  ensureDir(runtimePaths.logsDir);
  if (!fs.existsSync(runtimePaths.backendLogPath)) {
    fs.writeFileSync(runtimePaths.backendLogPath, "");
  }
  shell.showItemInFolder(runtimePaths.backendLogPath);
}

async function relaunchAfterCleanup() {
  app.relaunch();
  isQuitting = true;
  app.exit(0);
}

async function resetAppData() {
  const result = await dialog.showMessageBox({
    type: "warning",
    title: APP_TITLE,
    message: "Reset application data?",
    detail:
      "This will remove local config, database, logs, and WhatsApp session files.",
    buttons: ["Cancel", "Reset"],
    defaultId: 0,
    cancelId: 0
  });
  if (result.response !== 1) return;

  stopStatusPolling();
  await stopUiServer();
  await stopBackend();

  const removePaths = [
    runtimePaths.configPath,
    runtimePaths.dataDir,
    runtimePaths.logsDir,
    runtimePaths.whatsappDir,
    runtimePaths.authDir
  ];
  for (const targetPath of removePaths) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } catch (_) {
      // Continue cleanup best effort.
    }
  }
  await relaunchAfterCleanup();
}

async function clearWhatsAppSession() {
  const result = await dialog.showMessageBox({
    type: "warning",
    title: APP_TITLE,
    message: "Clear WhatsApp session?",
    detail:
      "This removes WhatsApp local auth files. You will need to scan QR again.",
    buttons: ["Cancel", "Clear Session"],
    defaultId: 0,
    cancelId: 0
  });
  if (result.response !== 1) return;

  stopStatusPolling();
  await stopUiServer();
  await stopBackend();
  try {
    fs.rmSync(runtimePaths.whatsappDir, { recursive: true, force: true });
  } catch (_) {
    // Continue regardless.
  }
  await relaunchAfterCleanup();
}

async function shutdownRuntime() {
  stopStatusPolling();
  await stopUiServer();
  await stopBackend();
}

function registerIpc() {
  ipcMain.handle("propai:get-status", async () => status);
  ipcMain.handle("propai:open-logs", async () => {
    openLogsInFolder();
    return { ok: true };
  });
}

async function bootstrap() {
  runtimePaths = getRuntimePaths();
  ensureDir(runtimePaths.dataDir);
  ensureDir(runtimePaths.logsDir);
  ensureDir(runtimePaths.whatsappDir);
  ensureRuntimeConfig(runtimePaths);

  createMenu();
  createSplashWindow();
  registerIpc();

  try {
    startBackend();
    await waitForBackendReady();
    await startUiServer();
    await refreshSystemStatus();
    startStatusPolling();
  } catch (error) {
    updateStatus({
      backendStarted: false,
      systemReady: false,
      backendError: error.message
    });
    dialog.showErrorBox(APP_TITLE, error.message);
    closeSplash();
  }
}

app.whenReady().then(bootstrap);

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuitting = true;
    app.quit();
  }
});

app.on("activate", () => {
  if (!mainWindow && status.configured) {
    createMainWindow();
  }
  if (!status.configured) {
    createOnboardingWindow();
  }
});

app.on("quit", () => {
  shutdownRuntime().catch(() => {});
});
