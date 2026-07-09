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
import crypto from "crypto";
import dgram from "dgram";
import si from "systeminformation";
import { validateLicenseKey } from "./scripts/license-key";

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
const HUB_BASE = process.env.CLICKFLASH_HUB_BASE || "https://hub.clickflash.app";

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

  // Open external URL
  ipcMain.handle("installer:openExternalUrl", async (_e: IpcMainInvokeEvent, url: string) => {
    log("info", "Opening external URL", { url });
    await shell.openExternal(url);
    return { success: true };
  });

  // Validate license (OFFLINE — no server required)
  ipcMain.handle("installer:validateLicense", async (_e: IpcMainInvokeEvent, key: string) => {
    log("info", "Validating license key (offline)");
    try {
      const uuidInfo = await si.uuid();
      const machineId = uuidInfo.os || uuidInfo.hardware || "UNKNOWN_MACHINE";

      // Import the offline validator
      const result = await validateLicenseKey(key, machineId);
      
      if (result.valid && result.data) {
        return { 
          success: true, 
          data: {
            key: key,
            plan: result.data.plan,
            max_masters: result.data.maxMasters,
            expires_at: result.data.expiresAt,
            machine_id: machineId,
          }
        };
      }
      return { success: false, error: result.error || "Invalid license key" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "License validation failed", { error: msg });
      return { success: false, error: msg };
    }
  });

  // Request device code
  ipcMain.handle("installer:requestDeviceCode", async () => {
    log("info", "Requesting device code from Hub");
    try {
      const res = await fetch(`${HUB_BASE}/api/v1/oauth/device/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: "clickflash-installer" }),
      });
      if (res.ok) return { success: true, data: await res.json() };
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Poll for token
  ipcMain.handle("installer:pollForToken", async (_e: IpcMainInvokeEvent, deviceCode: string) => {
    try {
      const res = await fetch(`${HUB_BASE}/api/v1/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      return { success: res.ok, data, status: res.status };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Check desk_id availability
  ipcMain.handle("installer:checkDeskId", async (_e: IpcMainInvokeEvent, deskId: string) => {
    try {
      const res = await fetch(`${HUB_BASE}/api/masters/check-desk-id?desk_id=${encodeURIComponent(deskId)}`);
      if (res.ok) return { success: true, data: await res.json() };
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Register with Hub
  ipcMain.handle("installer:registerWithHub", async (_e: IpcMainInvokeEvent, payload: Record<string, unknown>) => {
    log("info", "Registering with Hub", { deskId: payload.desk_id });
    try {
      const res = await fetch(`${HUB_BASE}/api/masters/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${payload.access_token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { success: true, data: await res.json() };
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Send heartbeat
  ipcMain.handle("installer:sendHeartbeat", async (_e: IpcMainInvokeEvent, payload: Record<string, unknown>) => {
    try {
      const res = await fetch(`${HUB_BASE}/api/masters/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${payload.access_token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { success: true, data: await res.json() };
      return { success: false, error: `HTTP ${res.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
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

  // ─── Pairing: mDNS discovery ────────────────────────────────────────────────
  ipcMain.handle("installer:discoverMasters", async () => {
    log("info", "Browsing mDNS for ClickFlash Masters");
    const masters: Array<{
      desk_id: string;
      tenant_id: string;
      host: string;
      port: number;
      addresses: string[];
      latencyMs: number;
    }> = [];

    try {
      const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
      socket.bind(5353, () => {
        socket.addMembership("224.0.0.251");
      });

      const query = buildMdnsQuery("_clickflash-master._tcp.local");
      socket.send(query, 5353, "224.0.0.251");

      const responses = await new Promise<Buffer[]>((resolve) => {
        const packets: Buffer[] = [];
        const timer = setTimeout(() => {
          socket.close();
          resolve(packets);
        }, 5000);
        socket.on("message", (msg) => {
          packets.push(msg);
        });
        socket.on("error", () => {
          clearTimeout(timer);
          socket.close();
          resolve(packets);
        });
      });

      const records = parseMdnsResponses(responses);
      for (const svc of records) {
        if (!svc.host || !svc.port) continue;
        const start = Date.now();
        let alive = false;
        try {
          const res = await fetchWithTimeout(`http://${svc.host}:${svc.port}/api/v1/pairing/challenge`, 1500);
          alive = res.ok;
        } catch {
          alive = false;
        }
        if (alive) {
          masters.push({
            desk_id: svc.desk_id || svc.host,
            tenant_id: svc.tenant_id || "default",
            host: svc.host,
            port: svc.port,
            addresses: svc.addresses,
            latencyMs: Date.now() - start,
          });
        }
      }
    } catch (err: unknown) {
      log("warn", "mDNS discovery failed", { error: err instanceof Error ? err.message : String(err) });
    }

    log("info", `mDNS discovered ${masters.length} master(s)`);
    return { success: true, masters };
  });

  // ─── Pairing: LAN sweep ───────────────────────────────────────────────────
  ipcMain.handle("installer:scanLan", async () => {
    log("info", "Sweeping LAN for ClickFlash Masters on port 8090");
    const masters: Array<{
      desk_id: string;
      tenant_id: string;
      host: string;
      port: number;
      addresses: string[];
      latencyMs: number;
    }> = [];

    const subnets = getLocalSubnets();
    const ports = [8090, 8080];
    const candidates: string[] = [];

    for (const subnet of subnets) {
      for (let i = 1; i <= 254; i++) {
        candidates.push(`${subnet}.${i}`);
      }
    }

    // Limit sweep to avoid excessive traffic
    const sweepTargets = candidates.slice(0, 512);

    await Promise.all(
      sweepTargets.map(async (ip) => {
        for (const port of ports) {
          const start = Date.now();
          try {
            const res = await fetchWithTimeout(`http://${ip}:${port}/api/v1/pairing/challenge`, 1500);
            if (res.ok) {
              const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
              masters.push({
                desk_id: (data.desk_id as string) || ip,
                tenant_id: (data.tenant_id as string) || "default",
                host: ip,
                port,
                addresses: [ip],
                latencyMs: Date.now() - start,
              });
              return; // found on this IP, stop trying other ports
            }
          } catch {
            // ignore unreachable hosts
          }
        }
      })
    );

    log("info", `LAN sweep found ${masters.length} master(s)`);
    return { success: true, masters };
  });

  // ─── Pairing: exchange challenge for HMAC secret ────────────────────────────
  ipcMain.handle("installer:exchangePairing", async (_e, params: {
    masterHost: string;
    masterPort: number;
    masterDeskId: string;
    kioskId: string;
    hardwareFingerprint: string;
  }) => {
    log("info", "Exchanging pairing with master", { deskId: params.masterDeskId });
    try {
      // 1. GET challenge
      const challengeRes = await fetchWithTimeout(
        `http://${params.masterHost}:${params.masterPort}/api/v1/pairing/challenge`,
        5000
      );
      if (!challengeRes.ok) {
        return { success: false, error: `Challenge request failed: HTTP ${challengeRes.status}` };
      }
      const challengeData = (await challengeRes.json()) as { nonce?: string; error?: string };
      const nonce = challengeData.nonce;
      if (!nonce) {
        return { success: false, error: "Invalid challenge response: missing nonce" };
      }

      // 2. Build signature
      const secret = params.masterDeskId + params.hardwareFingerprint;
      const signature = crypto
        .createHmac("sha256", secret)
        .update(params.kioskId + nonce)
        .digest("hex");

      // 3. POST exchange
      const exchangeRes = await fetchWithTimeout(
        `http://${params.masterHost}:${params.masterPort}/api/v1/pairing/exchange`,
        5000,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kiosk_id: params.kioskId,
            nonce,
            signature,
            hardware_fingerprint: params.hardwareFingerprint,
          }),
        }
      );
      if (!exchangeRes.ok) {
        return { success: false, error: `Exchange request failed: HTTP ${exchangeRes.status}` };
      }
      const exchangeData = (await exchangeRes.json()) as {
        hmac_secret?: string;
        tenant_id?: string;
        master_desk_id?: string;
        master_ip?: string;
        master_port?: number;
        error?: string;
      };

      if (!exchangeData.hmac_secret) {
        return { success: false, error: exchangeData.error || "Exchange response missing hmac_secret" };
      }

      return {
        success: true,
        hmac_secret: exchangeData.hmac_secret,
        tenant_id: exchangeData.tenant_id || "default",
        master_desk_id: exchangeData.master_desk_id || params.masterDeskId,
        master_ip: exchangeData.master_ip || params.masterHost,
        master_port: exchangeData.master_port || params.masterPort,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "Pairing exchange failed", { error: msg });
      return { success: false, error: msg };
    }
  });

  // ─── Pairing: generate kiosk ID ─────────────────────────────────────────────
  ipcMain.handle("installer:generateKioskId", async (_e, _hardwareFingerprint: string) => {
    log("info", "Generating kiosk_id");
    const location = os.hostname().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    return { kioskId: `KIOSK_${location}_${suffix}` };
  });

  // ─── Hardware fingerprint ───────────────────────────────────────────────────
  ipcMain.handle("installer:getHardwareFingerprint", async () => {
    log("info", "Getting hardware fingerprint");
    return { fingerprint: await getHardwareFingerprint() };
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

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...(init || {}), signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ─── mDNS helpers ─────────────────────────────────────────────────────────────
function buildMdnsQuery(name: string): Buffer {
  // Minimal mDNS query packet
  const id = crypto.randomBytes(2);
  const flags = Buffer.from([0x00, 0x00]);
  const questions = Buffer.from([0x00, 0x01]);
  const answerRRs = Buffer.from([0x00, 0x00]);
  const authorityRRs = Buffer.from([0x00, 0x00]);
  const additionalRRs = Buffer.from([0x00, 0x00]);
  const qName = encodeDnsName(name);
  const qType = Buffer.from([0x00, 0x0c]); // PTR
  const qClass = Buffer.from([0x00, 0x01]); // IN
  return Buffer.concat([id, flags, questions, answerRRs, authorityRRs, additionalRRs, qName, qType, qClass]);
}

function encodeDnsName(name: string): Buffer {
  const parts = name.split(".");
  const buffers: Buffer[] = [];
  for (const part of parts) {
    buffers.push(Buffer.from([part.length]));
    buffers.push(Buffer.from(part, "ascii"));
  }
  buffers.push(Buffer.from([0x00]));
  return Buffer.concat(buffers);
}

interface MdnsService {
  host: string;
  port: number;
  desk_id: string;
  tenant_id: string;
  addresses: string[];
}

function parseMdnsResponses(packets: Buffer[]): MdnsService[] {
  const services = new Map<string, MdnsService>();
  for (const pkt of packets) {
    try {
      let offset = 12; // skip header
      const qdcount = pkt.readUInt16BE(4);
      const ancount = pkt.readUInt16BE(6);
      // skip questions
      for (let i = 0; i < qdcount; i++) {
        const res = skipName(pkt, offset);
        offset = res.offset + 4; // QTYPE + QCLASS
      }
      let currentHost = "";
      let currentPort = 0;
      let currentDeskId = "";
      let currentTenantId = "";
      const currentAddresses: string[] = [];
      for (let i = 0; i < ancount; i++) {
        const nameRes = readName(pkt, offset);
        offset = nameRes.offset;
        const type = pkt.readUInt16BE(offset);
        offset += 2;
        const rdlength = pkt.readUInt16BE(offset);
        offset += 2;
        const rdata = pkt.slice(offset, offset + rdlength);
        offset += rdlength;

        if (type === 12) {
          // PTR — read the name to advance the offset; the desk_id/tenant_id are
          // resolved in the SRV+TXT records that follow.
          const ptrRes = readName(pkt, offset - rdlength);
          void ptrRes.name;
        } else if (type === 33) {
          // SRV
          currentPort = rdata.readUInt16BE(4);
          const targetRes = readName(pkt, offset - rdlength + 6);
          currentHost = targetRes.name;
        } else if (type === 16) {
          // TXT
          let txtOffset = 0;
          while (txtOffset < rdata.length) {
            const len = rdata[txtOffset];
            txtOffset++;
            const txt = rdata.slice(txtOffset, txtOffset + len).toString("utf8");
            txtOffset += len;
            if (txt.startsWith("desk_id=")) currentDeskId = txt.slice(8);
            if (txt.startsWith("tenant_id=")) currentTenantId = txt.slice(10);
          }
        } else if (type === 1) {
          // A
          currentAddresses.push(`${rdata[0]}.${rdata[1]}.${rdata[2]}.${rdata[3]}`);
        }
      }
      if (currentHost && currentPort) {
        const key = `${currentHost}:${currentPort}`;
        services.set(key, {
          host: currentAddresses[0] || currentHost,
          port: currentPort,
          desk_id: currentDeskId || currentHost,
          tenant_id: currentTenantId || "default",
          addresses: currentAddresses.length ? currentAddresses : [currentHost],
        });
      }
    } catch {
      // ignore malformed packets
    }
  }
  return Array.from(services.values());
}

function skipName(buf: Buffer, offset: number): { offset: number } {
  let o = offset;
  while (o < buf.length) {
    const len = buf[o];
    if (len === 0) {
      o++;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      o += 2;
      break;
    }
    o += len + 1;
  }
  return { offset: o };
}

function readName(buf: Buffer, offset: number): { name: string; offset: number } {
  const parts: string[] = [];
  let o = offset;
  let jumped = false;
  const visited = new Set<number>();
  while (o < buf.length) {
    if (visited.has(o)) break;
    visited.add(o);
    const len = buf[o];
    if (len === 0) {
      if (!jumped) o++;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      const pointer = buf.readUInt16BE(o) & 0x3fff;
      if (!jumped) {
        o += 2;
        jumped = true;
      }
      o = pointer;
      continue;
    }
    o++;
    parts.push(buf.slice(o, o + len).toString("ascii"));
    o += len;
  }
  return { name: parts.join("."), offset: o };
}

function getLocalSubnets(): string[] {
  const nets = os.networkInterfaces();
  const subnets = new Set<string>();
  for (const addrs of Object.values(nets)) {
    for (const addr of addrs || []) {
      if (addr.family === "IPv4" && !addr.internal) {
        const parts = addr.address.split(".");
        if (parts.length === 4) {
          subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
        }
      }
    }
  }
  // Fallback subnets if we can't detect
  if (subnets.size === 0) {
    subnets.add("192.168.1");
    subnets.add("10.0.0");
  }
  return Array.from(subnets);
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
  // Reference isQuitting to avoid the noUnusedLocals error while keeping the flag available
  // for future handlers (e.g., prevent the window from being closed if a save is in progress).
  void isQuitting;
});

process.on("uncaughtException", (err) => {
  log("error", "Uncaught exception", { error: err.message, stack: err.stack });
});

process.on("unhandledRejection", (reason) => {
  log("error", "Unhandled rejection", { reason: String(reason) });
});
