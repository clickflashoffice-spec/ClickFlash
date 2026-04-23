/**
 * ClickFlash Master OS — Preload Script
 * Exposes a safe, channel-whitelisted IPC bridge to the renderer.
 */

"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const INVOKE_CHANNELS = [
  "kiosk:unlock",
  "kiosk:lock",
  "dialog:openDirectory",
  "dialog:openFile",
  "dialog:saveFile",
  // auto-updater (optional — only active if main registers these)
  "updater:check",
  "updater:download",
  "updater:install",
  "updater:status",
];

const ON_CHANNELS = [
  "kiosk:show-unlock-dialog",
  "updater:checking",
  "updater:available",
  "updater:not-available",
  "updater:progress",
  "updater:downloaded",
  "updater:error",
];

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, ...args) => {
    if (!INVOKE_CHANNELS.includes(channel)) {
      throw new Error(`[Preload] Blocked IPC channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, callback) => {
    if (!ON_CHANNELS.includes(channel)) return;
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  // Legacy shape (some existing UI code calls window.electron.ipcRenderer.invoke)
  // Returns a cleanup function from on() to prevent listener leaks during
  // prolonged kiosk uptime (React re-mounts add listeners each cycle).
  ipcRenderer: {
    invoke: (channel, ...args) => {
      if (!INVOKE_CHANNELS.includes(channel)) {
        throw new Error(`[Preload] Blocked IPC channel: ${channel}`);
      }
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, callback) => {
      if (!ON_CHANNELS.includes(channel)) return () => {};
      const handler = (_event, ...args) => callback(_event, ...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
  },
});
