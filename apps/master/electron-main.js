/* eslint-env node */
/**
 * ClickFlash Master OS — Electron Main Process
 *
 * Architecture:
 *  - Dev + Prod: Express on :8090 serves the built frontend.
 *                Renderer always loads via loadURL("http://localhost:8090").
 *                All traffic (UI + API + WebSocket) is unified on a single port.
 *                Use `vite build --watch` during development for incremental rebuilds.
 *
 * Startup sequence:
 *  1. Show loading splash
 *  2. Fork backend (prod: auto-fork; dev: expects `npm run dev:backend` running)
 *  3. Poll /api/health until backend ready (max 60 s)
 *  4. Load renderer via http://localhost:8090
 */

const { app, BrowserWindow, ipcMain, globalShortcut, dialog, protocol, net, session, Tray, Menu, powerSaveBlocker } = require("electron");
const path   = require("path");
const fs     = require("fs");
const http   = require("http");
const crypto = require("crypto");
const { fork, spawn } = require("child_process");

// ─── Auto-Updater (production only) ──────────────────────────────────────────
// initAutoUpdater is compiled from src/main/autoUpdater.ts — not available pre-build.
let initAutoUpdater = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  initAutoUpdater = require('./dist/main/autoUpdater.js').initAutoUpdater;
} catch (_) {
  console.warn('[Main] autoUpdater module not available (run `npm run build:backend` first)');
}

// ─── Protocol Registration ────────────────────────────────────────────────────
// Must be called before app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: "clickflash",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      bypassCSP: true,
    },
  },
]);

// ─── Config ───────────────────────────────────────────────────────────────────

const BACKEND_PORT   = 8090;
const HEALTH_URL     = `http://localhost:${BACKEND_PORT}/api/health`;
const HEALTH_TIMEOUT = 120_000; // ms — first boot runs 90+ migrations
const POLL_INTERVAL  = 300;    // ms between health polls

// Both dev and prod load from the same Express server on port 8090.
// Use `vite build --watch` in dev for incremental rebuilds served by Express.
const APP_URL = `http://localhost:${BACKEND_PORT}`;

const ADMIN_PIN      = process.env.ADMIN_PIN || null;
const DEFAULT_PIN    = "000000";
const ADMIN_SHORTCUT = "CommandOrControl+Alt+Shift+X";

// PIN brute-force protection — track failed attempts in memory
const pinAttempts = { count: 0, lockedUntil: 0 };
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes
// ─── State ────────────────────────────────────────────────────────────────────

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {import("child_process").ChildProcess | null} */
let backendProcess = null;
/** @type {import("child_process").ChildProcess | null} */
let guardianProcess = null;
let isQuitting = false;
/** Power save blocker ID — prevents display sleep during photo sessions. */
let powerSaveId = null;
/** @type {Tray | null} */
let tray = null;

// ─── Backend ──────────────────────────────────────────────────────────────────

function getUnpackedPath(relativePath) {
  // In packaged app, asarUnpack files live in app.asar.unpacked/
  if (app.isPackaged) {
    return path.join(__dirname.replace("app.asar", "app.asar.unpacked"), relativePath);
  }
  return path.join(__dirname, relativePath);
}

function getDataDir() {
  // Resolved as app.getPath('userData') for production portability.
  // Standard Windows path: C:\Users\<User>\AppData\Roaming\ClickFlashMaster
  // This ensures writability even in C:\Program Files installs.
  if (app.isPackaged) {
    return path.join(app.getPath("userData"), "pb_data");
  }
  return path.join(__dirname, "pb_data");
}

/**
 * Start the backend process in packaged mode.
 * Returns a Promise that resolves when backend is forked and ready.
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    if (!app.isPackaged) {
      console.log("[Main] Dev mode — backend expected on port", BACKEND_PORT);
      resolve(null);
      return;
    }

    const serverPath = getUnpackedPath("dist/backend/server.js");
    if (!fs.existsSync(serverPath)) {
      console.error("[Main] Backend bundle not found:", serverPath);
      reject(new Error("Backend bundle not found: " + serverPath));
      return;
    }

    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const appDir = path.dirname(app.getPath("exe"));
    console.log("[Main] Forking backend:", serverPath);
    console.log("[Main] DATA_DIR:", dataDir);
    console.log("[Main] Working dir:", appDir);

    backendProcess = fork(serverPath, [], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", DATA_DIR: dataDir },
      execArgv: ["--max-old-space-size=8192"],
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      cwd: appDir,
    });

    backendProcess.stdout?.on("data", (d) => process.stdout.write("[Backend] " + d));
    backendProcess.stderr?.on("data", (d) => process.stderr.write("[Backend:ERR] " + d));

    backendProcess.on("error", (err) => {
      console.error("[Main] Backend fork error:", err.message);
      reject(err);
    });

    backendProcess.on("exit", (code) => {
      console.warn("[Main] Backend exited (code", code, ")");
      if (!isQuitting) {
        console.log("[Main] Respawning backend in 3 s...");
        setTimeout(() => startBackend().catch(console.error), 3000);
      }
    });

    // Do not resolve until the health check confirms binding
    resolve(null);
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
    fullscreen: app.isPackaged,
    kiosk: app.isPackaged,
    alwaysOnTop: app.isPackaged,
    skipTaskbar: app.isPackaged,
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

  // Load renderer — always from Express on port 8090 (dev + prod unified)
  try {
    console.log("[Main] Loading app via Express:", APP_URL);
    await mainWindow.loadURL(APP_URL);
  } catch (err) {
    console.error("[Main] Failed to load renderer:", err.message);
    // Show a helpful error screen instead of a blank page
    if (mainWindow && !mainWindow.isDestroyed()) {
      var safeMsg = String(err.message || "Unknown error").replace(/[<>&"']/g, "");
      var title = "Failed to Load Application";
      var body = "<p>Error: " + safeMsg + "</p>";
      if (!app.isPackaged && safeMsg.indexOf("ERR_CONNECTION_REFUSED") !== -1) {
        title = "Dev Servers Not Running";
        body = '<p>Start the dev servers first:</p>'
          + '<ol class="steps">'
          + "<li>Open a terminal: <code>cd apps/master</code></li>"
          + "<li>Run: <code>npm run dev:electron</code></li>"
          + "<li>This starts the backend, builds the frontend, then launches Electron</li>"
          + "<li>Or manually: <code>npm run dev:backend</code> + <code>npm run dev:watch</code>, then relaunch</li>"
          + "</ol>";
      }
      var errorHtml = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>"
        + "*{margin:0;padding:0;box-sizing:border-box}"
        + "body{background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;"
        + "height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}"
        + ".wrap{max-width:520px;text-align:center;padding:40px}"
        + "h1{color:#f87171;font-size:22px;margin-bottom:16px}"
        + "p{color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:12px}"
        + "code{background:#1e293b;padding:6px 12px;border-radius:6px;display:inline-block;color:#38bdf8;font-size:13px;margin:4px 0}"
        + ".steps{text-align:left;margin:20px 0;padding:20px;background:#1e293b;border-radius:8px}"
        + ".steps li{margin:8px 0;color:#cbd5e1;font-size:13px}"
        + ".retry{margin-top:20px;padding:10px 24px;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px}"
        + ".retry:hover{background:#0284c7}"
        + "</style></head><body><div class='wrap'>"
        + "<h1>" + title + "</h1>"
        + body
        + "<button class='retry' onclick='window.location.reload()'>Retry</button>"
        + "</div></body></html>";
      await mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(errorHtml));
    }
  }

  spawnGuardian();

  // ── Phase 1-A: Auto-updater ────────────────────────────────────────────────
  // Only runs in packaged production — silently skipped in dev.
  if (app.isPackaged && initAutoUpdater && mainWindow && !mainWindow.isDestroyed()) {
    initAutoUpdater(mainWindow);
    console.log("[Main] Auto-updater initialized");
  }

  // ── Phase 2-C: Power save blocker ─────────────────────────────────────────
  // Prevents the display from sleeping during photo sessions / kiosk idle.
  if (powerSaveId === null) {
    powerSaveId = powerSaveBlocker.start('prevent-display-sleep');
    console.log("[Main] Power save blocker started (id:", powerSaveId, ")");
  }

  console.log("[Main] Window ready");
}

// ─── Security ─────────────────────────────────────────────────────────────────

function setupSecurity(win) {
  const wc = win.webContents;

  function isAllowedUrl(url) {
    if (url.startsWith("file://") || url.startsWith("data:") || url.startsWith("clickflash://")) return true;
    try {
      const { hostname } = new URL(url);
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch (_) { return false; }
  }

  wc.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) {
      console.warn("[Security] Blocked navigation:", url);
      event.preventDefault();
    }
  });

  // Redirects bypass will-navigate — block them too
  wc.on("will-redirect", (event, url) => {
    if (!isAllowedUrl(url)) {
      console.warn("[Security] Blocked redirect:", url);
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
  // Cap auto-reload attempts: 3 crashes within 60s triggers a wait-for-manual-restart screen
  const crashTracker = { count: 0, windowStart: Date.now() };
  const MAX_CRASHES  = 3;
  const CRASH_WINDOW = 60_000;

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[Main] Renderer crashed:", details.reason);

    const now = Date.now();
    if (now - crashTracker.windowStart > CRASH_WINDOW) {
      crashTracker.count = 0;
      crashTracker.windowStart = now;
    }
    crashTracker.count += 1;

    if (crashTracker.count > MAX_CRASHES) {
      console.error(`[Main] Renderer crashed ${crashTracker.count} times — stopping auto-reload`);
      if (!win.isDestroyed()) {
        win.loadURL("data:text/html,<h2 style='font-family:sans-serif;padding:2rem'>ClickFlash encountered a fatal error.<br>Please restart the application.</h2>");
      }
      return;
    }

    setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      if (app.isPackaged && !win.isKiosk()) {
        win.setKiosk(true); win.setFullScreen(true); win.setAlwaysOnTop(true);
      }
      console.log(`[Main] Reloading renderer (attempt ${crashTracker.count}/${MAX_CRASHES})`);
      win.reload();
    }, 2000);
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("[Main] did-fail-load:", code, desc);
  });
  win.on("closed", () => { mainWindow = null; });
}

// ─── Guardian ─────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 of a file synchronously.
 * @param {string} filePath
 * @returns {string} hex digest
 */
function sha256OfFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function spawnGuardian() {
  if (!app.isPackaged) return; // guardian only runs in packaged kiosk mode
  const gPath      = path.join(process.resourcesPath, "helper_scripts", "KioskGuardian.exe");
  const hashPath   = path.join(process.resourcesPath, "helper_scripts", "KioskGuardian.exe.sha256");

  if (!fs.existsSync(gPath)) {
    console.warn("[Main] KioskGuardian.exe not found — OS shortcuts unblocked");
    return;
  }

  // Integrity check: compare actual hash against the sidecar .sha256 file
  if (fs.existsSync(hashPath)) {
    const expectedHash = fs.readFileSync(hashPath, "utf8").trim().toLowerCase();
    const actualHash   = sha256OfFile(gPath);
    if (actualHash !== expectedHash) {
      const msg = `[Main] SECURITY: KioskGuardian.exe hash mismatch!\n  expected: ${expectedHash}\n  actual:   ${actualHash}`;
      console.error(msg);
      dialog.showErrorBox(
        "Security Alert",
        "KioskGuardian.exe has been tampered with. The application will not enter kiosk mode.\nPlease reinstall ClickFlash Master."
      );
      return; // Do NOT spawn a potentially tampered binary
    }
    console.log("[Main] KioskGuardian.exe integrity verified ✓");
  } else {
    console.warn("[Main] KioskGuardian.exe.sha256 not found — skipping integrity check (reinstall recommended)");
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
    // Production requires ADMIN_PIN env; dev falls back to "000000" for convenience
    const expected = ADMIN_PIN || (!app.isPackaged ? "000000" : null);

    if (!expected) {
      console.error("[IPC] kiosk:unlock — ADMIN_PIN env not set; cannot unlock in production");
      return { success: false, error: "Kiosk unlock not configured — set ADMIN_PIN" };
    }

    // Brute-force lockout
    const now = Date.now();
    if (pinAttempts.lockedUntil > now) {
      const secsLeft = Math.ceil((pinAttempts.lockedUntil - now) / 1000);
      console.warn(`[IPC] kiosk:unlock — locked out for ${secsLeft}s`);
      return { success: false, error: `Too many attempts. Try again in ${secsLeft}s` };
    }

    if (typeof pin !== 'string') {
      pin = "";
    }

    let isValid = true;
    if (pin.length !== expected.length) {
      isValid = false;
      // dummy compare to maintain constant time-ish behavior
      const dummy = Buffer.alloc(expected.length);
      require('crypto').timingSafeEqual(dummy, dummy);
    } else {
      const pinBuffer = Buffer.from(pin, 'utf8');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      isValid = require('crypto').timingSafeEqual(pinBuffer, expectedBuffer);
    }

    if (!isValid) {
      pinAttempts.count += 1;
      console.warn(`[IPC] kiosk:unlock — wrong PIN (attempt ${pinAttempts.count}/${PIN_MAX_ATTEMPTS})`);
      if (pinAttempts.count >= PIN_MAX_ATTEMPTS) {
        pinAttempts.lockedUntil = now + PIN_LOCKOUT_MS;
        pinAttempts.count = 0;
        return { success: false, error: "Too many attempts. Locked for 15 minutes" };
      }
      return { success: false, error: "Invalid PIN" };
    }

    // Correct PIN — reset attempt counter
    pinAttempts.count = 0;
    pinAttempts.lockedUntil = 0;

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
    console.log("[Main] Admin shortcut — requesting PIN");
    // Instead of directly unlocking, send a message to the renderer
    // to show the PIN dialog. Only unlock after server-side PIN validation.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("kiosk:show-unlock-dialog");
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
  // Stop power save blocker
  if (powerSaveId !== null && powerSaveBlocker.isStarted(powerSaveId)) {
    powerSaveBlocker.stop(powerSaveId);
    powerSaveId = null;
  }
  // Destroy tray
  try { if (tray && !tray.isDestroyed()) tray.destroy(); } catch (_) {}
  app.quit();
}

// ─── System Tray (Phase 2-B) ──────────────────────────────────────────────────

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'tray-icon.png')
    : path.join(__dirname, 'public', 'favicon.png');

  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show ClickFlash',
        click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } },
      },
      {
        label: 'Lock Kiosk',
        click: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('kiosk:show-unlock-dialog'); },
      },
      { type: 'separator' },
      { label: 'Quit ClickFlash', click: () => shutdown() },
    ]);
    tray.setToolTip('ClickFlash Master OS');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
    console.log('[Main] System tray created');
  } catch (err) {
    // Non-fatal — tray is a convenience feature
    console.warn('[Main] Failed to create system tray:', err.message);
  }
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
  wc.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
});

app.whenReady().then(async () => {
  // ─── Content Security Policy ────────────────────────────────────────────────
  session.defaultSession.setContentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "clickflash://"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:*"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  });

  // ─── Custom Protocol Handler ────────────────────────────────────────────────
  protocol.handle("clickflash", (request) => {
    try {
      const url = new URL(request.url);
      const relativePath = decodeURIComponent(url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname);
      const dataDir = getDataDir();
      
      // Industrial Hardening: Strict path sanitization to prevent directory traversal
      const fullPath = path.normalize(path.join(dataDir, relativePath));
      
      if (!fullPath.startsWith(dataDir)) {
        console.error("[Security] clickflash:// Directory traversal attempt:", fullPath);
        return new Response("Access Denied", { status: 403 });
      }

      if (!fs.existsSync(fullPath)) {
        return new Response("Not Found", { status: 404 });
      }

      return net.fetch("file://" + fullPath);
    } catch (err) {
      console.error("[Protocol] clickflash:// error:", err);
      return new Response("Internal Error", { status: 500 });
    }
  });

  setupShortcuts();
  setupIpc();

  // CRITICAL: Start backend FIRST, then wait for it to be healthy before creating window
  try {
    await startBackend();
    console.log("[Main] Backend process started");
    
    // Wait for backend health in production
    if (app.isPackaged) {
      const backendReady = await waitForBackend();
      if (!backendReady) {
        console.warn("[Main] Backend health check timed out, proceeding anyway...");
      }
    }
  } catch (err) {
    console.error("[Main] Failed to start backend:", err.message);
    dialog.showErrorBox("Backend Error", "Failed to start backend: " + err.message);
  }

  createWindow();
  createTray();
  scheduleBackups();
}).catch((err) => {
  console.error("[Main] Fatal startup error:", err);
  dialog.showErrorBox("Startup Error", String(err));
  app.quit();
});

/**
 * Daily SQLite backup — runs immediately on launch, then every 24 hours.
 * Keeps the last 7 snapshots in DATA_DIR/backup/.
 */
function scheduleBackups() {
  const backupServicePath = app.isPackaged
    ? path.join(getUnpackedPath("dist/backend/main/backupService.js"))
    : path.join(__dirname, "dist/backend/main/backupService.js");

  function runBackup() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BackupService } = require(backupServicePath);
      BackupService.runDailyBackup(getDataDir()).catch((err) => {
        console.error("[Backup] Backup failed:", err);
      });
    } catch (err) {
      // Backup service not compiled yet (first run before build) — skip silently
      console.warn("[Backup] backupService not available:", err.message);
    }
  }

  runBackup(); // Immediate backup on startup
  setInterval(runBackup, 24 * 60 * 60 * 1000); // Then daily
}

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

process.on("unhandledRejection", (reason) => {
  console.error("[Main] Unhandled promise rejection:", reason);
});
