/* eslint-env node */
/**
 * ClickFlash Master OS — Electron Main Process
 *
 * Architecture:
 *  - Dev:  Vite dev server on :5173 (proxies /api to Express on :8090)
 *  - Prod: Express on :8090 serves built frontend from dist/master/
 *
 * Startup sequence:
 *  1. Show loading splash
 *  2. Fork backend (prod only; dev expects `npm run dev:backend` running)
 *  3. Poll /api/health until backend ready (max 60 s)
 *  4. Load renderer (Vite URL in dev, loadFile in prod)
 */

"use strict";

const { app, BrowserWindow, ipcMain, globalShortcut, dialog } = require("electron");
const path   = require("path");
const fs     = require("fs");
const http   = require("http");
const { fork, spawn } = require("child_process");

// ─── Config ───────────────────────────────────────────────────────────────────

const BACKEND_PORT    = 8090;
const VITE_PORT       = 5173;
const HEALTH_URL      = `http://localhost:${BACKEND_PORT}/api/health`;
const HEALTH_TIMEOUT  = 60_000; // ms to wait before giving up
const POLL_INTERVAL   = 300;    // ms between health polls

const DEV_URL   = `http://localhost:${VITE_PORT}`;
const PROD_FILE = path.join(__dirname, "dist/master/index.html");

const ADMIN_PIN      = process.env.ADMIN_PIN || null;
const DEFAULT_PIN    = "000000";
const ADMIN_SHORTCUT = "CommandOrControl+Alt+Shift+X";

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {import("child_process").ChildProcess | null} */
let backendProcess = null;
/** @type {import("child_process").ChildProcess | null} */
let guardianProcess = null;
let isQuitting = false;

// ─── Backend ──────────────────────────────────────────────────────────────────

function startBackend() {
  if (!app.isPackaged) {
    console.log("[Main] Dev mode — start backend separately: npm run dev:backend");
    return;
  }
  const serverPath = path.join(__dirname, "dist/backend/server.js");
  if (!fs.existsSync(serverPath)) {
    console.error("[Main] Backend bundle not found:", serverPath);
    return;
  }
  console.log("[Main] Forking backend:", serverPath);
  backendProcess = fork(serverPath, [], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    execArgv: ["--max-old-space-size=8192"],
  });
  backendProcess.on("error", (err) => console.error("[Main] Backend error:", err.message));
  backendProcess.on("exit", (code) => {
    console.warn("[Main] Backend exited (code", code, ")");
    if (!isQuitting) {
      console.log("[Main] Respawning backend in 3 s...");
      setTimeout(startBackend, 3000);
    }
  });
}

/** Poll /api/health. Resolves true on success, false on timeout. */
function waitForBackend(deadline = Date.now() + HEALTH_TIMEOUT) {
  return new Promise((resolve) => {
    const attempt = () => {
      if (Date.now() >= deadline) {
        console.warn("[Main] Backend health-check timed out — loading UI anyway");
        return resolve(false);
      }
      const req = http.get(HEALTH_URL, (res) => {
        res.resume();
        if (res.statusCode < 500) {
          console.log("[Main] Backend ready");
          return resolve(true);
        }
        setTimeout(attempt, POLL_INTERVAL);
      });
      req.on("error", () => setTimeout(attempt, POLL_INTERVAL));
      req.setTimeout(200, () => { req.destroy(); setTimeout(attempt, POLL_INTERVAL); });
    };
    attempt();
  });
}

// ─── Window ───────────────────────────────────────────────────────────────────

function getPreloadPath() {
  const candidates = [
    path.join(__dirname, "preload.js"),
    path.join(app.getAppPath(), "preload.js"),
    path.join(process.resourcesPath || "", "preload.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  console.error("[Main] preload.js not found — IPC unavailable");
  return candidates[0];
}

async function createWindow() {
  const preload = getPreloadPath();
  console.log("[Main] Preload:", preload);

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: "ClickFlash Master OS",
    icon: path.join(__dirname, "build/icon.ico"),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload,
      devTools: !app.isPackaged,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
  setupSecurity(mainWindow);
  setupWindowEvents(mainWindow);

  // Splash
  const splash = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0f172a;display:flex;align-items:center;justify-content:center;
         height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrap{text-align:center}
    .logo{color:#06b6d4;font-size:26px;font-weight:700;letter-spacing:4px;
          text-transform:uppercase;margin-bottom:28px}
    .spin{width:36px;height:36px;border:3px solid #1e293b;border-top-color:#06b6d4;
          border-radius:50%;animation:s 1s linear infinite;margin:0 auto 20px}
    @keyframes s{to{transform:rotate(360deg)}}
    .msg{color:#64748b;font-size:12px;letter-spacing:2px}
  </style></head><body>
    <div class="wrap">
      <div class="logo">ClickFlash</div>
      <div class="spin"></div>
      <div class="msg" id="m">Initializing...</div>
    </div>
  </body></html>`;

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splash)}`);
  mainWindow.show();
  mainWindow.focus();

  // Wait for backend
  const backendReady = await waitForBackend();
  if (!backendReady && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents
      .executeJavaScript(`document.getElementById('m').textContent='Backend starting\u2026'`)
      .catch(() => {});
  }

  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Load renderer
  try {
    if (!app.isPackaged) {
      console.log("[Main] Loading Vite dev server:", DEV_URL);
      await mainWindow.loadURL(DEV_URL);
    } else if (fs.existsSync(PROD_FILE)) {
      console.log("[Main] Loading production build:", PROD_FILE);
      await mainWindow.loadFile(PROD_FILE);
    } else {
      // Fallback: Express serves the frontend
      const fallback = `http://localhost:${BACKEND_PORT}`;
      console.warn("[Main] dist/master/index.html not found — falling back to", fallback);
      await mainWindow.loadURL(fallback);
    }
  } catch (err) {
    console.error("[Main] Failed to load renderer:", err.message);
  }

  spawnGuardian();
  console.log("[Main] Window ready");
}

// ─── Security ─────────────────────────────────────────────────────────────────

function setupSecurity(win) {
  const wc = win.webContents;

  wc.on("will-navigate", (event, url) => {
    let allowed = url.startsWith("file://") || url.startsWith("data:");
    if (!allowed) {
      try {
        const { hostname } = new URL(url);
        allowed = hostname === "localhost" || hostname === "127.0.0.1";
      } catch (_) {}
    }
    if (!allowed) {
      console.warn("[Security] Blocked navigation:", url);
      event.preventDefault();
    }
  });

  wc.setWindowOpenHandler(({ url }) => {
    console.warn("[Security] Blocked new window:", url);
    return { action: "deny" };
  });

  wc.on("context-menu", (e) => e.preventDefault());

  wc.on("before-input-event", (event, input) => {
    const k = input.key.toLowerCase();
    if (/^f(1[0-2]|[1-9])$/.test(k)) { event.preventDefault(); return; }
    if (input.control && ["i", "r", "u", "=", "-", "0"].includes(k)) {
      event.preventDefault(); return;
    }
    if (input.alt && k === "f4") event.preventDefault();
  });
}

function setupWindowEvents(win) {
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[Main] Renderer crashed:", details.reason, "— recovering");
    setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      if (!win.isKiosk()) { win.setKiosk(true); win.setFullScreen(true); win.setAlwaysOnTop(true); }
      win.reload();
    }, 2000);
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("[Main] did-fail-load:", code, desc);
  });
  win.on("closed", () => { mainWindow = null; });
}

// ─── Guardian ─────────────────────────────────────────────────────────────────

function spawnGuardian() {
  const gPath = path.join(__dirname, "KioskGuardian.exe");
  if (!fs.existsSync(gPath)) {
    console.warn("[Main] KioskGuardian.exe not found — OS shortcuts unblocked");
    return;
  }
  guardianProcess = spawn(gPath, [], { detached: false });
  guardianProcess.on("error", (err) => console.error("[Main] Guardian error:", err.message));
  guardianProcess.on("exit", () => {
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed() && mainWindow.isKiosk()) {
      console.warn("[Main] Guardian exited — respawning in 1 s");
      setTimeout(spawnGuardian, 1000);
    }
  });
  console.log("[Main] KioskGuardian spawned");
}

function killGuardian() {
  if (guardianProcess && !guardianProcess.killed) {
    guardianProcess.kill();
    guardianProcess = null;
  }
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

function setupIpc() {
  ipcMain.handle("kiosk:unlock", (_e, pin) => {
    // In production require ADMIN_PIN env; block default PIN
    const expected = ADMIN_PIN && ADMIN_PIN !== DEFAULT_PIN
      ? ADMIN_PIN
      : (!app.isPackaged ? DEFAULT_PIN : null);

    if (!expected) {
      console.error("[IPC] kiosk:unlock — set ADMIN_PIN env before deploying");
      return { success: false, error: "Kiosk unlock not configured" };
    }
    if (pin !== expected) return { success: false, error: "Invalid PIN" };

    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);
      killGuardian();
    }
    return { success: true };
  });

  ipcMain.handle("kiosk:lock", () => {
    if (mainWindow) {
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
      mainWindow.setAlwaysOnTop(true);
      spawnGuardian();
    }
    return { success: true };
  });

  ipcMain.handle("dialog:openDirectory", async (_e, opts) => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: opts?.title || "Select Folder",
      buttonLabel: opts?.buttonLabel || "Select",
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle("dialog:openFile", async (_e, opts) => {
    if (!mainWindow) return null;
    const props = opts?.multiple ? ["openFile", "multiSelections"] : ["openFile"];
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: props,
      title: opts?.title || "Select File",
      filters: opts?.filters,
    });
    if (canceled) return null;
    return opts?.multiple ? filePaths : filePaths[0];
  });

  ipcMain.handle("dialog:saveFile", async (_e, opts) => {
    if (!mainWindow) return null;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: opts?.title || "Save File",
      filters: opts?.filters,
      defaultPath: opts?.defaultPath,
    });
    return canceled ? null : filePath;
  });
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────

function setupShortcuts() {
  globalShortcut.register(ADMIN_SHORTCUT, () => {
    console.log("[Main] Admin breakout");
    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);
      killGuardian();
    }
  });

  const toBlock = ["Alt+Tab", "Alt+F4", "Escape",
    "Super", "Super+D", "Super+Tab", "Super+L", "Super+E"];
  for (const sc of toBlock) {
    try { globalShortcut.register(sc, () => false); } catch (_) { /* unsupported */ }
  }
}

// ─── Shutdown ─────────────────────────────────────────────────────────────────

function shutdown() {
  if (isQuitting) return;
  isQuitting = true;
  globalShortcut.unregisterAll();
  killGuardian();
  if (backendProcess && !backendProcess.killed) backendProcess.kill();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  app.quit();
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

app.on("web-contents-created", (_e, wc) => {
  wc.setWindowOpenHandler(() => ({ action: "deny" }));
});

app.whenReady().then(() => {
  setupShortcuts();
  setupIpc();
  startBackend();
  createWindow();
}).catch((err) => {
  console.error("[Main] Fatal startup error:", err);
  dialog.showErrorBox("Startup Error", String(err));
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") shutdown();
});

app.on("before-quit", shutdown);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

process.on("uncaughtException", (err) => {
  console.error("[Main] Uncaught exception:", err);
  shutdown();
});
