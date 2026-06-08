/**
 * ClickFlash Unified Installer — Electron Main Process
 *
 * Orchestrates the 1-click installation experience:
 * 1. Shows wizard UI (React + Vite)
 * 2. Handles system checks via IPC
 * 3. Manages Cloudflare OAuth callback
 * 4. Spawns installation processes
 * 5. Launches Master + Touch after completion
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  shell,
  IpcMainInvokeEvent,
} from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import http from "http";
import { spawn, exec } from "child_process";

// ─── Protocol Registration ────────────────────────────────────────────────────
protocol.registerSchemesAsPrivileged([
  {
    scheme: "clickflash-installer",
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
const WIZARD_PORT = 5175;
const WIZARD_URL = `http://localhost:${WIZARD_PORT}`;
const INSTALLER_LOG = path.join(os.tmpdir(), "clickflash-installer.log");

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// ─── Logging ──────────────────────────────────────────────────────────────────
function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>): void {
  const entry = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${meta ? " " + JSON.stringify(meta) : ""}\n`;
  try {
    fs.appendFileSync(INSTALLER_LOG, entry);
  } catch {}
  console.log(entry.trim());
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    fullscreenable: false,
    title: "ClickFlash Studio Setup",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: !app.isPackaged,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  // Security
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://localhost:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("will-redirect", (event, url) => {
    if (!url.startsWith("http://localhost:")) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Load wizard
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html")).catch((err) => {
      log("error", "Failed to load renderer", { error: err.message });
    });
  } else {
    mainWindow.loadURL(WIZARD_URL).catch((err) => {
      log("error", "Failed to load dev server", { error: err.message });
    });
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
function setupIpc(): void {
  // System checks
  ipcMain.handle("installer:checkPrerequisites", async () => {
    log("info", "Running prerequisite checks");
    const results = {
      nodeVersion: null as string | null,
      nodeInstalled: false,
      diskSpaceGB: 0,
      portsAvailable: { 8090: false, 8091: false, 5353: false },
      os: process.platform,
      arch: process.arch,
      totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    };

    // Check Node.js
    try {
      const nodePath = await which("node");
      if (nodePath) {
        const version = await execPromise("node --version");
        results.nodeVersion = version.trim();
        const major = parseInt(results.nodeVersion.replace("v", "").split(".")[0]);
        results.nodeInstalled = major >= 20;
      }
    } catch {
      results.nodeInstalled = false;
    }

    // Check disk space
    try {
      const free = await getFreeSpaceGB();
      results.diskSpaceGB = free;
    } catch {
      results.diskSpaceGB = 0;
    }

    // Check ports
    for (const port of [8090, 8091, 5353] as const) {
      results.portsAvailable[port] = await isPortAvailable(port);
    }

    log("info", "Prerequisites check complete", results);
    return results;
  });

  // Cloudflare OAuth: open browser
  ipcMain.handle("installer:openOAuth", async (_e: IpcMainInvokeEvent, url: string) => {
    log("info", "Opening OAuth URL", { url });
    await shell.openExternal(url);
    return { success: true };
  });

  // Cloudflare API test
  ipcMain.handle("installer:testCloudflareToken", async (_e: IpcMainInvokeEvent, token: string) => {
    log("info", "Testing Cloudflare API token");
    try {
      const res = await fetch("https://api.cloudflare.com/client/v4/accounts", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = (await res.json()) as { success: boolean; result?: Array<{ id: string; name: string }> };
      if (data.success && data.result) {
        return { success: true, accounts: data.result };
      }
      return { success: false, error: "Invalid token or insufficient permissions" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Fleet registration
  ipcMain.handle("installer:registerFleet", async (_e: IpcMainInvokeEvent, payload: {
    deskId: string;
    name: string;
    location: string;
    country: string;
    timezone: string;
    currency: string;
    cloudApiUrl: string;
    token: string;
  }) => {
    log("info", "Registering fleet", { deskId: payload.deskId });
    try {
      const res = await fetch(`${payload.cloudApiUrl}/api/masters/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${payload.token}`,
        },
        body: JSON.stringify({
          desk_id: payload.deskId,
          name: payload.name,
          location: payload.location,
          country: payload.country,
          timezone: payload.timezone,
          currency: payload.currency,
          hardware_fingerprint: await getHardwareFingerprint(),
          version: app.getVersion(),
        }),
      });
      const data = (await res.json()) as { status: string; desk_id: string; peers?: unknown[]; error?: string };
      if (res.ok) {
        return { success: true, data };
      }
      return { success: false, error: data.error || `HTTP ${res.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Health checks
  ipcMain.handle("installer:runHealthChecks", async (_e: IpcMainInvokeEvent, config: {
    masterPort: number;
    touchPort: number;
    cloudApiUrl: string;
    deskId: string;
    token: string;
  }) => {
    log("info", "Running health checks");
    const checks = {
      masterBackend: false,
      touchBackend: false,
      heartbeat: false,
      d1Write: false,
      r2Upload: false,
    };

    // Test Master backend
    try {
      const res = await fetchWithTimeout(`http://localhost:${config.masterPort}/api/health`, 5000);
      checks.masterBackend = res.ok;
    } catch {}

    // Test Touch backend
    try {
      const res = await fetchWithTimeout(`http://localhost:${config.touchPort}/api/health`, 5000);
      checks.touchBackend = res.ok;
    } catch {}

    // Test heartbeat to Hub
    try {
      const res = await fetch(`${config.cloudApiUrl}/api/masters/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify({
          desk_id: config.deskId,
          status: "Online",
          version: app.getVersion(),
        }),
      });
      checks.heartbeat = res.ok;
    } catch {}

    log("info", "Health checks complete", checks);
    return checks;
  });

  // Save configuration
  ipcMain.handle("installer:saveConfig", async (_e: IpcMainInvokeEvent, config: Record<string, unknown>) => {
    log("info", "Saving installer configuration");
    try {
      const configPath = path.join(os.homedir(), ".clickflash", "installer-config.json");
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Launch applications
  ipcMain.handle("installer:launchApps", async (_e: IpcMainInvokeEvent, paths: { master?: string; touch?: string }) => {
    log("info", "Launching applications", paths);
    const results = { master: false, touch: false };

    if (paths.master && fs.existsSync(paths.master)) {
      try {
        spawn(paths.master, [], { detached: true, stdio: "ignore" });
        results.master = true;
      } catch (err: unknown) {
        log("error", "Failed to launch Master", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (paths.touch && fs.existsSync(paths.touch)) {
      try {
        spawn(paths.touch, [], { detached: true, stdio: "ignore" });
        results.touch = true;
      } catch (err: unknown) {
        log("error", "Failed to launch Touch", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    return results;
  });

  // Open directory picker
  ipcMain.handle("installer:selectDirectory", async () => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Installation Directory",
    });
    return canceled ? null : filePaths[0];
  });

  // Get installer logs
  ipcMain.handle("installer:getLogs", async () => {
    try {
      if (fs.existsSync(INSTALLER_LOG)) {
        return fs.readFileSync(INSTALLER_LOG, "utf8").split("\n").filter(Boolean).slice(-200);
      }
      return [];
    } catch {
      return [];
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function which(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    exec(`${process.platform === "win32" ? "where" : "which"} ${cmd}`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      resolve(stdout.trim().split("\n")[0]);
    });
  });
}

function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

async function getFreeSpaceGB(): Promise<number> {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      exec("wmic logicaldisk get size,freespace,caption", (err, stdout) => {
        if (err) return resolve(0);
        const lines = stdout.trim().split("\n").slice(1);
        let totalFree = 0;
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const free = parseInt(parts[1], 10);
            if (!isNaN(free)) totalFree += free;
          }
        }
        resolve(Math.round(totalFree / 1024 / 1024 / 1024));
      });
    } else {
      exec("df -k / | tail -1 | awk '{print $4}'", (err, stdout) => {
        if (err) return resolve(0);
        const kb = parseInt(stdout.trim(), 10);
        resolve(Math.round(kb / 1024 / 1024));
      });
    }
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function getHardwareFingerprint(): Promise<string> {
  const cpus = os.cpus();
  const network = os.networkInterfaces();
  const mac = Object.values(network)
    .flat()
    .find((iface) => iface && !iface.internal && iface.mac)?.mac || "unknown";
  const data = `${os.hostname()}-${mac}-${cpus[0]?.model || "unknown"}`;
  return require("crypto").createHash("sha256").update(data).digest("hex").slice(0, 32);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  setupIpc();
  createWindow();

  // Handle OAuth callback protocol
  protocol.handle("clickflash-installer", (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/callback") {
      const token = url.searchParams.get("token");
      if (token && mainWindow) {
        mainWindow.webContents.send("installer:oauth-callback", { token });
      }
    }
    return new Response("<html><body>You can close this window.</body></html>", {
      headers: { "Content-Type": "text/html" },
    });
  });
}).catch((err) => {
  log("error", "Fatal startup error", { error: err.message });
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
});

process.on("uncaughtException", (err) => {
  log("error", "Uncaught exception", { error: err.message, stack: err.stack });
});

process.on("unhandledRejection", (reason) => {
  log("error", "Unhandled rejection", { reason: String(reason) });
});
