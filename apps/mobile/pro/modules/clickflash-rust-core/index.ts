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

// Ensure the module exists in the native registry
let ClickFlashRustCore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const expoModules = require('expo-modules-core');
  if (expoModules && typeof expoModules.requireNativeModule === 'function') {
    ClickFlashRustCore = expoModules.requireNativeModule('ClickFlashRustCore');
  }
} catch {
  // Running in Node / CLI / Vitest emulator
  ClickFlashRustCore = null;
}

/**
 * Interface to the high-performance Rust Core for offline AI, SQLite queueing, and syncing.
 */
export const RustCore = {
  /**
   * Processes large spot yield data offline using the Rust native core.
   */
  processSpotIntelligence(spotData: string): string {
    if (ClickFlashRustCore?.processSpotIntelligence) {
      return ClickFlashRustCore.processSpotIntelligence(spotData);
    }
    try {
      const parsed = typeof spotData === 'string' ? JSON.parse(spotData) : spotData;
      const avgPose = parsed.averagePoseQuality ?? 0.85;
      const blur = parsed.blurRate ?? 0.08;
      const blink = parsed.blinkRate ?? 0.05;
      const yieldScore = (avgPose * 50) + ((1 - blur) * 30) + ((1 - blink) * 20);
      const recommendation = blur > 0.2 ? 'INCREASE_SHUTTER_SPEED' : yieldScore > 80 ? 'HOLD_POSITION_PEAK_YIELD' : 'MONITOR_PASSING_CROWD';
      return JSON.stringify({
        sampleCount: parsed.sampleCount ?? 20,
        yieldScore,
        recommendation,
        blurRate: blur,
        blinkRate: blink,
        poseQuality: avgPose,
        offlineComputed: true
      });
    } catch {
      return JSON.stringify({
        spot: spotData,
        yieldScore: 85.0,
        recommendation: 'OPTIMAL_LIGHTING',
        offlineComputed: true
      });
    }
  },

  /**
   * Queues a photo to the offline SQLite database using Rust core for maximum performance
   */
  queuePhoto(payload: QueuePhotoPayload): string {
    if (ClickFlashRustCore?.queuePhoto) {
      return ClickFlashRustCore.queuePhoto(payload.dbPath, payload.filePath, payload.metadata);
    }
    return `Mock: Photo ${payload.filePath} queued offline via Rust Core`;
  },

  /**
   * Queues a generic sync event to the offline SQLite database using Rust core
   */
  enqueueSyncEvent(payload: EnqueueSyncEventPayload): string {
    if (ClickFlashRustCore?.enqueueSyncEvent) {
      return ClickFlashRustCore.enqueueSyncEvent(
        payload.dbPath,
        payload.eventType,
        payload.endpoint,
        payload.method,
        payload.payload,
        payload.priority
      );
    }
    return `Mock: Sync event ${payload.eventType} queued offline via Rust Core`;
  },

  /**
   * Saves a guest booking offline directly into SQLite via Rust Core and enqueues sync
   */
  saveBooking(payload: SaveBookingPayload): string {
    if (ClickFlashRustCore?.saveBooking) {
      return ClickFlashRustCore.saveBooking(
        payload.dbPath,
        payload.name,
        payload.whatsapp || '',
        payload.email || ''
      );
    }
    const mockId = `booking_${Date.now()}_rust_mock`;
    return `Booking ${mockId} registered offline via Rust Core (Name: ${payload.name})`;
  },

  /**
   * Fetches pending queue statistics from the offline SQLite database
   */
  getQueueStats(payload: { dbPath: string }): QueueStatsResult {
    if (ClickFlashRustCore?.getQueueStats) {
      const raw = ClickFlashRustCore.getQueueStats(payload.dbPath);
      try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        // Fallthrough
      }
    }
    return {
      pendingPhotos: 0,
      pendingEvents: 0,
      pendingBookings: 0,
      oldestTimestamp: null,
      totalPending: 0
    };
  },

  /**
   * Sweeps the offline SQLite database and pushes all pending photos to the Master Node via HTTP.
   */
  syncPendingPhotos(payload: { dbPath: string; masterUrl: string }): string {
    if (ClickFlashRustCore?.syncPendingPhotos) {
      return ClickFlashRustCore.syncPendingPhotos(payload.dbPath, payload.masterUrl);
    }
    return 'Mock: 0 photos synced via Rust Core';
  },

  /**
   * Pushes all generic pending events from the offline SQLite database to the target API prefix via HTTP.
   */
  async syncPendingEvents(payload: { dbPath: string; targetUrlPrefix: string }): Promise<string> {
    if (ClickFlashRustCore?.syncPendingEvents) {
      return await ClickFlashRustCore.syncPendingEvents(payload.dbPath, payload.targetUrlPrefix);
    }
    return 'Mock: 0 events synced via Rust Core';
  },

  /**
   * High-performance BLE background scanner built in Rust to detect nearby Guest UUIDs
   * and link them locally while offline.
   */
  async scanAndLinkBeacons(payload: { dbPath: string; uuid?: string; durationSecs?: number }): Promise<string> {
    const targetUuid = payload.uuid || 'C11C-F1A5-0000-1000-8000-00805F9B34FB';
    const secs = payload.durationSecs || 5;
    if (ClickFlashRustCore?.scanAndLinkBeacons) {
      return await ClickFlashRustCore.scanAndLinkBeacons(payload.dbPath, targetUuid, secs);
    }
    return JSON.stringify({ status: 'mock', discovered: 0, linked: 0 });
  },

  /**
   * Broadcasts the Ghost-Link UUID and scans for proximity matches, adding them to the offline buffer.
   */
  async broadcastAndScanGhostLink(payload: { dbPath: string; ghostLinkUuid: string; durationSecs?: number }): Promise<string> {
    const secs = payload.durationSecs || 5;
    if (ClickFlashRustCore?.broadcastAndScanGhostLink) {
      return await ClickFlashRustCore.broadcastAndScanGhostLink(payload.dbPath, payload.ghostLinkUuid, secs);
    }
    return JSON.stringify({ status: 'mock', discovered: 0, linked: 0 });
  }
};
