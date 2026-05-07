/**
 * ClickFlash Master OS — Preload Script
 * Exposes a safe, channel-whitelisted IPC bridge to the renderer.
 *
 * Phase 4-A: TypeScript migration of preload.js
 */

"use strict";

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

const INVOKE_CHANNELS: string[] = [
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

const ON_CHANNELS: string[] = [
  "kiosk:show-unlock-dialog",
  "updater:checking",
  "updater:available",
  "updater:not-available",
  "updater:progress",
  "updater:downloaded",
  "updater:error",
];

type AnyCallback = (...args: unknown[]) => void;

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!INVOKE_CHANNELS.includes(channel)) {
      throw new Error(`[Preload] Blocked IPC channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, callback: AnyCallback): (() => void) | undefined => {
    if (!ON_CHANNELS.includes(channel)) return undefined;
    const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  // Legacy shape (some existing UI code calls window.electron.ipcRenderer.invoke)
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
      if (!INVOKE_CHANNELS.includes(channel)) {
        throw new Error(`[Preload] Blocked IPC channel: ${channel}`);
      }
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel: string, callback: AnyCallback): (() => void) | undefined => {
      if (!ON_CHANNELS.includes(channel)) return undefined;
      const handler = (event: IpcRendererEvent, ...args: unknown[]) => callback(event, ...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    },
  },
});
