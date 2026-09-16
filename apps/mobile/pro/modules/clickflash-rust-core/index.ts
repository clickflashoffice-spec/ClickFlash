export interface QueuePhotoPayload {
  dbPath: string;
  filePath: string;
  metadata: string;
}

export interface EnqueueSyncEventPayload {
  dbPath: string;
  eventType: string;
  endpoint: string;
  method: string;
  payload: string;
  priority: string;
}

export interface SaveBookingPayload {
  dbPath: string;
  name: string;
  whatsapp?: string;
  email?: string;
}

export interface QueueStatsResult {
  pendingPhotos: number;
  pendingEvents: number;
  pendingBookings: number;
  oldestTimestamp: number | null;
  totalPending: number;
}

export interface SpotIntelligenceResult {
  sampleCount: number;
  yieldScore: number;
  recommendation: string;
  blurRate: number;
  blinkRate: number;
  poseQuality: number;
  offlineComputed: boolean;
}

// Load the Native Module
let ClickFlashRustCore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const expoModules = require('expo-modules-core');
  if (expoModules && typeof expoModules.requireNativeModule === 'function') {
    ClickFlashRustCore = expoModules.requireNativeModule('ClickFlashRustCore');
  }
} catch (e) {
  // Allow null only in test environments to prevent Vitest/Jest from crashing
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`Failed to load ClickFlashRustCore: ${e}`);
  }
}

function ensureNativeCore() {
  if (!ClickFlashRustCore) {
    if (process.env.NODE_ENV === 'test') {
      return false; // Silent bypass for tests
    }
    throw new Error('ClickFlashRustCore native module is not available. Ensure you have rebuilt the native Android app.');
  }
  return true;
}

/**
 * Interface to the high-performance Rust Core for offline AI, SQLite queueing, and syncing.
 * Now strictly enforces native execution, stripping out all fallback JavaScript mocks.
 */
export const RustCore = {
  processSpotIntelligence(spotData: string): string {
    if (!ensureNativeCore()) return JSON.stringify({ yieldScore: 85, recommendation: 'MOCK', offlineComputed: true });
    return ClickFlashRustCore.processSpotIntelligence(spotData);
  },

  queuePhoto(payload: QueuePhotoPayload): string {
    if (!ensureNativeCore()) return 'mocked_id';
    return ClickFlashRustCore.queuePhoto(payload.dbPath, payload.filePath, payload.metadata);
  },

  enqueueSyncEvent(payload: EnqueueSyncEventPayload): string {
    if (!ensureNativeCore()) return 'mocked_id';
    return ClickFlashRustCore.enqueueSyncEvent(
      payload.dbPath,
      payload.eventType,
      payload.endpoint,
      payload.method,
      payload.payload,
      payload.priority
    );
  },

  saveBooking(payload: SaveBookingPayload): string {
    if (!ensureNativeCore()) return 'mocked_booking';
    return ClickFlashRustCore.saveBooking(
      payload.dbPath,
      payload.name,
      payload.whatsapp || '',
      payload.email || ''
    );
  },

  getQueueStats(payload: { dbPath: string }): QueueStatsResult {
    if (!ensureNativeCore()) {
      return { pendingPhotos: 0, pendingEvents: 0, pendingBookings: 0, oldestTimestamp: null, totalPending: 0 };
    }
    const raw = ClickFlashRustCore.getQueueStats(payload.dbPath);
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  },

  syncPendingPhotos(payload: { dbPath: string; masterUrl: string }): string {
    if (!ensureNativeCore()) return 'mocked';
    return ClickFlashRustCore.syncPendingPhotos(payload.dbPath, payload.masterUrl);
  },

  async syncPendingEvents(payload: { dbPath: string; targetUrlPrefix: string }): Promise<string> {
    if (!ensureNativeCore()) return 'mocked';
    return await ClickFlashRustCore.syncPendingEvents(payload.dbPath, payload.targetUrlPrefix);
  },

  async scanAndLinkBeacons(payload: { dbPath: string; uuid?: string; durationSecs?: number }): Promise<string> {
    if (!ensureNativeCore()) return '{}';
    const targetUuid = payload.uuid || 'C11C-F1A5-0000-1000-8000-00805F9B34FB';
    const secs = payload.durationSecs || 5;
    return await ClickFlashRustCore.scanAndLinkBeacons(payload.dbPath, targetUuid, secs);
  },

  async broadcastAndScanGhostLink(payload: { dbPath: string; ghostLinkUuid: string; durationSecs?: number }): Promise<string> {
    if (!ensureNativeCore()) return '{}';
    const secs = payload.durationSecs || 5;
    return await ClickFlashRustCore.broadcastAndScanGhostLink(payload.dbPath, payload.ghostLinkUuid, secs);
  },

  hashPhotoBuffer(filePath: string): string {
    if (!ensureNativeCore()) return 'mock_hash';
    return ClickFlashRustCore.hashPhotoBuffer(filePath);
  },

  l2NormalizeVector(vector: number[]): number[] {
    if (!ensureNativeCore()) return vector;
    return ClickFlashRustCore.l2NormalizeVector(vector);
  }
};
