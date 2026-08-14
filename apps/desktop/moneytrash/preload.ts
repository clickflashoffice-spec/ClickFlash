import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  ChunkUploadRequest,
  FileInfo,
  NativeUploadRequest,
  UploadConfig,
  UploadHistoryItem,
  UploadProgress,
  UploadResult,
} from "./electron-contract";

const desktopApi = {
  isElectron: true as const,
  files: {
    select: (multiple = true): Promise<FileInfo[]> => ipcRenderer.invoke("files:select", multiple),
    selectFolder: (): Promise<FileInfo[] | null> => ipcRenderer.invoke("files:select-folder"),
    approveDropped: (file: File): Promise<FileInfo> => ipcRenderer.invoke("files:approve-dropped", webUtils.getPathForFile(file)),
    readChunk: (filePath: string, offset: number, length: number): Promise<Uint8Array> => (
      ipcRenderer.invoke("files:read-chunk", filePath, offset, length)
    ),
    checksums: (filePath: string): Promise<{ sha256: string; crc32: string; bytesProcessed: number }> => (
      ipcRenderer.invoke("files:checksums", filePath)
    ),
  },
  storage: {
    saveConfig: (config: UploadConfig): Promise<void> => ipcRenderer.invoke("storage:save-config", config),
    loadConfig: (): Promise<Omit<UploadConfig, "apiKey" | "s3AccessKey" | "s3SecretKey"> | null> => (
      ipcRenderer.invoke("storage:load-config")
    ),
    saveHistory: (history: UploadHistoryItem[]): Promise<void> => ipcRenderer.invoke("storage:save-history", history),
    loadHistory: (): Promise<UploadHistoryItem[]> => ipcRenderer.invoke("storage:load-history"),
  },
  cloud: {
    health: (apiUrl?: string): Promise<unknown> => ipcRenderer.invoke("cloud:health", apiUrl),
    financials: (startDate: string, endDate: string, apiUrl?: string): Promise<unknown> => (
      ipcRenderer.invoke("cloud:financials", { startDate, endDate, apiUrl })
    ),
  },
  uploads: {
    startNative: (request: NativeUploadRequest): Promise<UploadResult> => ipcRenderer.invoke("uploads:start-native", request),
    uploadChunk: (request: ChunkUploadRequest): Promise<UploadProgress> => ipcRenderer.invoke("uploads:chunk", request),
    finalize: (request: unknown): Promise<UploadResult> => ipcRenderer.invoke("uploads:finalize", request),
    progress: (sessionId: string): Promise<UploadProgress | null> => ipcRenderer.invoke("uploads:progress", sessionId),
    active: (): Promise<UploadProgress[]> => ipcRenderer.invoke("uploads:active"),
    cancel: (sessionId: string): Promise<boolean> => ipcRenderer.invoke("uploads:cancel", sessionId),
    onProgress: (callback: (progress: UploadProgress) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: UploadProgress) => callback(progress);
      ipcRenderer.on("uploads:progress-event", listener);
      return () => ipcRenderer.removeListener("uploads:progress-event", listener);
    },
  },
  notifications: {
    show: (title: string, body: string): Promise<boolean> => ipcRenderer.invoke("notifications:show", { title, body }),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke("notifications:open-external", url),
  },
  tether: {
    start: (): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke("tether:start"),
    stop: (): Promise<{ success: boolean, error?: string }> => ipcRenderer.invoke("tether:stop"),
    status: (): Promise<{ isTethering: boolean, camera: string | null }> => ipcRenderer.invoke("tether:status"),
    onStatusChange: (callback: (payload: { status: string, camera?: string }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { status: string, camera?: string }) => callback(payload);
      ipcRenderer.on("tether:status", listener);
      return () => ipcRenderer.removeListener("tether:status", listener);
    },
    onPhotoCaptured: (callback: (payload: { fileName: string, filePath: string, size: number, timestamp: string }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { fileName: string, filePath: string, size: number, timestamp: string }) => callback(payload);
      ipcRenderer.on("tether:photo-captured", listener);
      return () => ipcRenderer.removeListener("tether:photo-captured", listener);
    }
  }
};

contextBridge.exposeInMainWorld("moneytrashDesktop", desktopApi);

export type MoneyTrashDesktopApi = typeof desktopApi;
