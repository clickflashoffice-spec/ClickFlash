/**
 * ClickFlash Installer — Preload Script
 * Secure context bridge exposing only necessary APIs to renderer
 */

import { contextBridge, ipcRenderer } from "electron";
import type {
  HeartbeatPayload,
  InstallerConfig,
  LaunchAppsPayload,
  RegisterWithHubPayload,
  ValidatedLicense,
  WriteEnvConfigPayload,
} from "./installer-ipc-schemas";
import type { PayloadBundleSelectionResult } from "./installer-payload-verification";

export interface InstallerApi {
  // Prerequisites
  checkPrerequisites: () => Promise<{
    nodeVersion: string | null;
    nodeInstalled: boolean;
    diskSpaceGB: number;
    portsAvailable: Record<number, boolean>;
    os: string;
    arch: string;
    totalMemoryGB: number;
  }>;

  // Cloudflare
  openOAuth: (url: string) => Promise<{ success: boolean; error?: string }>;
  testCloudflareToken: (token: string) => Promise<{ success: boolean; accounts?: Array<{ id: string; name: string }>; error?: string }>;
  onOAuthCallback: (callback: (data: { token: string }) => void) => () => void;

  // License
  validateLicense: (key: string) => Promise<{ success: boolean; data?: ValidatedLicense; error?: string }>;

  // OAuth Device Code
  requestDeviceCode: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  pollForToken: (deviceCode: string) => Promise<{ success: boolean; data?: unknown; error?: string; status?: number }>;

  // Desk ID
  checkDeskId: (deskId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;

  // Hub Registration
  registerWithHub: (payload: RegisterWithHubPayload) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  sendHeartbeat: (payload: HeartbeatPayload) => Promise<{ success: boolean; data?: unknown; error?: string }>;

  // Fleet
  registerFleet: (payload: {
    deskId: string;
    name: string;
    location: string;
    country: string;
    timezone: string;
    currency: string;
    cloudApiUrl: string;
    token: string;
  }) => Promise<{ success: boolean; data?: unknown; error?: string }>;

  // External URL
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;

  // Health
  runHealthChecks: (config: {
    masterPort: number;
    touchPort: number;
    cloudApiUrl: string;
    deskId: string;
    token: string;
  }) => Promise<{
    masterBackend: boolean;
    touchBackend: boolean;
    heartbeat: boolean;
    d1Write: boolean;
    r2Upload: boolean;
  }>;

  // Config & Launch
  saveConfig: (config: InstallerConfig) => Promise<{ success: boolean; error?: string }>;
  writeEnvConfig: (params: WriteEnvConfigPayload) => Promise<{ success: boolean; error?: string }>;
  getGeolocation: () => Promise<{ success: boolean; data?: any; error?: string }>;
  launchApps: (paths: LaunchAppsPayload) => Promise<{ master: boolean; touch: boolean }>;
  selectPayloadBundle: () => Promise<PayloadBundleSelectionResult>;
  getLogs: () => Promise<string[]>;

  // Pairing
  discoverMasters: () => Promise<{ success: boolean; masters: Array<{ desk_id: string; tenant_id: string; host: string; port: number; addresses: string[]; latencyMs: number }> }>;
  scanLan: () => Promise<{ success: boolean; masters: Array<{ desk_id: string; tenant_id: string; host: string; port: number; addresses: string[]; latencyMs: number }> }>;
  exchangePairing: (params: {
    masterHost: string;
    masterPort: number;
    masterDeskId: string;
    kioskId: string;
    hardwareFingerprint: string;
  }) => Promise<{
    success: boolean;
    hmac_secret?: string;
    tenant_id?: string;
    master_desk_id?: string;
    master_ip?: string;
    master_port?: number;
    error?: string;
  }>;
  generateKioskId: (hardwareFingerprint: string) => Promise<{ kioskId: string }>;
  getHardwareFingerprint: () => Promise<{ fingerprint: string }>;

  // Platform
  platform: string;
  version: string;
}

const api: InstallerApi = {
  checkPrerequisites: () => ipcRenderer.invoke("installer:checkPrerequisites"),

  openOAuth: (url: string) => ipcRenderer.invoke("installer:openOAuth", url),
  testCloudflareToken: (token: string) => ipcRenderer.invoke("installer:testCloudflareToken", token),
  onOAuthCallback: (callback) => {
    const handler = (_e: unknown, data: { token: string }) => callback(data);
    ipcRenderer.on("installer:oauth-callback", handler);
    return () => ipcRenderer.off("installer:oauth-callback", handler);
  },

  validateLicense: (key: string) => ipcRenderer.invoke("installer:validateLicense", key),
  requestDeviceCode: () => ipcRenderer.invoke("installer:requestDeviceCode"),
  pollForToken: (deviceCode: string) => ipcRenderer.invoke("installer:pollForToken", deviceCode),
  checkDeskId: (deskId: string) => ipcRenderer.invoke("installer:checkDeskId", deskId),
  registerWithHub: (payload: RegisterWithHubPayload) => ipcRenderer.invoke("installer:registerWithHub", payload),
  sendHeartbeat: (payload: HeartbeatPayload) => ipcRenderer.invoke("installer:sendHeartbeat", payload),
  openExternalUrl: (url: string) => ipcRenderer.invoke("installer:openExternalUrl", url),

  registerFleet: (payload) => ipcRenderer.invoke("installer:registerFleet", payload),

  runHealthChecks: (config) => ipcRenderer.invoke("installer:runHealthChecks", config),

  saveConfig: (config) => ipcRenderer.invoke("installer:saveConfig", config),
  writeEnvConfig: (params) => ipcRenderer.invoke("installer:writeEnvConfig", params),
  getGeolocation: () => ipcRenderer.invoke("installer:getGeolocation"),
  launchApps: (paths) => ipcRenderer.invoke("installer:launchApps", paths),
  selectPayloadBundle: () => ipcRenderer.invoke("installer:selectPayloadBundle"),
  getLogs: () => ipcRenderer.invoke("installer:getLogs"),

  // Pairing
  discoverMasters: () => ipcRenderer.invoke("installer:discoverMasters"),
  scanLan: () => ipcRenderer.invoke("installer:scanLan"),
  exchangePairing: (params) => ipcRenderer.invoke("installer:exchangePairing", params),
  generateKioskId: (hardwareFingerprint) => ipcRenderer.invoke("installer:generateKioskId", hardwareFingerprint),
  getHardwareFingerprint: () => ipcRenderer.invoke("installer:getHardwareFingerprint"),

  platform: process.platform,
  version: process.versions.electron || "unknown",
};

contextBridge.exposeInMainWorld("installerApi", api);

export type InstallerWindow = Window & {
  installerApi: InstallerApi;
};
