/**
 * Preload Script for Phase 71
 * Secure context bridge exposing limited API to renderer
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { 
  IpcChannel, 
  UpdaterEvent, 
  ElectronWindowAPI,
  ElectronKioskAPI,
  ElectronDialogAPI,
  ElectronUpdaterAPI,
  ElectronBackendAPI,
  FileFilter,
} from '../types/electron';

// Valid IPC channels whitelist
const VALID_CHANNELS: string[] = [
  'window:minimize',
  'window:maximize',
  'window:close',
  'window:fullscreen',
  'window:isFullscreen',
  'kiosk:unlock',
  'kiosk:lock',
  'kiosk:status',
  'dialog:openDirectory',
  'dialog:openFile',
  'updater:check',
  'updater:download',
  'updater:install',
  'updater:status',
  'backend:restart',
  'backend:status',
  'backend:health',
  'log:write',
];

// Valid updater events
const VALID_UPDATER_EVENTS: UpdaterEvent[] = [
  'updater:checking',
  'updater:available',
  'updater:not-available',
  'updater:progress',
  'updater:downloaded',
  'updater:error',
];

/**
 * Window API implementation
 */
const windowAPI: ElectronWindowAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  setFullscreen: (enabled: boolean) => ipcRenderer.invoke('window:fullscreen', enabled),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
};

/**
 * Kiosk API implementation
 */
const kioskAPI: ElectronKioskAPI = {
  unlock: (pin: string) => ipcRenderer.invoke('kiosk:unlock', pin),
  lock: () => ipcRenderer.invoke('kiosk:lock'),
  getStatus: () => ipcRenderer.invoke('kiosk:status'),
};

/**
 * Dialog API implementation
 */
const dialogAPI: ElectronDialogAPI = {
  openDirectory: (options?: { title?: string; buttonLabel?: string }) => 
    ipcRenderer.invoke('dialog:openDirectory', options),
  
  openFile: (options?: { title?: string; filters?: FileFilter[]; multiple?: boolean }) => 
    ipcRenderer.invoke('dialog:openFile', options),
  
  saveFile: (options?: { title?: string; filters?: FileFilter[]; defaultPath?: string }) => 
    ipcRenderer.invoke('dialog:saveFile', options),
};

/**
 * Updater API implementation with event handling
 */
const updaterListeners = new Map<string, Set<(data: unknown) => void>>();

const updaterAPI: ElectronUpdaterAPI = {
  check: () => ipcRenderer.invoke('updater:check'),
  download: () => ipcRenderer.invoke('updater:download'),
  install: () => ipcRenderer.invoke('updater:install'),
  getStatus: () => ipcRenderer.invoke('updater:status'),
  
  onEvent: (event: UpdaterEvent, callback: (data: unknown) => void) => {
    if (!VALID_UPDATER_EVENTS.includes(event)) {
      throw new Error(`Invalid updater event: ${event}`);
    }
    
    if (!updaterListeners.has(event)) {
      updaterListeners.set(event, new Set());
      
      // Subscribe to this event from main
      ipcRenderer.on(event, (_event, data) => {
        const listeners = updaterListeners.get(event);
        if (listeners) {
          listeners.forEach(cb => {
            try {
              cb(data);
            } catch (e) {
              console.error('Error in updater event listener:', e);
            }
          });
        }
      });
    }
    
    updaterListeners.get(event)?.add(callback);
  },
  
  removeListener: (event: UpdaterEvent, callback: (data: unknown) => void) => {
    updaterListeners.get(event)?.delete(callback);
  },
};

/**
 * Backend API implementation
 */
const backendAPI: ElectronBackendAPI = {
  restart: () => ipcRenderer.invoke('backend:restart'),
  getStatus: () => ipcRenderer.invoke('backend:status'),
  healthCheck: () => ipcRenderer.invoke('backend:health'),
};

/**
 * Generic IPC invoke with type safety
 */
async function invokeIPC<T = unknown, R = unknown>(
  channel: IpcChannel, 
  payload?: T
): Promise<R> {
  if (!VALID_CHANNELS.includes(channel)) {
    throw new Error(`Invalid IPC channel: ${channel}`);
  }
  
  return ipcRenderer.invoke(channel, payload) as Promise<R>;
}

/**
 * Logging function to send logs to main process
 */
function logToMain(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>
): void {
  // Log to console in renderer
  switch (level) {
    case 'debug':
      console.debug(`[Renderer] ${message}`, meta);
      break;
    case 'info':
      console.log(`[Renderer] ${message}`, meta);
      break;
    case 'warn':
      console.warn(`[Renderer] ${message}`, meta);
      break;
    case 'error':
      console.error(`[Renderer] ${message}`, meta);
      break;
  }
  
  // Send to main process
  ipcRenderer.invoke('log:write', level, message, meta).catch(() => {
    // Ignore errors - logging shouldn't crash the app
  });
}

// Expose APIs via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  window: windowAPI,
  kiosk: kioskAPI,
  dialog: dialogAPI,
  updater: updaterAPI,
  backend: backendAPI,
  invoke: invokeIPC,
  log: logToMain,
});

// Log preload initialization
console.log('[Preload] Electron API exposed successfully');
