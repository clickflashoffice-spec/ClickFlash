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
  safeStorage,
  shell,
  IpcMainInvokeEvent,
} from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import http from "http";
import { spawn, exec } from "child_process";
import { lookup } from "dns/promises";
import crypto from "crypto";
import dgram from "dgram";
import si from "systeminformation";
import { isValidLicensePublicKey, validateLicenseKey } from "./scripts/license-key";
import { fetchBoundedJson } from "./electron-network-security";
import {
  protectInstallerConfig,
  writeJsonAtomic,
} from "./installer-config";
import {
  createApplicationConfigurationFiles,
  getMissingApplicationExecutables,
  getCanonicalApplicationExecutable,
  writeFilesTransactionally,
} from "./installer-application-config";
import {
  loadAndVerifyPayloadBundle,
  type PayloadComponentId,
  type VerifiedPayloadBundle,
} from "./installer-payload-verification";
import {
  INSTALLATION_CONFIG_FILENAME,
  installOrRepairPayloadBundle,
} from "./installer-payload-installation";
import {
  getDevelopmentPayloadTrustRoots,
  PACKAGED_PAYLOAD_TRUST_ROOTS,
} from "./installer-payload-trust";
import {
  cloudflareAccountsResponseSchema,
  cloudflareTokenSchema,
  deskAvailabilityResponseSchema,
  deskIdSchema,
  deviceCodeResponseSchema,
  deviceCodeSchema,
  externalUrlSchema,
  fleetRegistrationSchema,
  hardwareFingerprintSchema,
  heartbeatResponseSchema,
  heartbeatSchema,
  healthCheckSchema,
  installPayloadSchema,
  installerConfigSchema,
  launchAppsSchema,
  licenseKeySchema,
  pairingChallengeResponseSchema,
  pairingExchangeSchema,
  pairingResponseSchema,
  registerWithHubSchema,
  registrationResponseSchema,
  remoteErrorResponseSchema,
  tokenResponseSchema,
  validatedLicenseSchema,
  writeEnvConfigSchema,
} from "./installer-ipc-schemas";
import { logger } from '@clickflash/logger';
import {
  getApprovedDirectory,
  getPinnedPrivateIpv4,
  getPrivateLanHost,
  getSafeExternalUrl,
  getSafeCloudBaseUrl,
  getValidPort,
  isPrivateIpv4,
  isTrustedRendererUrl,
} from "./electron-security";

// ─── Protocol Registration ────────────────────────────────────────────────────
protocol.registerSchemesAsPrivileged([
  {
    scheme: "clickflash-installer",
    privileges: {
      secure: true,
      standard: true,
    },
  },
]);

// ─── Config ───────────────────────────────────────────────────────────────────
const WIZARD_PORT = 5175;
const WIZARD_URL = `http://localhost:${WIZARD_PORT}`;
const WIZARD_ORIGIN = new URL(WIZARD_URL).origin;
const RENDERER_ENTRY = path.join(__dirname, "../renderer/index.html");
const INSTALLER_LOG = path.join(os.tmpdir(), "clickflash-installer.log");
const DEFAULT_HUB_BASE = "https://management-hub.clickflash-office.workers.dev";
const ALLOWED_CLOUD_API_HOSTS = [
  "management-hub.clickflash-office.workers.dev",
  "hub.clickflash.app",
  "management.clickflash.app",
] as const;
const HUB_BASE = getSafeCloudBaseUrl(
  process.env.CLICKFLASH_HUB_BASE || DEFAULT_HUB_BASE,
  ALLOWED_CLOUD_API_HOSTS,
) || DEFAULT_HUB_BASE;
const ALLOWED_EXTERNAL_HOSTS = [
  "dash.cloudflare.com",
  ...ALLOWED_CLOUD_API_HOSTS,
];

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

function loadConfiguredLicensePublicKey(): string | null {
  const environmentKey = process.env.CLICKFLASH_LICENSE_PUBLIC_KEY?.trim();
  if (isValidLicensePublicKey(environmentKey)) return environmentKey;
  if (!app.isPackaged) return null;

  try {
    const trustPath = path.join(process.resourcesPath, "license-public-key.txt");
    const stat = fs.lstatSync(trustPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > 256) return null;
    const packagedKey = fs.readFileSync(trustPath, "utf8").trim();
    return isValidLicensePublicKey(packagedKey) ? packagedKey : null;
  } catch {
    return null;
  }
}
let isQuitting = false;
let approvedInstallDirectory: string | null = null;
let approvedPayloadBundle: VerifiedPayloadBundle | null = null;
let installedPayloadManifestSha256: string | null = null;

const PAYLOAD_CONFIGURATION_EXTRAS = {
  master: [".env"],
  touch: [".env"],
} as const;

function getPayloadTrustRoots() {
  return app.isPackaged
    ? PACKAGED_PAYLOAD_TRUST_ROOTS
    : getDevelopmentPayloadTrustRoots(process.env);
}

function getRequestedPayloadComponents(applications: readonly string[]): PayloadComponentId[] {
  return applications.includes("touch") ? ["master", "touch"] : ["master"];
}

async function reverifyInstalledPayload(
  requiredComponents: PayloadComponentId[],
): Promise<VerifiedPayloadBundle> {
  if (!approvedInstallDirectory || !installedPayloadManifestSha256) {
    throw new Error("Applications must be installed or repaired before configuration");
  }
  const verified = await loadAndVerifyPayloadBundle(
    approvedInstallDirectory,
    getPayloadTrustRoots(),
    app.getVersion(),
    {
      requiredComponents,
      allowedExtraPaths: PAYLOAD_CONFIGURATION_EXTRAS,
      allowedExtraRootPaths: [INSTALLATION_CONFIG_FILENAME],
    },
  );
  if (verified.summary.manifestSha256 !== installedPayloadManifestSha256) {
    throw new Error("Installed payload no longer matches the approved release");
  }
  return verified;
}

// ─── Logging ──────────────────────────────────────────────────────────────────
function log(level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>): void {
  const entry = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${meta ? " " + JSON.stringify(meta) : ""}\n`;
  try {
    fs.appendFileSync(INSTALLER_LOG, entry);
  } catch {}
  logger.info(entry.trim());
}

function isTrustedIpcSender(event: IpcMainInvokeEvent): boolean {
  return Boolean(
    mainWindow
    && !mainWindow.isDestroyed()
    && event.sender === mainWindow.webContents
    && event.senderFrame === mainWindow.webContents.mainFrame,
  );
}

function registerIpcHandler<Args extends unknown[], Result>(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: Args) => Result,
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedIpcSender(event)) {
      log("warn", "Blocked IPC from untrusted frame", { channel, url: event.senderFrame?.url });
      throw new Error("Unauthorized IPC sender");
    }
    return listener(event, ...(args as Args));
  });
}

async function openExternalHttps(value: unknown): Promise<{ success: boolean; error?: string }> {
  const safeUrl = getSafeExternalUrl(value, ALLOWED_EXTERNAL_HOSTS);
  if (!safeUrl) return { success: false, error: "Only approved HTTPS URLs may be opened" };
  try {
    await shell.openExternal(safeUrl);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function getRemoteError(data: unknown, fallback: string): string {
  const parsed = remoteErrorResponseSchema.safeParse(data);
  return parsed.success ? parsed.data.error : fallback;
}

async function resolvePrivateLanIpv4(host: string): Promise<string> {
  const safeHost = getPrivateLanHost(host);
  if (!safeHost) throw new Error("Pairing target is not a private LAN host");

  const directAddress = getPinnedPrivateIpv4(safeHost, []);
  if (directAddress) return directAddress;

  const records = await lookup(safeHost, { all: true, family: 4 });
  const pinnedAddress = getPinnedPrivateIpv4(
    safeHost,
    records.map((record) => record.address),
  );
  if (!pinnedAddress) {
    throw new Error("Pairing target did not resolve exclusively to private IPv4 addresses");
  }
  return pinnedAddress;
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
    if (!isTrustedRendererUrl(url, app.isPackaged, WIZARD_ORIGIN, RENDERER_ENTRY)) {
      event.preventDefault();
      void openExternalHttps(url).then((result) => {
        if (!result.success) log("warn", "Blocked renderer navigation", { url });
      });
    }
  });

  mainWindow.webContents.on("will-redirect", (event, url) => {
    if (!isTrustedRendererUrl(url, app.isPackaged, WIZARD_ORIGIN, RENDERER_ENTRY)) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalHttps(url).then((result) => {
      if (!result.success) log("warn", "Blocked new-window URL", { url });
    });
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // Load wizard
  if (app.isPackaged) {
    Promise.resolve(mainWindow.loadFile(RENDERER_ENTRY)).catch((err) => {
      log("error", "Failed to load renderer", { error: err.message });
    });
  } else {
    Promise.resolve(mainWindow.loadURL(WIZARD_URL)).catch((err) => {
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
  registerIpcHandler("installer:checkPrerequisites", async () => {
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
        const cleanVersion = version.trim();
        results.nodeVersion = cleanVersion;
        const major = parseInt(cleanVersion.replace("v", "").split(".")[0] || "0", 10);
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
  registerIpcHandler("installer:openOAuth", async (_e: IpcMainInvokeEvent, url: string) => {
    const parsed = externalUrlSchema.safeParse(url);
    const result = parsed.success
      ? await openExternalHttps(parsed.data)
      : { success: false, error: "Invalid OAuth URL" };
    log(result.success ? "info" : "warn", result.success ? "Opened OAuth URL" : "Blocked OAuth URL");
    return result;
  });

  // Open external URL
  registerIpcHandler("installer:openExternalUrl", async (_e: IpcMainInvokeEvent, url: string) => {
    const parsed = externalUrlSchema.safeParse(url);
    const result = parsed.success
      ? await openExternalHttps(parsed.data)
      : { success: false, error: "Invalid external URL" };
    log(result.success ? "info" : "warn", result.success ? "Opened external URL" : "Blocked external URL");
    return result;
  });

  // Validate license (OFFLINE — no server required)
  registerIpcHandler("installer:validateLicense", async (_e: IpcMainInvokeEvent, key: string) => {
    log("info", "Validating license key (offline)");
    const parsed = licenseKeySchema.safeParse(key);
    if (!parsed.success) return { success: false, error: "Invalid license key format" };
    try {
      const uuidInfo = await si.uuid();
      const machineId = uuidInfo.os || uuidInfo.hardware;
      if (!machineId || machineId === "-") {
        return { success: false, error: "Stable hardware identity is unavailable" };
      }
      const publicKey = loadConfiguredLicensePublicKey();
      if (!isValidLicensePublicKey(publicKey)) {
        return { success: false, error: "License trust root is not configured" };
      }

      // Import the offline validator
      const result = await validateLicenseKey(parsed.data, machineId, publicKey);
      
      if (result.valid && result.data) {
        const validated = validatedLicenseSchema.safeParse({
            key: parsed.data,
            plan: result.data.plan,
            max_masters: result.data.maxMasters,
            expires_at: result.data.expiresAt,
            machine_id: machineId,
        });
        return validated.success
          ? { success: true, data: validated.data }
          : { success: false, error: "Invalid signed license payload" };
      }
      return { success: false, error: result.error || "Invalid license key" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "License validation failed", { error: msg });
      return { success: false, error: msg };
    }
  });

  // Request device code
  registerIpcHandler("installer:requestDeviceCode", async () => {
    log("info", "Requesting device code from Hub");
    try {
      const { response, data } = await fetchBoundedJson(`${HUB_BASE}/api/v1/oauth/device/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: "clickflash-installer" }),
      }, { maxBytes: 65_536 });
      if (!response.ok) {
        return { success: false, error: getRemoteError(data, `HTTP ${response.status}`) };
      }
      const parsed = deviceCodeResponseSchema.safeParse(data);
      return parsed.success
        ? { success: true, data: parsed.data }
        : { success: false, error: "Invalid device-code response from Hub" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Poll for token
  registerIpcHandler("installer:pollForToken", async (_e: IpcMainInvokeEvent, deviceCode: string) => {
    const input = deviceCodeSchema.safeParse(deviceCode);
    if (!input.success) return { success: false, error: "Invalid device code" };
    try {
      const { response, data } = await fetchBoundedJson(`${HUB_BASE}/api/v1/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: input.data,
        }),
      }, { maxBytes: 65_536 });
      const parsed = tokenResponseSchema.safeParse(data);
      if (!parsed.success) return { success: false, error: "Invalid token response from Hub" };
      return { success: response.ok, data: parsed.data, status: response.status };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Check desk_id availability
  registerIpcHandler("installer:checkDeskId", async (_e: IpcMainInvokeEvent, deskId: string) => {
    const input = deskIdSchema.safeParse(deskId);
    if (!input.success) return { success: false, error: "Invalid desk ID" };
    try {
      const { response, data } = await fetchBoundedJson(
        `${HUB_BASE}/api/masters/check-desk-id?desk_id=${encodeURIComponent(input.data)}`,
        {},
        { maxBytes: 65_536 },
      );
      if (!response.ok) {
        return { success: false, error: getRemoteError(data, `HTTP ${response.status}`) };
      }
      const parsed = deskAvailabilityResponseSchema.safeParse(data);
      return parsed.success
        ? { success: true, data: parsed.data }
        : { success: false, error: "Invalid desk availability response from Hub" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Register with Hub
  registerIpcHandler("installer:registerWithHub", async (_e: IpcMainInvokeEvent, payload: Record<string, unknown>) => {
    const input = registerWithHubSchema.safeParse(payload);
    if (!input.success) return { success: false, error: "Invalid Hub registration payload" };
    const { access_token: accessToken, ...registration } = input.data;
    log("info", "Registering with Hub", { deskId: registration.desk_id });
    try {
      const { response, data } = await fetchBoundedJson(`${HUB_BASE}/api/masters/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify(registration),
      }, { maxBytes: 262_144 });
      if (!response.ok) {
        return { success: false, error: getRemoteError(data, `HTTP ${response.status}`) };
      }
      const parsed = registrationResponseSchema.safeParse(data);
      return parsed.success
        ? { success: true, data: parsed.data }
        : { success: false, error: "Invalid registration response from Hub" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Send heartbeat
  registerIpcHandler("installer:sendHeartbeat", async (_e: IpcMainInvokeEvent, payload: Record<string, unknown>) => {
    const input = heartbeatSchema.safeParse(payload);
    if (!input.success) return { success: false, error: "Invalid heartbeat payload" };
    const { access_token: accessToken, ...heartbeat } = input.data;
    try {
      const { response, data } = await fetchBoundedJson(`${HUB_BASE}/api/masters/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify(heartbeat),
      }, { maxBytes: 65_536 });
      if (!response.ok) {
        return { success: false, error: getRemoteError(data, `HTTP ${response.status}`) };
      }
      const parsed = heartbeatResponseSchema.safeParse(data);
      return parsed.success
        ? { success: true, data: parsed.data }
        : { success: false, error: "Invalid heartbeat response from Hub" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Cloudflare API test
  registerIpcHandler("installer:testCloudflareToken", async (_e: IpcMainInvokeEvent, token: string) => {
    log("info", "Testing Cloudflare API token");
    const input = cloudflareTokenSchema.safeParse(token);
    if (!input.success) return { success: false, error: "Invalid Cloudflare token format" };
    try {
      const { data } = await fetchBoundedJson("https://api.cloudflare.com/client/v4/accounts", {
        headers: { Authorization: `Bearer ${input.data}`, "Content-Type": "application/json" },
      }, { maxBytes: 524_288 });
      const parsed = cloudflareAccountsResponseSchema.safeParse(data);
      if (parsed.success && parsed.data.success && parsed.data.result) {
        return { success: true, accounts: parsed.data.result };
      }
      return { success: false, error: "Invalid token or insufficient permissions" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Fleet registration
  registerIpcHandler("installer:registerFleet", async (_e: IpcMainInvokeEvent, payload: {
    deskId: string;
    name: string;
    location: string;
    country: string;
    timezone: string;
    currency: string;
    cloudApiUrl: string;
    token: string;
  }) => {
    const input = fleetRegistrationSchema.safeParse(payload);
    if (!input.success) {
      return { success: false, error: "Invalid fleet registration payload" };
    }
    const cloudApiUrl = getSafeCloudBaseUrl(input.data.cloudApiUrl, ALLOWED_CLOUD_API_HOSTS);
    if (!cloudApiUrl) return { success: false, error: "Invalid fleet registration payload" };
    const { deskId, name, location, country, timezone, currency, token } = input.data;

    log("info", "Registering fleet", { deskId });
    try {
      const { response, data } = await fetchBoundedJson(`${cloudApiUrl}/api/masters/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          desk_id: deskId,
          name,
          location,
          country,
          timezone,
          currency,
          hardware_fingerprint: await getHardwareFingerprint(),
          version: app.getVersion(),
        }),
      }, { maxBytes: 262_144 });
      if (!response.ok) {
        return { success: false, error: getRemoteError(data, `HTTP ${response.status}`) };
      }
      const parsed = registrationResponseSchema.safeParse(data);
      return parsed.success
        ? { success: true, data: parsed.data }
        : { success: false, error: "Invalid fleet registration response" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Health checks
  registerIpcHandler("installer:runHealthChecks", async (_e: IpcMainInvokeEvent, config: {
    masterPort: number;
    touchPort: number;
    cloudApiUrl: string;
    deskId: string;
    token: string;
  }) => {
    const input = healthCheckSchema.safeParse(config);
    if (!input.success) {
      throw new Error("Invalid health-check configuration");
    }
    const cloudApiUrl = getSafeCloudBaseUrl(input.data.cloudApiUrl, ALLOWED_CLOUD_API_HOSTS);
    if (!cloudApiUrl) throw new Error("Invalid health-check configuration");
    const { masterPort, touchPort, deskId, token } = input.data;

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
      const res = await fetchWithTimeout(`http://localhost:${masterPort}/api/health`, 5000);
      checks.masterBackend = res.ok;
    } catch {}

    // Test Touch backend
    try {
      const res = await fetchWithTimeout(`http://localhost:${touchPort}/api/health`, 5000);
      checks.touchBackend = res.ok;
    } catch {}

    // Test heartbeat to Hub
    try {
      const res = await fetch(`${cloudApiUrl}/api/masters/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          desk_id: deskId,
          status: "Online",
          version: app.getVersion(),
        }),
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      checks.heartbeat = res.ok;
    } catch {}

    log("info", "Health checks complete", checks);
    return checks;
  });

  // Save configuration
  registerIpcHandler("installer:saveConfig", async (_e: IpcMainInvokeEvent, config: Record<string, unknown>) => {
    log("info", "Saving installer configuration");
    const input = installerConfigSchema.safeParse(config);
    if (!input.success) return { success: false, error: "Invalid installer configuration" };
    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, error: "OS-protected storage is unavailable" };
    }
    try {
      const configPath = path.join(os.homedir(), ".clickflash", "installer-config.json");
      const protectedConfig = protectInstallerConfig(
        input.data,
        (plainText) => safeStorage.encryptString(plainText),
      );
      writeJsonAtomic(configPath, protectedConfig);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // Launch applications
  registerIpcHandler("installer:launchApps", async (_e: IpcMainInvokeEvent, payload: unknown) => {
    log("info", "Launching approved applications");
    const results = { master: false, touch: false };
    const input = launchAppsSchema.safeParse(payload);
    if (!input.success || !approvedInstallDirectory) return results;

    try {
      await reverifyInstalledPayload(input.data.components);
    } catch (err: unknown) {
      log("error", "Payload re-verification failed before launch", {
        error: err instanceof Error ? err.message : String(err),
      });
      return results;
    }

    for (const application of input.data.components) {
      const executable = getCanonicalApplicationExecutable(approvedInstallDirectory, application);
      if (!executable) continue;
      try {
        spawn(executable, [], {
          cwd: path.dirname(executable),
          detached: true,
          stdio: "ignore",
        }).unref();
        results[application] = true;
      } catch (err: unknown) {
        log("error", `Failed to launch ${application}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  });

  // Select and cryptographically verify a local application payload bundle.
  registerIpcHandler("installer:selectPayloadBundle", async () => {
    if (!mainWindow) return { success: false, error: "Installer window is unavailable" };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select Signed ClickFlash Payload Bundle",
    });
    if (canceled) return { success: false, canceled: true };
    const selectedDirectory = getApprovedDirectory(filePaths[0]);
    if (!selectedDirectory) {
      approvedPayloadBundle = null;
      installedPayloadManifestSha256 = null;
      return { success: false, error: "Selected payload directory is invalid" };
    }
    try {
      const verified = await loadAndVerifyPayloadBundle(
        selectedDirectory,
        getPayloadTrustRoots(),
        app.getVersion(),
      );
      approvedPayloadBundle = verified;
      installedPayloadManifestSha256 = null;
      log("info", "Payload bundle verified", {
        releaseId: verified.summary.releaseId,
        version: verified.summary.version,
        keyId: verified.summary.keyId,
        components: verified.summary.components,
        fileCount: verified.summary.fileCount,
      });
      return {
        success: true,
        directory: verified.directory,
        summary: verified.summary,
      };
    } catch (err: unknown) {
      approvedPayloadBundle = null;
      installedPayloadManifestSha256 = null;
      const error = err instanceof Error ? err.message : String(err);
      log("warn", "Payload bundle verification failed", { error });
      return { success: false, error };
    }
  });

  registerIpcHandler("installer:selectInstallDirectory", async () => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
      title: "Select ClickFlash Installation Destination",
    });
    if (canceled) return null;
    const selectedDirectory = getApprovedDirectory(filePaths[0]);
    if (!selectedDirectory) return null;
    try {
      const canonicalDirectory = fs.realpathSync(selectedDirectory);
      const stats = fs.lstatSync(canonicalDirectory);
      if (!stats.isDirectory() || stats.isSymbolicLink()) return null;
      approvedInstallDirectory = canonicalDirectory;
      installedPayloadManifestSha256 = null;
      return approvedInstallDirectory;
    } catch {
      return null;
    }
  });

  registerIpcHandler("installer:installPayload", async (_e, payload: unknown) => {
    const input = installPayloadSchema.safeParse(payload);
    if (!input.success) {
      return { success: false, error: "Invalid application installation request" };
    }
    if (!approvedPayloadBundle || !approvedInstallDirectory) {
      return { success: false, error: "Select a signed bundle and installation destination first" };
    }

    try {
      const result = await installOrRepairPayloadBundle(
        approvedPayloadBundle.directory,
        approvedInstallDirectory,
        getPayloadTrustRoots(),
        app.getVersion(),
        input.data.components,
        { expectedManifestSha256: approvedPayloadBundle.summary.manifestSha256 },
      );
      installedPayloadManifestSha256 = result.summary.manifestSha256;
      log("info", result.mode === "install" ? "Application payload installed" : "Application payload repaired", {
        releaseId: result.summary.releaseId,
        version: result.summary.version,
        components: result.summary.components,
        recoveryBackupPreserved: Boolean(result.recoveryBackup),
      });
      return {
        success: true,
        mode: result.mode,
        summary: result.summary,
        warning: result.recoveryBackup
          ? "Installation completed, but a recovery backup could not be removed"
          : undefined,
      };
    } catch (err: unknown) {
      installedPayloadManifestSha256 = null;
      const error = err instanceof Error ? err.message : String(err);
      log("error", "Application payload transaction failed", { error });
      return { success: false, error };
    }
  });

  registerIpcHandler("installer:writeEnvConfig", async (_e, params: unknown) => {
    const input = writeEnvConfigSchema.safeParse(params);
    if (!input.success) {
      return { success: false, error: "Invalid application configuration payload" };
    }
    const requestedDirectory = getApprovedDirectory(input.data.targetDir);
    if (
      !requestedDirectory
      || !approvedInstallDirectory
      || path.resolve(requestedDirectory).toLowerCase() !== path.resolve(approvedInstallDirectory).toLowerCase()
    ) {
      return { success: false, error: "Application configuration directory was not approved" };
    }

    try {
      await reverifyInstalledPayload(getRequestedPayloadComponents(input.data.selectedApps));
      const missingExecutables = getMissingApplicationExecutables(
        approvedInstallDirectory,
        input.data.selectedApps,
      );
      if (missingExecutables.length > 0) {
        return {
          success: false,
          error: `Managed application payload is incomplete: ${missingExecutables.join(", ")}`,
        };
      }
      const files = createApplicationConfigurationFiles(
        input.data,
        HUB_BASE,
        app.getVersion(),
      );
      writeFilesTransactionally(approvedInstallDirectory, files);
      log("info", "Application configuration committed", {
        files: files.map((file) => file.relativePath),
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log("error", "Application configuration transaction failed", { error: message });
      return { success: false, error: message };
    }
  });

  registerIpcHandler("installer:getGeolocation", async () => ({
    success: false,
    error: "Automatic IP geolocation is disabled; enter the location manually",
  }));

  // Get installer logs
  registerIpcHandler("installer:getLogs", async () => {
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
  registerIpcHandler("installer:discoverMasters", async () => {
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
        const port = getValidPort(svc.port);
        const host = getPrivateLanHost(svc.host);
        if (!host || !port) continue;
        const start = Date.now();
        try {
          const pinnedIp = await resolvePrivateLanIpv4(host);
          const result = await fetchBoundedJson(
            `http://${pinnedIp}:${port}/api/v1/pairing/challenge`,
            {},
            { timeoutMs: 1_500, maxBytes: 16_384 },
          );
          const challenge = pairingChallengeResponseSchema.safeParse(result.data);
          if (!result.response.ok || !challenge.success) continue;
          const deskId = deskIdSchema.safeParse(svc.desk_id);
          const tenantId = deskIdSchema.safeParse(svc.tenant_id);
          masters.push({
            desk_id: deskId.success ? deskId.data : pinnedIp,
            tenant_id: tenantId.success ? tenantId.data : "default",
            host: pinnedIp,
            port,
            addresses: [pinnedIp],
            latencyMs: Date.now() - start,
          });
        } catch {
          // Ignore unresolvable, public, or unavailable advertisements.
        }
      }
    } catch (err: unknown) {
      log("warn", "mDNS discovery failed", { error: err instanceof Error ? err.message : String(err) });
    }

    log("info", `mDNS discovered ${masters.length} master(s)`);
    return { success: true, masters };
  });

  // ─── Pairing: LAN sweep ───────────────────────────────────────────────────
  registerIpcHandler("installer:scanLan", async () => {
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
            const result = await fetchBoundedJson(
              `http://${ip}:${port}/api/v1/pairing/challenge`,
              {},
              { timeoutMs: 1_500, maxBytes: 16_384 },
            );
            const challenge = pairingChallengeResponseSchema.safeParse(result.data);
            if (result.response.ok && challenge.success) {
              masters.push({
                desk_id: challenge.data.desk_id || ip,
                tenant_id: challenge.data.tenant_id || "default",
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
  registerIpcHandler("installer:exchangePairing", async (_e, params: {
    masterHost: string;
    masterPort: number;
    masterDeskId: string;
    kioskId: string;
    hardwareFingerprint: string;
  }) => {
    const input = pairingExchangeSchema.safeParse(params);
    if (!input.success || !getPrivateLanHost(input.data.masterHost)) {
      return { success: false, error: "Invalid private-LAN pairing payload" };
    }
    const {
      masterHost,
      masterPort,
      masterDeskId,
      kioskId,
      hardwareFingerprint,
    } = input.data;

    log("info", "Exchanging pairing with master", { deskId: masterDeskId });
    try {
      const pinnedMasterIp = await resolvePrivateLanIpv4(masterHost);
      const pairingBaseUrl = `http://${pinnedMasterIp}:${masterPort}`;

      // 1. GET challenge
      const challengeResult = await fetchBoundedJson(
        `${pairingBaseUrl}/api/v1/pairing/challenge`,
        {},
        { timeoutMs: 5_000, maxBytes: 16_384 },
      );
      if (!challengeResult.response.ok) {
        return {
          success: false,
          error: `Challenge request failed: HTTP ${challengeResult.response.status}`,
        };
      }
      const challengeData = pairingChallengeResponseSchema.safeParse(challengeResult.data);
      if (!challengeData.success) {
        return { success: false, error: "Invalid challenge response" };
      }
      const nonce = challengeData.data.nonce;

      // 2. Build signature
      const secret = masterDeskId + hardwareFingerprint;
      const signature = crypto
        .createHmac("sha256", secret)
        .update(kioskId + nonce)
        .digest("hex");

      // 3. POST exchange
      const exchangeResult = await fetchBoundedJson(
        `${pairingBaseUrl}/api/v1/pairing/exchange`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kiosk_id: kioskId,
            nonce,
            signature,
            hardware_fingerprint: hardwareFingerprint,
          }),
        },
        { timeoutMs: 5_000, maxBytes: 65_536 },
      );
      if (!exchangeResult.response.ok) {
        return {
          success: false,
          error: `Exchange request failed: HTTP ${exchangeResult.response.status}`,
        };
      }
      const exchangeData = pairingResponseSchema.safeParse(exchangeResult.data);
      if (!exchangeData.success) {
        return { success: false, error: "Invalid exchange response" };
      }

      return {
        success: true,
        hmac_secret: exchangeData.data.hmac_secret,
        tenant_id: exchangeData.data.tenant_id || "default",
        master_desk_id: exchangeData.data.master_desk_id || masterDeskId,
        master_ip: pinnedMasterIp,
        master_port: masterPort,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", "Pairing exchange failed", { error: msg });
      return { success: false, error: msg };
    }
  });

  // ─── Pairing: generate kiosk ID ─────────────────────────────────────────────
  registerIpcHandler("installer:generateKioskId", async (_e, hardwareFingerprint: string) => {
    if (!hardwareFingerprintSchema.safeParse(hardwareFingerprint).success) {
      throw new Error("Invalid hardware fingerprint");
    }
    log("info", "Generating kiosk_id");
    const location = os.hostname().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    return { kioskId: `KIOSK_${location}_${suffix}` };
  });

  // ─── Hardware fingerprint ───────────────────────────────────────────────────
  registerIpcHandler("installer:getHardwareFingerprint", async () => {
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
  const uuidInfo = await si.uuid();
  const machineId = uuidInfo.os || uuidInfo.hardware;
  if (machineId && machineId !== "-") {
    return machineId;
  }
  const cpus = os.cpus();
  const network = os.networkInterfaces();
  const mac = Object.values(network)
    .flat()
    .find((iface) => iface && !iface.internal && iface.mac)?.mac || "unknown";
  const data = `${os.hostname()}-${mac}-${cpus[0]?.model || "unknown"}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...(init || {}),
      redirect: "error",
      signal: controller.signal,
    });
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
      if (addr.family === "IPv4" && !addr.internal && isPrivateIpv4(addr.address)) {
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

const readyPromise = app.whenReady();
if (readyPromise && typeof readyPromise.then === "function") {
  readyPromise.then(() => {
    setupIpc();
    createWindow();

    // Handle OAuth callback protocol
    protocol.handle("clickflash-installer", (request) => {
      const url = new URL(request.url);
      if (url.pathname === "/callback") {
        const token = url.searchParams.get("token");
        const parsedToken = cloudflareTokenSchema.safeParse(token);
        if (parsedToken.success && mainWindow) {
          mainWindow.webContents.send("installer:oauth-callback", { token: parsedToken.data });
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
}

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
