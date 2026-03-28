/**
 * Type definitions for Phase 71 Electron Rebuild
 * Strict typing for IPC channels and process communication
 */

// IPC Channel Whitelist - These are the ONLY allowed channels
export type IpcChannel =
  // Window management
  | 'window:minimize'
  | 'window:maximize'
  | 'window:close'
  | 'window:fullscreen'
  // Kiosk mode
  | 'kiosk:unlock'
  | 'kiosk:lock'
  | 'kiosk:status'
  // System dialogs
  | 'dialog:openDirectory'
  | 'dialog:openFile'
  | 'dialog:saveFile'
  // Auto updater
  | 'updater:check'
  | 'updater:download'
  | 'updater:install'
  | 'updater:status'
  // Backend process
  | 'backend:restart'
  | 'backend:status'
  | 'backend:health'
  // Logging
  | 'log:write'
  // File operations (sandboxed)
  | 'fs:read-file'
  | 'fs:write-file'
  | 'fs:exists'
  | 'fs:stat';

// Updater events that can be received from main
export type UpdaterEvent =
  | 'updater:checking'
  | 'updater:available'
  | 'updater:not-available'
  | 'updater:progress'
  | 'updater:downloaded'
  | 'updater:error';

// Process status types
export interface ProcessStatus {
  pid: number;
  status: 'starting' | 'running' | 'unresponsive' | 'crashed' | 'stopped' | 'waiting_external';
  memoryMB: number;
  cpuPercent: number;
  uptimeSeconds: number;
  lastHeartbeat: number;
}

export interface BackendStatus extends ProcessStatus {
  port: number;
  version: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
}

// IPC Request/Response types
export interface IpcRequest<T = unknown> {
  id: string;
  channel: IpcChannel;
  payload: T;
  timestamp: number;
}

export interface IpcResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Window API exposed to renderer
export interface ElectronWindowAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  setFullscreen: (enabled: boolean) => Promise<void>;
  isFullscreen: () => Promise<boolean>;
}

// Kiosk API exposed to renderer
export interface ElectronKioskAPI {
  unlock: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lock: () => Promise<{ success: boolean }>;
  getStatus: () => Promise<{ isLocked: boolean }>;
}

// Dialog API exposed to renderer
export interface ElectronDialogAPI {
  openDirectory: (options?: { title?: string; buttonLabel?: string }) => Promise<string | null>;
  openFile: (options?: { title?: string; filters?: FileFilter[]; multiple?: boolean }) => Promise<string | string[] | null>;
  saveFile: (options?: { title?: string; filters?: FileFilter[]; defaultPath?: string }) => Promise<string | null>;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

// Updater API exposed to renderer
export interface ElectronUpdaterAPI {
  check: () => Promise<UpdateStatus>;
  download: () => Promise<UpdateStatus>;
  install: () => Promise<void>;
  getStatus: () => Promise<UpdateStatus>;
  onEvent: (event: UpdaterEvent, callback: (data: unknown) => void) => void;
  removeListener: (event: UpdaterEvent, callback: (data: unknown) => void) => void;
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version?: string;
  releaseNotes?: string;
}

// Backend API exposed to renderer
export interface ElectronBackendAPI {
  restart: () => Promise<{ success: boolean }>;
  getStatus: () => Promise<BackendStatus>;
  healthCheck: () => Promise<{ healthy: boolean; latencyMs: number }>;
}

// Full Electron API exposed via contextBridge
declare global {
  interface Window {
    electronAPI: {
      window: ElectronWindowAPI;
      kiosk: ElectronKioskAPI;
      dialog: ElectronDialogAPI;
      updater: ElectronUpdaterAPI;
      backend: ElectronBackendAPI;
      // Generic IPC (typed)
      invoke: <T = unknown, R = unknown>(channel: IpcChannel, payload?: T) => Promise<R>;
      // Logging
      log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
    };
  }
}

export {};
