/**
 * ClickFlash Master OS — Electron Main Process
 *
 * Phase 4-A: TypeScript migration of electron-main.js
 *
 * Architecture:
 *  - Dev + Prod: Express on :8090 serves the built frontend.
 *                Renderer always loads via loadURL("http://localhost:8090").
 *                All traffic (UI + API + WebSocket) is unified on a single port.
 *
 * Startup sequence:
 *  1. Show loading splash
 *  2. Fork backend (prod: auto-fork; dev: expects `npm run dev:backend` running)
 *  3. Poll /api/health until backend ready (max 60 s)
 *  4. Load renderer via http://localhost:8090
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  dialog,
  protocol,
  net,
  session,
  Tray,
  Menu,
  powerSaveBlocker,
  IpcMainInvokeEvent,
} from "electron";
import path from "path";
import fs from "fs";
import http from "http";
import crypto from "crypto";
import { fork, spawn, ChildProcess } from "child_process";

// ─── Auto-Updater (production only) ──────────────────────────────────────────
// initAutoUpdater is compiled from src/main/autoUpdater.ts — not available pre-build.
let initAutoUpdater: ((win: BrowserWindow) => void) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  initAutoUpdater = require("./dist/main/autoUpdater.js").initAutoUpdater as (win: BrowserWindow) => void;
} catch (_) {
  console.warn("[Main] autoUpdater module not available (run `npm run build:backend` first)");
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

const APP_URL = `http://localhost:${BACKEND_PORT}`;

const ADMIN_PIN: string | null    = process.env.ADMIN_PIN ?? null;
const ADMIN_SHORTCUT              = "CommandOrControl+Alt+Shift+X";

// PIN brute-force protection
const pinAttempts = { count: 0, lockedUntil: 0 };
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS   = 15 * 60 * 1000;

// ─── State ────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null   = null;
let backendProcess: ChildProcess | null = null;
let guardianProcess: ChildProcess | null = null;
let isQuitting = false;
let powerSaveId: number | null = null;
let tray: Tray | null = null;

// ─── Backend ──────────────────────────────────────────────────────────────────

function getUnpackedPath(relativePath: string): string {
  if (app.isPackaged) {
    // In packaged app, __dirname is inside app.asar/dist/electron
    // We need to go to app.asar.unpacked for native modules
    // The backend is unpacked to app.asar.unpacked/dist/backend
    const unpackedDir = path.join(process.resourcesPath, "app.asar.unpacked", "dist");
    return path.join(unpackedDir, relativePath);
  }
  // In dev, backend is built to dist/backend relative to project root
  return path.join(process.cwd(), "dist", relativePath);
}

function getDataDir(): string {
  if (app.isPackaged) {
    return path.join(app.getPath("userData"), "pb_data");
  }
  return path.join(__dirname, "pb_data");
}

function checkHealthOnce(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(500, () => { req.destroy(); resolve(false); });
  });
}

function waitForBackendHealth(deadline = Date.now() + HEALTH_TIMEOUT): Promise<boolean> {
  return new Promise((resolve) => {
    const attempt = () => {
      if (Date.now() >= deadline) {
        console.warn("[Main] Backend health-check timed out — loading UI anyway");
        return resolve(false);
      }
      const req = http.get(HEALTH_URL, (res) => {
        res.resume();
        if ((res.statusCode ?? 500) < 500) {
          console.log("[Main] Backend ready (health check passed)");
          return resolve(true);
        }
        setTimeout(attempt, POLL_INTERVAL);
      });
      req.on("error", () => setTimeout(attempt, POLL_INTERVAL));
      req.setTimeout(300, () => { req.destroy(); setTimeout(attempt, POLL_INTERVAL); });
    };
    attempt();
  });
}

async function startBackend(): Promise<boolean> {
  const isAlreadyRunning = await checkHealthOnce();
  if (isAlreadyRunning) {
    console.log("[Main] Backend already running on port", BACKEND_PORT);
    return true;
  }

  return new Promise((resolve, reject) => {
    let serverPath = getUnpackedPath("backend/server.js");
    if (!app.isPackaged) {
      const devCandidates = [
        path.join(process.cwd(), "dist/backend/server.js"),
        path.join(__dirname, "backend/server.js"),
        path.join(app.getAppPath(), "dist/backend/server.js"),
      ];
      const found = devCandidates.find((p) => fs.existsSync(p));
      if (found) {
        serverPath = found;
      } else {
        console.log("[Main] Dev mode — waiting for dev backend on port", BACKEND_PORT);
        waitForBackendHealth().then(resolve);
        return;
      }
    }

    console.log("[Main] Resolved backend path:", serverPath);
    console.log("[Main] __dirname:", __dirname);
    console.log("[Main] process.resourcesPath:", process.resourcesPath);
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

    const backendEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      DATA_DIR: dataDir,
      NODE_ENV: app.isPackaged ? "production" : (process.env.NODE_ENV ?? "development"),
    };

    backendProcess = fork(serverPath, [], {
      env: backendEnv,
      execArgv: ["--max-old-space-size=8192"],
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      cwd: app.isPackaged ? appDir : process.cwd(),
    });

    backendProcess.stdout?.on("data", (d: Buffer) => process.stdout.write("[Backend] " + d));
    backendProcess.stderr?.on("data", (d: Buffer) => process.stderr.write("[Backend:ERR] " + d));

    let resolved = false;
    const finish = (ok: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(ok);
      }
    };

    backendProcess.on("error", (err: Error) => {
      console.error("[Main] Backend fork error:", err.message);
      if (!resolved) reject(err);
    });

    backendProcess.on("exit", (code: number | null) => {
      console.warn("[Main] Backend exited (code", code, ")");
      if (!isQuitting) {
        console.log("[Main] Respawning backend in 3 s...");
        setTimeout(() => startBackend().catch(console.error), 3000);
      }
    });

    backendProcess.on("message", (msg: any) => {
      if (msg && msg.type === "server-ready") {
        console.log("[Main] Received server-ready IPC from backend");
        finish(true);
      } else if (msg && msg.type === "server-error") {
        console.error("[Main] Backend reported error:", msg.error);
        if (msg.error === "EADDRINUSE") {
          if (!resolved) reject(new Error("EADDRINUSE"));
        }
      }
    });

    waitForBackendHealth().then((ok) => finish(ok));
  });
}

// ─── Window ───────────────────────────────────────────────────────────────────

function getPreloadPath(): string {
  const candidates = [
    path.join(__dirname, "preload.js"),
    path.join(app.getAppPath(), "preload.js"),
    path.join(process.resourcesPath ?? "", "preload.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  console.error("[Main] preload.js not found — IPC unavailable");
  return candidates[0];
}

async function createWindow(): Promise<void> {
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

  // If in packaged mode, startBackend() already waited for the server-ready IPC.
  // In dev mode, it already polled the endpoint.
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents
      .executeJavaScript(`document.getElementById('m').textContent='Loading app...'`)
      .catch(() => {});
  }

  if (!mainWindow || mainWindow.isDestroyed()) return;

  try {
    if ((global as any).backendError === "EADDRINUSE") {
      await mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;text-align:center;">
            <h1>Port Conflict Detected</h1>
            <p style="font-size:1.2rem;">Another application or instance is already using port 8090.</p>
            <p>Please close any other running ClickFlash instances and restart.</p>
          </body>
        </html>
      `);
      return;
    }

    console.log("[Main] Loading app via Express:", APP_URL);
    await mainWindow.loadURL(APP_URL);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[Main] Failed to load renderer:", error.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      const safeMsg = error.message.replace(/[<>&"']/g, "");
      let title = "Failed to Load Application";
      let body  = `<p>Error: ${safeMsg}</p>`;
      if (!app.isPackaged && safeMsg.includes("ERR_CONNECTION_REFUSED")) {
        title = "Dev Servers Not Running";
        body  = '<p>Start the dev servers first:</p>'
          + '<ol class="steps">'
          + "<li>Open a terminal: <code>cd apps/master</code></li>"
          + "<li>Run: <code>npm run dev:electron</code></li>"
          + "<li>This starts the backend, builds the frontend, then launches Electron</li>"
          + "<li>Or manually: <code>npm run dev:backend</code> + <code>npm run dev:watch</code>, then relaunch</li>"
          + "</ol>";
      }
      const errorHtml = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>"
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
        + `</style></head><body><div class='wrap'><h1>${title}</h1>${body}`
        + "<button class='retry' onclick='window.location.reload()'>Retry</button>"
        + "</div></body></html>";
      await mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(errorHtml));
    }
  }

  spawnGuardian();

  if (app.isPackaged && initAutoUpdater && mainWindow && !mainWindow.isDestroyed()) {
    initAutoUpdater(mainWindow);
    console.log("[Main] Auto-updater initialized");
  }

  if (powerSaveId === null) {
    powerSaveId = powerSaveBlocker.start("prevent-display-sleep");
    console.log("[Main] Power save blocker started (id:", powerSaveId, ")");
  }

  console.log("[Main] Window ready");
}

// ─── Security ─────────────────────────────────────────────────────────────────

function isAllowedUrl(url: string): boolean {
  if (url.startsWith("file://") || url.startsWith("data:") || url.startsWith("clickflash://")) return true;
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch (_) { return false; }
}

function setupSecurity(win: BrowserWindow): void {
  const wc = win.webContents;

  wc.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) {
      console.warn("[Security] Blocked navigation:", url);
      event.preventDefault();
    }
  });

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

function setupWindowEvents(win: BrowserWindow): void {
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
        win.loadURL("data:text/html,<h2 style='font-family:sans-serif;padding:2rem'>ClickFlash encountered a fatal error.<br>Please restart the application.</h2>").catch(() => {});
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

function sha256OfFile(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function spawnGuardian(): void {
  if (!app.isPackaged) return;
  const gPath    = path.join(process.resourcesPath, "helper_scripts", "KioskGuardian.exe");
  const hashPath = path.join(process.resourcesPath, "helper_scripts", "KioskGuardian.exe.sha256");

  if (!fs.existsSync(gPath)) {
    console.warn("[Main] KioskGuardian.exe not found — OS shortcuts unblocked");
    return;
  }

  if (fs.existsSync(hashPath)) {
    const expectedHash = fs.readFileSync(hashPath, "utf8").trim().toLowerCase();
    const actualHash   = sha256OfFile(gPath);
    if (actualHash !== expectedHash) {
      const msg = `[Main] SECURITY: KioskGuardian.exe hash mismatch!\n  expected: ${expectedHash}\n  actual:   ${actualHash}`;
      console.error(msg);
      dialog.showErrorBox(
        "Security Alert",
        "KioskGuardian.exe has been tampered with. The application will not enter kiosk mode.\nPlease reinstall ClickFlash Master.",
      );
      return;
    }
    console.log("[Main] KioskGuardian.exe integrity verified ✓");
  } else {
    console.warn("[Main] KioskGuardian.exe.sha256 not found — skipping integrity check (reinstall recommended)");
  }

  guardianProcess = spawn(gPath, [], { detached: false });
  guardianProcess.on("error", (err: Error) => console.error("[Main] Guardian error:", err.message));
  guardianProcess.on("exit", () => {
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed() && mainWindow.isKiosk()) {
      console.warn("[Main] Guardian exited — respawning in 1 s");
      setTimeout(spawnGuardian, 1000);
    }
  });
  console.log("[Main] KioskGuardian spawned");
}

function killGuardian(): void {
  if (guardianProcess && !guardianProcess.killed) {
    guardianProcess.kill();
    guardianProcess = null;
  }
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

function setupIpc(): void {
  ipcMain.handle("kiosk:unlock", (_e: IpcMainInvokeEvent, rawPin: unknown) => {
    const expected = ADMIN_PIN ?? (!app.isPackaged ? "000000" : null);

    if (!expected) {
      console.error("[IPC] kiosk:unlock — ADMIN_PIN env not set; cannot unlock in production");
      return { success: false, error: "Kiosk unlock not configured — set ADMIN_PIN" };
    }

    const now = Date.now();
    if (pinAttempts.lockedUntil > now) {
      const secsLeft = Math.ceil((pinAttempts.lockedUntil - now) / 1000);
      console.warn(`[IPC] kiosk:unlock — locked out for ${secsLeft}s`);
      return { success: false, error: `Too many attempts. Try again in ${secsLeft}s` };
    }

    const pin = typeof rawPin === "string" ? rawPin : "";

    let isValid: boolean;
    if (pin.length !== expected.length) {
      isValid = false;
      // Dummy compare to maintain constant-time-ish behaviour
      const dummy = Buffer.alloc(expected.length);
      crypto.timingSafeEqual(dummy, dummy);
    } else {
      const pinBuffer      = Buffer.from(pin, "utf8");
      const expectedBuffer = Buffer.from(expected, "utf8");
      isValid = crypto.timingSafeEqual(pinBuffer, expectedBuffer);
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

    pinAttempts.count      = 0;
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

  ipcMain.handle("dialog:openDirectory", async (_e: IpcMainInvokeEvent, opts?: { title?: string; buttonLabel?: string }) => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: opts?.title ?? "Select Folder",
      buttonLabel: opts?.buttonLabel ?? "Select",
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle("dialog:openFile", async (_e: IpcMainInvokeEvent, opts?: { multiple?: boolean; title?: string; filters?: Electron.FileFilter[] }) => {
    if (!mainWindow) return null;
    const props: Array<"openFile" | "multiSelections"> = opts?.multiple ? ["openFile", "multiSelections"] : ["openFile"];
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: props,
      title: opts?.title ?? "Select File",
      filters: opts?.filters,
    });
    if (canceled) return null;
    return opts?.multiple ? filePaths : filePaths[0];
  });

  ipcMain.handle("dialog:saveFile", async (_e: IpcMainInvokeEvent, opts?: { title?: string; filters?: Electron.FileFilter[]; defaultPath?: string }) => {
    if (!mainWindow) return null;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: opts?.title ?? "Save File",
      filters: opts?.filters,
      defaultPath: opts?.defaultPath,
    });
    return canceled ? null : filePath;
  });
}

// ─── Shortcuts ────────────────────────────────────────────────────────────────

function setupShortcuts(): void {
  globalShortcut.register(ADMIN_SHORTCUT, () => {
    console.log("[Main] Admin shortcut — requesting PIN");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("kiosk:show-unlock-dialog");
    }
  });

  const toBlock = ["Alt+Tab", "Alt+F4", "Escape",
    "Super", "Super+D", "Super+Tab", "Super+L", "Super+E"];
  for (const sc of toBlock) {
    try { globalShortcut.register(sc, () => false); } catch (_) { /* unsupported platform */ }
  }
}

// ─── Shutdown ─────────────────────────────────────────────────────────────────

function shutdown(): void {
  if (isQuitting) return;
  isQuitting = true;
  globalShortcut.unregisterAll();
  killGuardian();
  if (backendProcess && !backendProcess.killed) backendProcess.kill();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  if (powerSaveId !== null && powerSaveBlocker.isStarted(powerSaveId)) {
    powerSaveBlocker.stop(powerSaveId);
    powerSaveId = null;
  }
  try { if (tray && !tray.isDestroyed()) tray.destroy(); } catch (_) {}
  app.quit();
}

// ─── System Tray (Phase 2-B) ──────────────────────────────────────────────────

function createTray(): void {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "tray-icon.png")
    : path.join(__dirname, "public", "favicon.png");

  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show ClickFlash",
        click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } },
      },
      {
        label: "Lock Kiosk",
        click: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("kiosk:show-unlock-dialog"); },
      },
      { type: "separator" },
      { label: "Quit ClickFlash", click: () => shutdown() },
    ]);
    tray.setToolTip("ClickFlash Master OS");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
    console.log("[Main] System tray created");
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.warn("[Main] Failed to create system tray:", error.message);
  }
}

// ─── Backups ──────────────────────────────────────────────────────────────────

function scheduleBackups(): void {
  const backupServicePath = app.isPackaged
    ? getUnpackedPath("dist/backend/main/backupService.js")
    : path.join(__dirname, "dist/backend/main/backupService.js");

  function runBackup(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BackupService } = require(backupServicePath) as { BackupService: { runDailyBackup(dir: string): Promise<void> } };
      BackupService.runDailyBackup(getDataDir()).catch((err: Error) => {
        console.error("[Backup] Backup failed:", err);
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn("[Backup] backupService not available:", error.message);
    }
  }

  runBackup();
  setInterval(runBackup, 24 * 60 * 60 * 1000);
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
  // Set Content-Security-Policy via webRequest headers (typed API)
  const CSP_POLICY = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: clickflash://",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:*",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP_POLICY],
      },
    });
  });

  protocol.handle("clickflash", (request) => {
    try {
      const url          = new URL(request.url);
      const relativePath = decodeURIComponent(url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname);
      const dataDir      = getDataDir();
      const fullPath     = path.normalize(path.join(dataDir, relativePath));

      if (!fullPath.startsWith(dataDir)) {
        console.error("[Security] clickflash:// Directory traversal attempt:", fullPath);
        return new Response("Access Denied", { status: 403 });
      }
      if (!fs.existsSync(fullPath)) {
        return new Response("Not Found", { status: 404 });
      }
      return net.fetch("file://" + fullPath);
    } catch (err: unknown) {
      console.error("[Protocol] clickflash:// error:", err);
      return new Response("Internal Error", { status: 500 });
    }
  });

  setupShortcuts();
  setupIpc();

  try {
    console.log("[Main] Starting backend process...");
    const backendReady = await startBackend();
    
    if (app.isPackaged && !backendReady) {
      console.warn("[Main] Backend did not report ready, proceeding anyway...");
    } else {
      console.log("[Main] Backend is fully ready");
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[Main] Failed to start backend:", error.message);
    if (error.message === "EADDRINUSE") {
      (global as any).backendError = "EADDRINUSE";
    } else {
      dialog.showErrorBox("Backend Error", "Failed to start backend: " + error.message);
    }
  }

  createWindow();
  createTray();
  scheduleBackups();
}).catch((err: unknown) => {
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

process.on("uncaughtException", (err: Error) => {
  console.error("[Main] Uncaught exception:", err);
  shutdown();
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[Main] Unhandled promise rejection:", reason);
});
