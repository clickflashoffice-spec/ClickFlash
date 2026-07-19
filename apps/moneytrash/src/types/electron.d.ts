interface MoneyTrashFileInfo {
  name: string;
  path: string;
  size: number;
  mimeType?: string;
  previewUrl?: string;
}

interface MoneyTrashUploadProgress {
  sessionId: string;
  chunksReceived: number;
  totalChunks: number;
  percentage: number;
  bytesUploaded?: number;
  totalBytes?: number;
  status: 'uploading' | 'completed' | 'cancelled' | 'failed';
}

interface Window {
  moneytrashDesktop?: {
    isElectron: true;
    files: {
      select(multiple?: boolean): Promise<MoneyTrashFileInfo[]>;
      selectFolder(): Promise<MoneyTrashFileInfo[] | null>;
      approveDropped(file: File): Promise<MoneyTrashFileInfo>;
      readChunk(filePath: string, offset: number, length: number): Promise<Uint8Array>;
      checksums(filePath: string): Promise<{ sha256: string; crc32: string; bytesProcessed: number }>;
    };
    storage: {
      saveConfig(config: unknown): Promise<void>;
      loadConfig(): Promise<Record<string, unknown> | null>;
      saveHistory(history: unknown): Promise<void>;
      loadHistory(): Promise<unknown[]>;
    };
    cloud: {
      health(apiUrl?: string): Promise<unknown>;
      financials(startDate: string, endDate: string, apiUrl?: string): Promise<unknown>;
    };
    uploads: {
      startNative(request: unknown): Promise<unknown>;
      uploadChunk(request: unknown): Promise<unknown>;
      finalize(request: unknown): Promise<unknown>;
      progress(sessionId: string): Promise<MoneyTrashUploadProgress | null>;
      active(): Promise<MoneyTrashUploadProgress[]>;
      cancel(sessionId: string): Promise<boolean>;
      onProgress(callback: (progress: MoneyTrashUploadProgress) => void): () => void;
    };
    notifications: {
      show(title: string, body: string): Promise<boolean>;
      openExternal(url: string): Promise<void>;
    };
    tether?: {
      start(): Promise<{ success: boolean; error?: string }>;
      stop(): Promise<{ success: boolean; error?: string }>;
      status(): Promise<{ isTethering: boolean; camera: string | null }>;
      onStatusChange(callback: (payload: { status: string; camera?: string }) => void): () => void;
      onPhotoCaptured(callback: (payload: { fileName: string; filePath: string; size: number; timestamp: string }) => void): () => void;
    };
  };
}
