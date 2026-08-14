"use strict";

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type Cleanup = () => void;
type PrintOptions = { printer: string; silent?: boolean };

function onEvent<T>(channel: string, callback: (payload: T) => void): Cleanup {
  const handler = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

function onSignal(channel: string, callback: () => void): Cleanup {
  const handler = () => callback();
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  platform: process.platform,
  exitKiosk: (password: string) => ipcRenderer.invoke("exit-kiosk", password),
  enterKiosk: () => ipcRenderer.invoke("enter-kiosk"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  restartApp: () => ipcRenderer.invoke("restart-app"),
  kiosk: {
    authenticate: (password: string) => ipcRenderer.invoke("kiosk:authenticate", password),
    unlock: (pin: string) => ipcRenderer.invoke("kiosk:unlock", pin),
    lock: () => ipcRenderer.invoke("kiosk:lock"),
    onShowUnlockDialog: (callback: () => void) => onSignal("kiosk:show-unlock-dialog", callback),
  },
  printing: {
    getPrinters: () => ipcRenderer.invoke("printing:getPrinters"),
    print: (options: PrintOptions) => ipcRenderer.invoke("printing:print", options),
  },
  updater: {
    check: () => ipcRenderer.invoke("updater:check"),
    download: () => ipcRenderer.invoke("updater:download"),
    install: () => ipcRenderer.invoke("updater:install"),
    getStatus: () => ipcRenderer.invoke("updater:status"),
    onChecking: (callback: () => void) => onSignal("updater:checking", callback),
    onAvailable: (callback: (info: unknown) => void) => onEvent("updater:available", callback),
    onNotAvailable: (callback: () => void) => onSignal("updater:not-available", callback),
    onProgress: (callback: (progress: unknown) => void) => onEvent("updater:progress", callback),
    onDownloaded: (callback: (info: unknown) => void) => onEvent("updater:downloaded", callback),
    onError: (callback: (error: unknown) => void) => onEvent("updater:error", callback),
  },
  scanner: {
    onData: (callback: (data: string) => void) => onEvent("scanner:data", callback),
    onStatus: (callback: (status: string) => void) => onEvent("scanner:status", callback),
  },
});

contextBridge.exposeInMainWorld("touchApp", {
  isDesktop: true,
  platform: process.platform,
});
