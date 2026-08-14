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
 *  1. Boot Backend -> Boot Guardian -> Wait Health -> Load Renderer.
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  dialog,
  protocol,
  safeStorage,
  net,
  session,
  Tray,
  Menu,
  powerSaveBlocker,
  IpcMainInvokeEvent,
} from "electron";
import path from "path";
import { pathToFileURL } from "url";
import fs from "fs";
import http from "http";
import crypto from "crypto";
import { fork, spawn, ChildProcess } from "child_process";
import { logger } from "@clickflash/logger";
import {
  getLicenseMachineId,
  isValidEd25519PublicKey,
  loadProtectedDesktopLicense,
} from "./desktop-license";
import { isTrustedIpcSender, resolveContainedPath } from "./electron-security";
import {
  parseKioskPin,
  parseOpenDirectoryOptions,
  parseOpenFileOptions,
  parsePrintOptions,
  parseSaveFileOptions,
} from "./ipc-validation";
import { createRepositories, type Repositories } from "./backend/repositories/RepositoryFactory";
import { DatabaseManager } from "./backend/database/db";
import { RepoRequest } from "./ipc-schemas";
import { backgroundRemovalService } from "./backend/services/backgroundRemovalService";

// ─── Config ───────────────────────────────────────────────────────────────────

const BACKEND_PORT   = 8090;
const HEALTH_URL     = `http://localhost:${BACKEND_PORT}/api/health`;
const HEALTH_TIMEOUT = 120_000; // ms — first boot runs 90+ migrations
const POLL_INTERVAL  = 300;    // ms between health polls

const APP_URL = `http://localhost:${BACKEND_PORT}`;
const ALLOWED_RENDERER_PERMISSIONS = new Set(["media", "notifications"]);

const ADMIN_PIN: string | null    = process.env.ADMIN_PIN ?? null;
const ADMIN_SHORTCUT              = "CommandOrControl+Alt+Shift+X";
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS   = 15 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTrustedAppOrigin(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).origin === APP_URL;
  } catch {
    return false;
  }
}

function getUnpackedPath(relativePath: string): string {
  if (app.isPackaged) {
    const unpackedDir = path.join(process.resourcesPath, "app.asar.unpacked", "dist");
    return path.join(unpackedDir, relativePath);
  }
  return path.join(process.cwd(), "dist", relativePath);
}

function getDataDir(): string {
  if (app.isPackaged) {
    return path.join(app.getPath("userData"), "pb_data");
  }
  return path.join(__dirname, "pb_data");
}

function sha256OfFile(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function loadConfiguredLicensePublicKey(): string | null {
  const environmentKey = process.env.CLICKFLASH_LICENSE_PUBLIC_KEY?.trim();
  if (isValidEd25519PublicKey(environmentKey)) return environmentKey;
  if (!app.isPackaged) return null;

  try {
    const trustPath = path.join(process.resourcesPath, "license-public-key.txt");
    const stat = fs.lstatSync(trustPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > 256) return null;
    const packagedKey = fs.readFileSync(trustPath, "utf8").trim();
    return isValidEd25519PublicKey(packagedKey) ? packagedKey : null;
  } catch {
    return null;
  }
}

// ─── MasterApp ────────────────────────────────────────────────────────────────

class MasterApp {
  private mainWindow: BrowserWindow | null = null;
  private backendProcess: ChildProcess | null = null;
  private guardianProcess: ChildProcess | null = null;
  private isQuitting = false;
  private powerSaveId: number | null = null;
  private tray: Tray | null = null;
  private verifiedLicensePublicKey: string | null = null;
  private pinAttempts = { count: 0, lockedUntil: 0 };
  private repos: Repositories | null = null;
  private localDb: DatabaseManager | null = null;
  private initAutoUpdater: ((win: BrowserWindow) => void) | null = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.initAutoUpdater = require(path.join(__dirname, "..", "backend", "main", "autoUpdater.js")).initAutoUpdater as (win: BrowserWindow) => void;
    } catch (_) {
      logger.warn(String("[Main] autoUpdater module not available (run `npm run build:backend` first)"));
    }

    protocol.registerSchemesAsPrivileged([
      {
        scheme: "clickflash",
        privileges: {
          secure: true,
          standard: true,
          supportFetchAPI: true,
        },
      },
    ]);

    this.init();
  }

  private init() {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      app.quit();
      return;
    }

    app.on("second-instance", () => {
      if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); }
    });

    app.on("web-contents-created", (_e, wc) => {
      wc.setWindowOpenHandler(() => ({ action: "deny" }));
      wc.on("will-attach-webview", (event) => {
        event.preventDefault();
      });
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") this.shutdown();
    });

    app.on("before-quit", () => this.shutdown());

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 && this.mainWindow === null) {
         this.loadRenderer();
      }
    });

    process.on("uncaughtException", (err: Error) => {
      logger.error("[Main] Uncaught exception:", { args: [err] });
      this.shutdown();
    });

    process.on("unhandledRejection", (reason: unknown) => {
      logger.error("[Main] Unhandled promise rejection:", { args: [reason] });
    });

    app.whenReady().then(() => this.onAppReady()).catch((err: unknown) => {
      logger.error("[Main] Fatal startup error:", { args: [err] });
      dialog.showErrorBox("Startup Error", String(err));
      app.quit();
    });
  }

  private async onAppReady() {
    const CSP_POLICY = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: clickflash:// https: http:",
      "font-src 'self' data: https: http:",
      "connect-src 'self' http://localhost:* http://127.0.0.1:* https: wss: ws:",
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

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      return Boolean(
        this.mainWindow
        && !this.mainWindow.isDestroyed()
        && webContents === this.mainWindow.webContents
        && ALLOWED_RENDERER_PERMISSIONS.has(permission)
        && isTrustedAppOrigin(requestingOrigin),
      );
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      callback(Boolean(
        this.mainWindow
        && !this.mainWindow.isDestroyed()
        && webContents === this.mainWindow.webContents
        && ALLOWED_RENDERER_PERMISSIONS.has(permission)
        && isTrustedAppOrigin(details.requestingUrl),
      ));
    });

    if (!await this.enforceDesktopLicense()) {
      dialog.showErrorBox(
        "Activation Error",
        "A valid hardware-bound ClickFlash activation was not found. Run ClickFlash Studio Setup or contact support.",
      );
      app.quit();
      return;
    }

    protocol.handle("clickflash", (request) => {
      try {
        const url          = new URL(request.url);
        const relativePath = decodeURIComponent(url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname);
        const dataDir      = getDataDir();
        const fullPath     = resolveContainedPath(dataDir, relativePath);

        if (!fullPath) {
          logger.error("[Security] clickflash:// Directory traversal attempt", { args: [relativePath] });
          return new Response("Access Denied", { status: 403 });
        }
        if (!fs.existsSync(fullPath)) {
          return new Response("Not Found", { status: 404 });
        }
        return net.fetch(pathToFileURL(fullPath).toString());
      } catch (err: unknown) {
        logger.error("[Protocol] clickflash:// error:", { args: [err] });
        return new Response("Internal Error", { status: 500 });
      }
    });

    this.setupShortcuts();
    this.setupIpc();

    try {
      logger.info(String("[Main] Booting backend..."));
      await this.bootBackend();

      logger.info(String("[Main] Booting guardian..."));
      this.spawnGuardian();

      logger.info(String("[Main] Waiting for backend health..."));
      const backendReady = await this.waitBackendReady();
      
      if (app.isPackaged && !backendReady) {
        throw new Error("Packaged backend did not report ready");
      }
      logger.info(String("[Main] Backend is fully ready"));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("[Main] Failed to start backend:", { args: [error.message] });
      if (error.message === "EADDRINUSE") {
        (global as any).backendError = "EADDRINUSE";
      } else {
        dialog.showErrorBox("Backend Error", "Failed to start backend: " + error.message);
        app.quit();
        return;
      }
    }

    logger.info(String("[Main] Loading renderer..."));
    await this.loadRenderer();
    this.createTray();
    this.scheduleBackups();
  }

  // ─── Backend ────────────────────────────────────────────────────────────────

  private checkHealthOnce(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(HEALTH_URL, (res) => {
        res.resume();
        resolve((res.statusCode ?? 500) < 500);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
  }

  private waitForBackendHealth(deadline = Date.now() + HEALTH_TIMEOUT): Promise<boolean> {
    return new Promise((resolve) => {
      const attempt = () => {
        if (Date.now() >= deadline) {
          logger.warn(String("[Main] Backend health-check timed out — loading UI anyway"));
          return resolve(false);
        }
        const req = http.get(HEALTH_URL, (res) => {
          res.resume();
          if ((res.statusCode ?? 500) < 500) {
            logger.info(String("[Main] Backend ready (health check passed)"));
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

  private async bootBackend(): Promise<void> {
    if (!app.isPackaged) {
      const isAlreadyRunning = await this.checkHealthOnce();
      if (isAlreadyRunning) {
        logger.info("[Main] Development backend already running on port", { args: [BACKEND_PORT] });
        return;
      }
    }

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
        logger.info("[Main] Dev mode — waiting for dev backend on port", { args: [BACKEND_PORT] });
        return;
      }
    }

    logger.info("[Main] Resolved backend path:", { args: [serverPath] });
    logger.info("[Main] __dirname:", { args: [__dirname] });
    logger.info("[Main] process.resourcesPath:", { args: [process.resourcesPath] });
    if (!fs.existsSync(serverPath)) {
      logger.error("[Main] Backend bundle not found:", { args: [serverPath] });
      throw new Error("Backend bundle not found: " + serverPath);
    }

    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const appDir = path.dirname(app.getPath("exe"));
    logger.info("[Main] Forking backend:", { args: [serverPath] });
    logger.info("[Main] DATA_DIR:", { args: [dataDir] });
    logger.info("[Main] Working dir:", { args: [appDir] });

    const backendEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...(this.verifiedLicensePublicKey
        ? { CLICKFLASH_LICENSE_PUBLIC_KEY: this.verifiedLicensePublicKey }
        : {}),
      ELECTRON_RUN_AS_NODE: "1",
      DATA_DIR: dataDir,
      WEB_ROOT: getUnpackedPath("master"),
      NODE_ENV: app.isPackaged ? "production" : (process.env.NODE_ENV ?? "development"),
    };

    this.backendProcess = fork(serverPath, [], {
      env: backendEnv,
      execArgv: ["--max-old-space-size=8192"],
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      cwd: app.isPackaged ? appDir : process.cwd(),
    });

    this.backendProcess.stdout?.on("data", (d: Buffer) => process.stdout.write("[Backend] " + d));
    this.backendProcess.stderr?.on("data", (d: Buffer) => process.stderr.write("[Backend:ERR] " + d));

    this.backendProcess.on("exit", (code: number | null) => {
      logger.warn("[Main] Backend exited (code", { args: [code, ")"] });
      if (!this.isQuitting) {
        logger.info(String("[Main] Respawning backend in 3 s..."));
        setTimeout(() => this.bootBackend().catch(logger.error), 3000);
      }
    });
  }

  private async waitBackendReady(): Promise<boolean> {
    if (!app.isPackaged || !this.backendProcess) {
      return this.waitForBackendHealth();
    }
    
    return new Promise((resolve, reject) => {
      let resolved = false;
      const startupTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, HEALTH_TIMEOUT);

      const messageHandler = (msg: any) => {
        if (msg && msg.type === "server-ready") {
          logger.info(String("[Main] Received server-ready IPC from backend"));
          if (!resolved) {
            resolved = true;
            clearTimeout(startupTimer);
            this.backendProcess!.off("message", messageHandler);
            this.backendProcess!.off("error", errorHandler);
            resolve(true);
          }
        } else if (msg && msg.type === "server-error") {
          logger.error("[Main] Backend reported error:", { args: [msg.error] });
          if (msg.error === "EADDRINUSE") {
            if (!resolved) {
              resolved = true;
              clearTimeout(startupTimer);
              this.backendProcess!.off("message", messageHandler);
              this.backendProcess!.off("error", errorHandler);
              reject(new Error("EADDRINUSE"));
            }
          }
        }
      };
      
      const errorHandler = (err: Error) => {
        logger.error("[Main] Backend fork error:", { args: [err.message] });
        if (!resolved) {
          resolved = true;
          clearTimeout(startupTimer);
          this.backendProcess!.off("message", messageHandler);
          this.backendProcess!.off("error", errorHandler);
          reject(err);
        }
      };

      this.backendProcess!.on("message", messageHandler);
      this.backendProcess!.on("error", errorHandler);
    });
  }

  // ─── Window ─────────────────────────────────────────────────────────────────

  private getPreloadPath(): string {
    const candidates = [
      path.join(__dirname, "preload.js"),
      path.join(app.getAppPath(), "preload.js"),
      path.join(process.resourcesPath ?? "", "preload.js"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    logger.error(String("[Main] preload.js not found — IPC unavailable"));
    return candidates[0];
  }

  private async loadRenderer(): Promise<void> {
    const preload = this.getPreloadPath();
    logger.info("[Main] Preload:", { args: [preload] });

    this.mainWindow = new BrowserWindow({
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

    this.mainWindow.setMenuBarVisibility(false);
    this.mainWindow.setAutoHideMenuBar(true);
    this.setupSecurity(this.mainWindow);
    this.setupWindowEvents(this.mainWindow);

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
        <div class="msg" id="m">Loading app...</div>
      </div>
    </body></html>`;

    await this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splash)}`);
    this.mainWindow.show();
    this.mainWindow.focus();

    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    try {
      if ((global as any).backendError === "EADDRINUSE") {
        await this.mainWindow.loadURL(`data:text/html;charset=utf-8,
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

      logger.info("[Main] Loading app via Express:", { args: [APP_URL] });
      await this.mainWindow.loadURL(APP_URL);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("[Main] Failed to load renderer:", { args: [error.message] });
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
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
        await this.mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(errorHtml));
      }
    }

    if (app.isPackaged && this.initAutoUpdater && this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.initAutoUpdater(this.mainWindow);
      logger.info(String("[Main] Auto-updater initialized"));
    }

    if (this.powerSaveId === null) {
      this.powerSaveId = powerSaveBlocker.start("prevent-display-sleep");
      logger.info("[Main] Power save blocker started (id:", { args: [this.powerSaveId, ")"] });
    }

    logger.info(String("[Main] Window ready"));
  }

  // ─── Security ─────────────────────────────────────────────────────────────────

  private isAllowedUrl(url: string): boolean {
    if (url.startsWith("file://") || url.startsWith("data:") || url.startsWith("clickflash://")) return true;
    try {
      const { hostname } = new URL(url);
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch (_) { return false; }
  }

  private setupSecurity(win: BrowserWindow): void {
    const wc = win.webContents;

    wc.on("will-navigate", (event, url) => {
      if (!this.isAllowedUrl(url)) {
        logger.warn("[Security] Blocked navigation:", { args: [url] });
        event.preventDefault();
      }
    });

    wc.on("will-redirect", (event, url) => {
      if (!this.isAllowedUrl(url)) {
        logger.warn("[Security] Blocked redirect:", { args: [url] });
        event.preventDefault();
      }
    });

    wc.setWindowOpenHandler(({ url }) => {
      logger.warn("[Security] Blocked new window:", { args: [url] });
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

  private setupWindowEvents(win: BrowserWindow): void {
    const crashTracker = { count: 0, windowStart: Date.now() };
    const MAX_CRASHES  = 3;
    const CRASH_WINDOW = 60_000;

    win.webContents.on("render-process-gone", (_e, details) => {
      logger.error("[Main] Renderer crashed:", { args: [details.reason] });

      const now = Date.now();
      if (now - crashTracker.windowStart > CRASH_WINDOW) {
        crashTracker.count = 0;
        crashTracker.windowStart = now;
      }
      crashTracker.count += 1;

      if (crashTracker.count > MAX_CRASHES) {
        logger.error(String(`[Main] Renderer crashed ${crashTracker.count} times — stopping auto-reload`));
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
        logger.info(String(`[Main] Reloading renderer (attempt ${crashTracker.count}/${MAX_CRASHES})`));
        win.reload();
      }, 2000);
    });

    win.webContents.on("did-fail-load", (_e, code, desc) => {
      logger.error("[Main] did-fail-load:", { args: [code, desc] });
    });

    win.on("closed", () => { this.mainWindow = null; });
  }

  // ─── Guardian ─────────────────────────────────────────────────────────────────

  private spawnGuardian(): void {
    if (!app.isPackaged) return;
    const gPath    = path.join(process.resourcesPath, "helper_scripts", "KioskGuardian.exe");
    const hashPath = path.join(process.resourcesPath, "helper_scripts", "KioskGuardian.exe.sha256");

    if (!fs.existsSync(gPath)) {
      logger.warn(String("[Main] KioskGuardian.exe not found — OS shortcuts unblocked"));
      return;
    }

    if (fs.existsSync(hashPath)) {
      const expectedHash = fs.readFileSync(hashPath, "utf8").trim().toLowerCase();
      const actualHash   = sha256OfFile(gPath);
      if (actualHash !== expectedHash) {
        const msg = `[Main] SECURITY: KioskGuardian.exe hash mismatch!\n  expected: ${expectedHash}\n  actual:   ${actualHash}`;
        logger.error(String(msg));
        dialog.showErrorBox(
          "Security Alert",
          "KioskGuardian.exe has been tampered with. The application will not enter kiosk mode.\nPlease reinstall ClickFlash Master.",
        );
        return;
      }
      logger.info(String("[Main] KioskGuardian.exe integrity verified ✓"));
    } else {
      logger.warn(String("[Main] KioskGuardian.exe.sha256 not found — skipping integrity check (reinstall recommended)"));
    }

    this.guardianProcess = spawn(gPath, [], { detached: false });
    this.guardianProcess.on("error", (err: Error) => logger.error("[Main] Guardian error:", { args: [err.message] }));
    this.guardianProcess.on("exit", () => {
      if (!this.isQuitting && this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.isKiosk()) {
        logger.warn(String("[Main] Guardian exited — respawning in 1 s"));
        setTimeout(() => this.spawnGuardian(), 1000);
      }
    });
    logger.info(String("[Main] KioskGuardian spawned"));
  }

  private killGuardian(): void {
    if (this.guardianProcess && !this.guardianProcess.killed) {
      this.guardianProcess.kill();
      this.guardianProcess = null;
    }
  }

  // ─── IPC ──────────────────────────────────────────────────────────────────────

  private registerIpcHandler<Args extends unknown[], Result>(
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: Args) => Result,
  ): void {
    ipcMain.handle(channel, (event, ...args) => {
      if (!isTrustedIpcSender(event, this.mainWindow)) {
        logger.warn("[Security] Blocked IPC from untrusted frame", {
          args: [channel, event.senderFrame?.url],
        });
        throw new Error("Unauthorized IPC sender");
      }
      return listener(event, ...(args as Args));
    });
  }

  private initLocalDb(): void {
    if (this.localDb) return;
    try {
      const dataDir = getDataDir();
      const dbPath = path.join(dataDir, "master.db");
      this.localDb = new DatabaseManager(dbPath);
      this.localDb.connect();
      this.repos = createRepositories(this.localDb);
      logger.info(String("[IPC] Local DB + Repository layer initialized for direct IPC access"));
    } catch (err: any) {
      logger.error(`[IPC] Failed to initialize local DB: ${err.message}`);
      this.repos = null;
    }
  }

  private setupIpc(): void {
    // ─── Direct Repository IPC (bypasses Express) ────────────────────────
    this.registerIpcHandler("repo:request", async (_e: IpcMainInvokeEvent, rawReq: unknown) => {
      try {
        // Lazy-init the local DB connection on first repo:request
        if (!this.repos) this.initLocalDb();
        if (!this.repos) {
          return { ok: false, status: 503, data: { error: "Repository layer not available" } };
        }

        const parsed = RepoRequest.safeParse(rawReq);
        if (!parsed.success) {
          return { ok: false, status: 400, data: { error: "Invalid request", details: parsed.error.issues } };
        }

        const { collection, action, params } = parsed.data;
        const repo = this.repos[collection] as any;
        if (!repo || typeof repo[action] !== "function") {
          return { ok: false, status: 404, data: { error: `Unknown action: ${collection}.${action}` } };
        }

        // Map params to function arguments based on action
        let result: any;
        switch (action) {
          case "findById":
            result = repo.findById(params?.id);
            break;
          case "findAll":
            result = repo.findAll();
            break;
          case "findByKey":
            result = repo.findByKey(params?.key);
            break;
          case "findByStatus":
            result = repo.findByStatus(params?.status);
            break;
          case "findByAlbumId":
            result = repo.findByAlbumId(params?.albumId);
            break;
          case "findByPhotographerId":
            result = repo.findByPhotographerId(params?.photographerId);
            break;
          case "findByRole":
            result = repo.findByRole(params?.role);
            break;
          case "findByEmail":
            result = repo.findByEmail(params?.email);
            break;
          case "findByCategory":
            result = repo.findByCategory(params?.category);
            break;
          case "findFeatured":
            result = repo.findFeatured();
            break;
          case "create":
            result = repo.create(params?.data || params);
            break;
          case "update":
            result = repo.update(params?.id, params?.data || params);
            break;
          case "delete":
            result = repo.delete(params?.id);
            break;
          case "upsert":
            result = repo.upsert(params?.key, params?.value);
            break;
          default:
            return { ok: false, status: 400, data: { error: `Unhandled action: ${action}` } };
        }

        return { ok: true, status: 200, data: result };
      } catch (err: any) {
        logger.error(`[IPC Repo] Request failed: ${err.message}`);
        return { ok: false, status: 500, data: { error: err.message } };
      }
    });

    // ─── Legacy HTTP Proxy IPC (for kiosk routes and backward compat) ───
    this.registerIpcHandler("api:request", async (_e: IpcMainInvokeEvent, req: any) => {
      try {
        const { path: apiPath, options } = req;
        const url = `http://127.0.0.1:${BACKEND_PORT}${apiPath}`;
        
        let body: any = options.body;
        
        if (options.isFormData && body) {
          const formData = new FormData();
          for (const key of Object.keys(body)) {
            const field = body[key];
            if (field && typeof field === 'object' && field.type === 'file') {
              const buffer = fs.readFileSync(field.path);
              const blob = new Blob([buffer], { type: field.mime });
              formData.append(key, blob, field.name);
            } else if (field && typeof field === 'object' && field.type === 'blob') {
              const blob = new Blob([field.buffer], { type: field.mime });
              formData.append(key, blob, field.name);
            } else {
              formData.append(key, field);
            }
          }
          options.body = formData;
          if (options.headers) {
             delete options.headers['Content-Type'];
             delete options.headers['content-type'];
          }
        } else if (body && typeof body === 'object') {
          options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options as RequestInit);
        const dataText = await response.text();
        let data;
        try {
           data = JSON.parse(dataText);
        } catch {
           data = dataText;
        }
        
        return {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          data
        };
      } catch (err: any) {
        logger.error(`[IPC API] Request failed: ${err.message}`);
        return { status: 500, ok: false, statusText: "Internal Server Error", data: { error: err.message } };
      }
    });

    this.registerIpcHandler("kiosk:unlock", (_e: IpcMainInvokeEvent, rawPin: unknown) => {
      const expected = ADMIN_PIN ?? (!app.isPackaged ? "000000" : null);

      if (!expected) {
        logger.error(String("[IPC] kiosk:unlock — ADMIN_PIN env not set; cannot unlock in production"));
        return { success: false, error: "Kiosk unlock not configured — set ADMIN_PIN" };
      }

      const now = Date.now();
      if (this.pinAttempts.lockedUntil > now) {
        const secsLeft = Math.ceil((this.pinAttempts.lockedUntil - now) / 1000);
        logger.warn(String(`[IPC] kiosk:unlock — locked out for ${secsLeft}s`));
        return { success: false, error: `Too many attempts. Try again in ${secsLeft}s` };
      }

      let pin: string;
      try {
        pin = parseKioskPin(rawPin);
      } catch {
        return { success: false, error: "Invalid PIN format" };
      }

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
        this.pinAttempts.count += 1;
        logger.warn(String(`[IPC] kiosk:unlock — wrong PIN (attempt ${this.pinAttempts.count}/${PIN_MAX_ATTEMPTS})`));
        if (this.pinAttempts.count >= PIN_MAX_ATTEMPTS) {
          this.pinAttempts.lockedUntil = now + PIN_LOCKOUT_MS;
          this.pinAttempts.count = 0;
          return { success: false, error: "Too many attempts. Locked for 15 minutes" };
        }
        return { success: false, error: "Invalid PIN" };
      }

      this.pinAttempts.count      = 0;
      this.pinAttempts.lockedUntil = 0;

      if (this.mainWindow) {
        this.mainWindow.setKiosk(false);
        this.mainWindow.setFullScreen(false);
        this.mainWindow.setAlwaysOnTop(false);
        this.killGuardian();
      }
      return { success: true };
    });

    this.registerIpcHandler("kiosk:lock", () => {
      if (this.mainWindow) {
        this.mainWindow.setKiosk(true);
        this.mainWindow.setFullScreen(true);
        this.mainWindow.setAlwaysOnTop(true);
        this.spawnGuardian();
      }
      return { success: true };
    });

    this.registerIpcHandler("dialog:openDirectory", async (_e: IpcMainInvokeEvent, rawOptions: unknown) => {
      if (!this.mainWindow) return null;
      const opts = parseOpenDirectoryOptions(rawOptions);
      const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
        properties: ["openDirectory"],
        title: opts?.title ?? "Select Folder",
        buttonLabel: opts?.buttonLabel ?? "Select",
      });
      return canceled ? null : filePaths[0];
    });

    this.registerIpcHandler("dialog:openFile", async (_e: IpcMainInvokeEvent, rawOptions: unknown) => {
      if (!this.mainWindow) return null;
      const opts = parseOpenFileOptions(rawOptions);
      const props: Array<"openFile" | "multiSelections"> = opts?.multiple ? ["openFile", "multiSelections"] : ["openFile"];
      const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
        properties: props,
        title: opts?.title ?? "Select File",
        filters: opts?.filters,
      });
      if (canceled) return null;
      return opts?.multiple ? filePaths : filePaths[0];
    });

    this.registerIpcHandler("dialog:saveFile", async (_e: IpcMainInvokeEvent, rawOptions: unknown) => {
      if (!this.mainWindow) return null;
      const opts = parseSaveFileOptions(rawOptions);
      const { canceled, filePath } = await dialog.showSaveDialog(this.mainWindow, {
        title: opts?.title ?? "Save File",
        filters: opts?.filters,
        defaultPath: opts?.defaultPath,
      });
      return canceled ? null : filePath;
    });

    this.registerIpcHandler("printing:getPrinters", async () => {
      if (!this.mainWindow) return [];
      return this.mainWindow.webContents.getPrintersAsync();
    });

    this.registerIpcHandler("ai:remove-background", async (_e: IpcMainInvokeEvent, args: unknown) => {
      try {
        const { inputPath, outputPath } = args as { inputPath: string; outputPath?: string };
        if (!inputPath) {
          return { success: false, error: "inputPath is required" };
        }
        
        // If no outputPath provided, modify the file name
        const finalOutputPath = outputPath || inputPath.replace(/(\.[^.]+)$/, '-nobg.png');
        
        const result = await backgroundRemovalService.removeBackground(inputPath, finalOutputPath);
        return result;
      } catch (err: any) {
        logger.error(`[IPC] ai:remove-background error: ${err.message}`);
        return { success: false, error: err.message };
      }
    });

    this.registerIpcHandler("printing:print", (_e: IpcMainInvokeEvent, rawOptions: unknown) => {
      const options = parsePrintOptions(rawOptions);
      if (!this.mainWindow) throw new Error("Print window is unavailable");

      return new Promise<{ success: true }>((resolve, reject) => {
        this.mainWindow!.webContents.print({
          silent: options.silent,
          printBackground: true,
          deviceName: options.printer,
        }, (success, errorType) => {
          if (!success) reject(new Error(errorType || "Print failed"));
          else resolve({ success: true });
        });
      });
    });
  }

  // ─── Shortcuts ────────────────────────────────────────────────────────────────

  private setupShortcuts(): void {
    globalShortcut.register(ADMIN_SHORTCUT, () => {
      logger.info(String("[Main] Admin shortcut — requesting PIN"));
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send("kiosk:show-unlock-dialog");
      }
    });

    const toBlock = ["Alt+Tab", "Alt+F4", "Escape",
      "Super", "Super+D", "Super+Tab", "Super+L", "Super+E"];
    for (const sc of toBlock) {
      try { globalShortcut.register(sc, () => false); } catch (_) { /* unsupported platform */ }
    }
  }

  // ─── Shutdown ─────────────────────────────────────────────────────────────────

  private shutdown(): void {
    if (this.isQuitting) return;
    this.isQuitting = true;
    globalShortcut.unregisterAll();
    this.killGuardian();
    if (this.backendProcess && !this.backendProcess.killed) this.backendProcess.kill();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.destroy();
    if (this.powerSaveId !== null && powerSaveBlocker.isStarted(this.powerSaveId)) {
      powerSaveBlocker.stop(this.powerSaveId);
      this.powerSaveId = null;
    }
    try { if (this.tray && !this.tray.isDestroyed()) this.tray.destroy(); } catch (_) {}
    app.quit();
  }

  private async enforceDesktopLicense(): Promise<boolean> {
    const isDevelopment = !app.isPackaged && process.env.NODE_ENV !== "production";
    if (isDevelopment && process.env.BYPASS_LICENSE_CHECK === "true") {
      logger.warn(String("[Licensing] BYPASS_LICENSE_CHECK is enabled for development"));
      return true;
    }
    if (!safeStorage.isEncryptionAvailable()) {
      logger.error(String("[Licensing] OS-protected storage is unavailable"));
      return false;
    }

    const publicKey = loadConfiguredLicensePublicKey();
    if (!isValidEd25519PublicKey(publicKey)) {
      logger.error(String("[Licensing] CLICKFLASH_LICENSE_PUBLIC_KEY is missing or invalid"));
      return false;
    }
    const configPath = path.join(app.getPath("home"), ".clickflash", "installer-config.json");
    try {
      const machineId = await getLicenseMachineId();
      const result = loadProtectedDesktopLicense(
        configPath,
        (encrypted) => safeStorage.decryptString(encrypted),
        publicKey,
        machineId,
      );
      if (!result.valid) {
        logger.error("[Licensing] Desktop activation rejected", { args: [result.error] });
        return false;
      }
      this.verifiedLicensePublicKey = publicKey;
      logger.info("[Licensing] Hardware-bound Ed25519 activation verified", {
        args: [result.license?.plan, result.license?.maxMasters],
      });
      return true;
    } catch (error) {
      logger.error("[Licensing] Desktop activation check failed", { args: [error] });
      return false;
    }
  }

  // ─── System Tray ──────────────────────────────────────────────────────────────

  private createTray(): void {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "tray-icon.png")
      : path.join(__dirname, "public", "favicon.png");

    try {
      this.tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: "Show ClickFlash",
          click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); } },
        },
        {
          label: "Lock Kiosk",
          click: () => { if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.webContents.send("kiosk:show-unlock-dialog"); },
        },
        { type: "separator" },
        { label: "Quit ClickFlash", click: () => this.shutdown() },
      ]);
      this.tray.setToolTip("ClickFlash Master OS");
      this.tray.setContextMenu(contextMenu);
      this.tray.on("double-click", () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); } });
      logger.info(String("[Main] System tray created"));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn("[Main] Failed to create system tray:", { args: [error.message] });
    }
  }

  // ─── Backups ──────────────────────────────────────────────────────────────────

  private scheduleBackups(): void {
    const backupServicePath = app.isPackaged
      ? getUnpackedPath("dist/backend/main/backupService.js")
      : path.join(__dirname, "dist/backend/main/backupService.js");

    const runBackup = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { BackupService } = require(backupServicePath) as { BackupService: { runDailyBackup(dir: string): Promise<void> } };
        BackupService.runDailyBackup(getDataDir()).catch((err: Error) => {
          logger.error("[Backup] Backup failed:", { args: [err] });
        });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn("[Backup] backupService not available:", { args: [error.message] });
      }
    };

    runBackup();
    setInterval(runBackup, 24 * 60 * 60 * 1000);
  }
}

new MasterApp();
