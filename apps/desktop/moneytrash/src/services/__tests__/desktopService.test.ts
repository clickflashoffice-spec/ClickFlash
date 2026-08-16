// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  approveDroppedFile,
  initDesktopApi,
  invoke,
  isDesktop,
  isElectron,
} from '../tauriService';
import {
  CHUNK_SIZE,
  chunkUploadSchema,
  nativeUploadSchema,
  sessionIdSchema,
  uploadConfigSchema,
} from '../../../electron-contract';

const createDesktopApi = (): NonNullable<Window['moneytrashDesktop']> => ({
  isElectron: true,
  files: {
    select: vi.fn(async () => []),
    selectFolder: vi.fn(async () => null),
    approveDropped: vi.fn(async () => ({ name: 'photo.jpg', path: 'C:\\photos\\photo.jpg', size: 10 })),
    readChunk: vi.fn(async () => new Uint8Array([1, 2, 3])),
    checksums: vi.fn(async () => ({ sha256: 'a', crc32: 'b', bytesProcessed: 3 })),
  },
  storage: {
    saveConfig: vi.fn(async () => undefined),
    loadConfig: vi.fn(async () => null),
    saveHistory: vi.fn(async () => undefined),
    loadHistory: vi.fn(async () => []),
  },
  cloud: {
    health: vi.fn(async () => ({ status: 'ok' })),
    financials: vi.fn(async () => ({ success: true })),
  },
  uploads: {
    startNative: vi.fn(async () => ({})),
    uploadChunk: vi.fn(async () => ({})),
    finalize: vi.fn(async () => ({})),
    progress: vi.fn(async () => null),
    active: vi.fn(async () => []),
    cancel: vi.fn(async () => true),
    onProgress: vi.fn(() => () => undefined),
  },
  notifications: {
    show: vi.fn(async () => true),
    openExternal: vi.fn(async () => undefined),
  },
});

afterEach(() => {
  delete window.moneytrashDesktop;
  vi.restoreAllMocks();
});

describe('Electron desktop adapter', () => {
  it('detects and initializes the Electron bridge', async () => {
    window.moneytrashDesktop = createDesktopApi();
    expect(isElectron()).toBe(true);
    expect(isDesktop()).toBe(true);
    await expect(initDesktopApi()).resolves.toBe(true);
  });

  it('normalizes legacy snake-case config before protected storage', async () => {
    const api = createDesktopApi();
    window.moneytrashDesktop = api;
    await invoke('save_upload_config', {
      config: {
        event_name: 'Wedding',
        access_code: 'ABC123',
        mode: 'moneytrash',
        api_url: 'https://moneytrash-api.clickflash.com',
        desk_id: 'DESK-01',
      },
    });
    expect(api.storage.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'Wedding',
      accessCode: 'ABC123',
      apiUrl: 'https://moneytrash-api.clickflash.com',
      deskId: 'DESK-01',
    }));
  });

  it('normalizes upload metadata and keeps file access in the main process', async () => {
    const api = createDesktopApi();
    window.moneytrashDesktop = api;
    await invoke('start_native_upload', {
      filePath: 'C:\\photos\\photo.jpg',
      metadata: { event_name: 'Wedding', access_code: 'ABC123', mode: 'moneytrash' },
    });
    expect(api.uploads.startNative).toHaveBeenCalledWith(expect.objectContaining({
      filePath: 'C:\\photos\\photo.jpg',
      metadata: expect.objectContaining({ eventName: 'Wedding', accessCode: 'ABC123' }),
    }));
    await expect(invoke('read_file', { path: 'C:\\photos\\photo.jpg' })).rejects.toThrow('Whole-file reads are disabled');
  });

  it('approves dropped files through the preload bridge', async () => {
    const api = createDesktopApi();
    window.moneytrashDesktop = api;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await expect(approveDroppedFile(file)).resolves.toMatchObject({ name: 'photo.jpg' });
    expect(api.files.approveDropped).toHaveBeenCalledWith(file);
  });

  it('forwards upload cancellation to the main process', async () => {
    const api = createDesktopApi();
    window.moneytrashDesktop = api;

    await expect(invoke('cancel_upload', { sessionId: 'session-123' })).resolves.toBe(true);
    expect(api.uploads.cancel).toHaveBeenCalledWith('session-123');
  });
});

describe('Electron command contracts', () => {
  it('rejects path traversal in session identifiers', () => {
    expect(() => sessionIdSchema.parse('../escape')).toThrow();
    expect(sessionIdSchema.parse('session_01-ABC')).toBe('session_01-ABC');
  });

  it('rejects oversized chunks and unapproved metadata shapes', () => {
    expect(() => chunkUploadSchema.parse({
      sessionId: 'session-1',
      chunkIndex: 0,
      totalChunks: 1,
      chunkData: new Uint8Array(CHUNK_SIZE + 1),
      fileName: 'photo.jpg',
      fileSize: CHUNK_SIZE + 1,
      metadata: { eventName: 'Event', accessCode: 'CODE', mode: 'moneytrash' },
    })).toThrow();
    expect(() => nativeUploadSchema.parse({
      filePath: 'C:\\photos\\photo.jpg',
      metadata: { eventName: 'Event', accessCode: 'CODE', mode: 'moneytrash', unexpected: true },
    })).toThrow();
  });

  it('requires a structurally valid URL for persisted configuration', () => {
    expect(() => uploadConfigSchema.parse({ apiUrl: 'javascript:alert(1)' })).not.toThrow();
    expect(() => uploadConfigSchema.parse({ apiUrl: 'not-a-url' })).toThrow();
  });
});
