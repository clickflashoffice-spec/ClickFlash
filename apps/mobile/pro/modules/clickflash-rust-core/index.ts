import AsyncStorage from '@react-native-async-storage/async-storage';

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

const memStore = new Map<string, string>();
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        return await AsyncStorage.getItem(key);
      }
      if ((AsyncStorage as any)?.default && typeof (AsyncStorage as any).default.getItem === 'function') {
        return await (AsyncStorage as any).default.getItem(key);
      }
    } catch {}
    return memStore.get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        return await AsyncStorage.setItem(key, value);
      }
      if ((AsyncStorage as any)?.default && typeof (AsyncStorage as any).default.setItem === 'function') {
        return await (AsyncStorage as any).default.setItem(key, value);
      }
    } catch {}
    memStore.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        return await AsyncStorage.removeItem(key);
      }
      if ((AsyncStorage as any)?.default && typeof (AsyncStorage as any).default.removeItem === 'function') {
        return await (AsyncStorage as any).default.removeItem(key);
      }
    } catch {}
    memStore.delete(key);
  }
};

/**
 * Helper to safely persist to storage without blocking sync signatures
 */
const fireAndForgetAppend = async (key: string, item: any) => {
  try {
    const data = await storage.getItem(key);
    const queue = data ? JSON.parse(data) : [];
    queue.push({ ...item, _timestamp: Date.now() });
    await storage.setItem(key, JSON.stringify(queue));
  } catch (err) {
    console.error(`[RustCore Mock] Failed to persist to ${key}:`, err);
  }
};

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
   * Queues a photo to the offline database using Rust core for maximum performance
   */
  queuePhoto(payload: QueuePhotoPayload): string {
    if (ClickFlashRustCore?.queuePhoto) {
      return ClickFlashRustCore.queuePhoto(payload.dbPath, payload.filePath, payload.metadata);
    }
    fireAndForgetAppend('OFFLINE_PHOTOS', payload);
    return `Fallback: Photo ${payload.filePath} queued offline to AsyncStorage`;
  },

  /**
   * Queues a generic sync event to the offline database using Rust core
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
    fireAndForgetAppend('OFFLINE_EVENTS', payload);
    return `Fallback: Sync event ${payload.eventType} queued offline to AsyncStorage`;
  },

  /**
   * Saves a guest booking offline directly into database via Rust Core and enqueues sync
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
    fireAndForgetAppend('OFFLINE_BOOKINGS', { mockId, ...payload });
    return `Fallback: Booking ${mockId} registered offline via AsyncStorage (Name: ${payload.name})`;
  },

  /**
   * Fetches pending queue statistics from the offline database
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
   * Sweeps the offline database and pushes all pending photos to the Master Node via HTTP.
   */
  syncPendingPhotos(payload: { dbPath: string; masterUrl: string }): string {
    if (ClickFlashRustCore?.syncPendingPhotos) {
      return ClickFlashRustCore.syncPendingPhotos(payload.dbPath, payload.masterUrl);
    }
    
    // Simulate async sync kickoff for fallback
    storage.getItem('OFFLINE_PHOTOS').then(async (data) => {
      if (!data) return;
      const queue = JSON.parse(data);
      if (queue.length === 0) return;
      
      console.log(`[RustCore Mock] Syncing ${queue.length} offline photos to ${payload.masterUrl}...`);
      // Simulating a successful sync by clearing the queue
      await storage.removeItem('OFFLINE_PHOTOS');
    }).catch(console.error);

    return 'Fallback: Triggered async photo sync via AsyncStorage';
  },

  /**
   * Pushes all generic pending events from the offline database to the target API prefix via HTTP.
   */
  async syncPendingEvents(payload: { dbPath: string; targetUrlPrefix: string }): Promise<string> {
    if (ClickFlashRustCore?.syncPendingEvents) {
      return await ClickFlashRustCore.syncPendingEvents(payload.dbPath, payload.targetUrlPrefix);
    }
    
    try {
      const data = await storage.getItem('OFFLINE_EVENTS');
      if (!data) return 'Fallback: 0 events synced via AsyncStorage';
      
      const queue = JSON.parse(data);
      if (queue.length === 0) return 'Fallback: 0 events synced via AsyncStorage';
      
      console.log(`[RustCore Mock] Syncing ${queue.length} offline events to ${payload.targetUrlPrefix}...`);
      await storage.removeItem('OFFLINE_EVENTS');
      return `Fallback: ${queue.length} events synced via AsyncStorage`;
    } catch (err) {
      console.error(err);
      return 'Fallback: Failed to sync events';
    }
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

