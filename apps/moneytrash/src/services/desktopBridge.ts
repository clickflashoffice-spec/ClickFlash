/**
 * Desktop bridge.
 * Exclusively uses Electron APIs.
 */

export interface DualChecksumResult {
  sha256: string;
  crc32: string;
  bytes_processed: number;
}

type CommandArgs = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeMetadata = (value: unknown): Record<string, unknown> => {
  const metadata = isRecord(value) ? value : {};
  return {
    eventName: metadata.eventName ?? metadata.event_name,
    accessCode: metadata.accessCode ?? metadata.access_code,
    mode: metadata.mode,
    mimeType: metadata.mimeType ?? metadata.mime_type,
    deskId: metadata.deskId ?? metadata.desk_id,
    customerEmail: metadata.customerEmail ?? metadata.customer_email,
    singlePhotoPrice: metadata.singlePhotoPrice ?? metadata.single_photo_price,
    fullGalleryPrice: metadata.fullGalleryPrice ?? metadata.full_gallery_price,
  };
};

const normalizeConfig = (value: unknown): Record<string, unknown> => {
  const config = isRecord(value) ? value : {};
  return {
    eventName: config.eventName ?? config.event_name ?? '',
    accessCode: config.accessCode ?? config.access_code ?? '',
    mode: config.mode ?? 'moneytrash',
    customerEmail: config.customerEmail ?? config.customer_email,
    singlePhotoPrice: config.singlePhotoPrice ?? config.single_photo_price,
    fullGalleryPrice: config.fullGalleryPrice ?? config.full_gallery_price,
    apiUrl: config.apiUrl ?? config.api_url,
    deskId: config.deskId ?? config.desk_id,
    apiKey: config.apiKey ?? config.api_key,
    s3AccessKey: config.s3AccessKey ?? config.s3_access_key,
    s3SecretKey: config.s3SecretKey ?? config.s3_secret_key,
    s3Region: config.s3Region ?? config.s3_region,
    s3Bucket: config.s3Bucket ?? config.s3_bucket,
    s3Endpoint: config.s3Endpoint ?? config.s3_endpoint,
  };
};

const invokeElectron = async <T>(cmd: string, args: CommandArgs = {}): Promise<T> => {
  const api = window.moneytrashDesktop;
  if (!api) throw new Error('Electron desktop API is unavailable');

  switch (cmd) {
    case 'select_files':
      return api.files.select(args.multiple !== false) as Promise<T>;
    case 'select_folder':
      return api.files.selectFolder() as Promise<T>;
    case 'read_file_chunk': {
      const chunk = await api.files.readChunk(String(args.path ?? ''), Number(args.offset), Number(args.length));
      return Array.from(chunk) as T;
    }
    case 'calculate_file_checksums': {
      const result = await api.files.checksums(String(args.path ?? ''));
      return { sha256: result.sha256, crc32: result.crc32, bytes_processed: result.bytesProcessed } as T;
    }
    case 'save_upload_config':
    case 'save_cloud_config':
      return api.storage.saveConfig(normalizeConfig(args.config)) as Promise<T>;
    case 'load_upload_config':
    case 'load_cloud_config':
      return api.storage.loadConfig() as Promise<T>;
    case 'save_upload_history':
      return api.storage.saveHistory(args.history) as Promise<T>;
    case 'load_upload_history':
      return api.storage.loadHistory() as Promise<T>;
    case 'cloud_health':
      return api.cloud.health(typeof args.apiUrl === 'string' ? args.apiUrl : undefined) as Promise<T>;
    case 'cloud_financials':
      return api.cloud.financials(
        String(args.startDate ?? ''),
        String(args.endDate ?? ''),
        typeof args.apiUrl === 'string' ? args.apiUrl : undefined,
      ) as Promise<T>;
    case 'show_notification':
      return api.notifications.show(String(args.title ?? ''), String(args.body ?? '')) as Promise<T>;
    case 'open_external_link':
      return api.notifications.openExternal(String(args.url ?? '')) as Promise<T>;
    case 'start_native_upload':
      return api.uploads.startNative({
        sessionId: typeof args.sessionId === 'string' ? args.sessionId : undefined,
        filePath: String(args.filePath ?? args.file_path ?? ''),
        apiUrl: typeof args.apiUrl === 'string' ? args.apiUrl : undefined,
        metadata: normalizeMetadata(args.metadata),
      }) as Promise<T>;
    case 'upload_file_chunk':
      return api.uploads.uploadChunk({
        sessionId: args.sessionId,
        chunkIndex: args.chunkIndex,
        totalChunks: args.totalChunks,
        chunkData: args.chunkData,
        fileName: args.fileName,
        fileSize: args.fileSize,
        metadata: normalizeMetadata(args.metadata),
      }) as Promise<T>;
    case 'finalize_upload':
      return api.uploads.finalize({
        sessionId: args.sessionId,
        apiUrl: args.apiUrl,
        metadata: normalizeMetadata(args.metadata),
      }) as Promise<T>;
    case 'get_upload_progress':
      return api.uploads.progress(String(args.sessionId ?? '')) as Promise<T>;
    case 'get_active_uploads':
      return api.uploads.active() as Promise<T>;
    case 'cancel_upload':
      return api.uploads.cancel(String(args.sessionId ?? '')) as Promise<T>;
    case 'read_file':
      throw new Error('Whole-file reads are disabled; use the approved native streaming uploader');
    case 'tether:start':
      if (!api.tether) throw new Error('Tether API is unavailable');
      return api.tether.start() as Promise<T>;
    case 'tether:stop':
      if (!api.tether) throw new Error('Tether API is unavailable');
      return api.tether.stop() as Promise<T>;
    case 'tether:status':
      if (!api.tether) throw new Error('Tether API is unavailable');
      return api.tether.status() as Promise<T>;
    default:
      throw new Error(`Unsupported Electron desktop command: ${cmd}`);
  }
};

export const initDesktopApi = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.moneytrashDesktop);
};

export const initTauriApi = initDesktopApi;
export const isElectron = (): boolean => typeof window !== 'undefined' && Boolean(window.moneytrashDesktop);
export const isDesktop = isElectron;
export const isTauri = isDesktop; // Keeps legacy naming for existing imports

export const invoke = async <T = unknown>(cmd: string, args?: CommandArgs): Promise<T> => {
  if (!isElectron()) {
    throw new Error('Desktop API is unavailable');
  }
  return invokeElectron<T>(cmd, args);
};

export const desktopCommand = invoke;
export const tauriCommand = desktopCommand;

export const calculateFileChecksums = async (path: string): Promise<DualChecksumResult> => (
  invoke<DualChecksumResult>('calculate_file_checksums', { path })
);

export const approveDroppedFile = async (file: File) => {
  if (!window.moneytrashDesktop) throw new Error('Electron desktop API is unavailable');
  return window.moneytrashDesktop.files.approveDropped(file);
};

export const getAssetSrc = (path: string): string => {
  if (!window.moneytrashDesktop) return '';
  return `clickflash://${path}`; // Matches Electron protocol registration
};

export const startTethering = async () => invoke<{ success: boolean, error?: string }>('tether:start');
export const stopTethering = async () => invoke<{ success: boolean, error?: string }>('tether:stop');
export const getTetherStatus = async () => invoke<{ isTethering: boolean, camera: string | null }>('tether:status');

export const onTetherStatusChange = (callback: (payload: { status: string, camera?: string }) => void) => {
  if (!window.moneytrashDesktop?.tether) return () => {};
  return window.moneytrashDesktop.tether.onStatusChange(callback);
};

export const onTetherPhotoCaptured = (callback: (payload: { fileName: string, filePath: string, size: number, timestamp: string }) => void) => {
  if (!window.moneytrashDesktop?.tether) return () => {};
  return window.moneytrashDesktop.tether.onPhotoCaptured(callback);
};
