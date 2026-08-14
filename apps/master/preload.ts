"use strict";

import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type Cleanup = () => void;
type FileFilter = { name: string; extensions: string[] };
type OpenDirectoryOptions = { title?: string; buttonLabel?: string };
type OpenFileOptions = { multiple?: boolean; title?: string; filters?: FileFilter[] };
type SaveFileOptions = { title?: string; filters?: FileFilter[]; defaultPath?: string };
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
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  kiosk: {
    unlock: (pin: string) => ipcRenderer.invoke("kiosk:unlock", pin),
    lock: () => ipcRenderer.invoke("kiosk:lock"),
    onShowUnlockDialog: (callback: () => void) => onSignal("kiosk:show-unlock-dialog", callback),
  },
  dialogs: {
    openDirectory: (options?: OpenDirectoryOptions) => ipcRenderer.invoke("dialog:openDirectory", options),
    openFile: (options?: OpenFileOptions) => ipcRenderer.invoke("dialog:openFile", options),
    saveFile: (options?: SaveFileOptions) => ipcRenderer.invoke("dialog:saveFile", options),
  },
  printing: {
    getPrinters: () => ipcRenderer.invoke("printing:getPrinters"),
    print: (options: PrintOptions) => ipcRenderer.invoke("printing:print", options),
  },
  api: {
    invoke: (path: string, options: any) => ipcRenderer.invoke("api:request", { path, options }),
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
});
