/**
 * ClickFlash Installer — Preload Script
 * Secure context bridge exposing only necessary APIs to renderer
 */

import { contextBridge, ipcRenderer } from "electron";

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
  openOAuth: (url: string) => Promise<{ success: boolean }>;
  testCloudflareToken: (token: string) => Promise<{ success: boolean; accounts?: Array<{ id: string; name: string }>; error?: string }>;
  onOAuthCallback: (callback: (data: { token: string }) => void) => () => void;

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
  saveConfig: (config: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  launchApps: (paths: { master?: string; touch?: string }) => Promise<{ master: boolean; touch: boolean }>;
  selectDirectory: () => Promise<string | null>;
  getLogs: () => Promise<string[]>;

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

  registerFleet: (payload) => ipcRenderer.invoke("installer:registerFleet", payload),

  runHealthChecks: (config) => ipcRenderer.invoke("installer:runHealthChecks", config),

  saveConfig: (config) => ipcRenderer.invoke("installer:saveConfig", config),
  launchApps: (paths) => ipcRenderer.invoke("installer:launchApps", paths),
  selectDirectory: () => ipcRenderer.invoke("installer:selectDirectory"),
  getLogs: () => ipcRenderer.invoke("installer:getLogs"),

  platform: process.platform,
  version: process.versions.electron || "unknown",
};

contextBridge.exposeInMainWorld("installerApi", api);

export type InstallerWindow = Window & {
  installerApi: InstallerApi;
};
