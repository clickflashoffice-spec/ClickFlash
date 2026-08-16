import { requireNativeModule } from 'expo-modules-core';

// Ensure the module exists in the native registry
let ClickFlashRustCore: any;
try {
  ClickFlashRustCore = requireNativeModule('ClickFlashRustCore');
} catch (e) {
  console.warn("ClickFlashRustCore native module not linked yet. Returning mock.");
  ClickFlashRustCore = {
    processSpotIntelligence: (data: string) => "Mock Rust Response"
  };
}

/**
 * Interface to the high-performance Rust Core for offline AI and syncing.
 */
export const RustCore = {
  /**
   * Processes large spot yield data offline using the Rust native core.
   */
  processSpotIntelligence(spotData: string): string {
    return ClickFlashRustCore.processSpotIntelligence(spotData);
  },

  /**
   * Queues a photo to the offline SQLite database using Rust core for maximum performance
   */
  queuePhoto(payload: { dbPath: string, filePath: string, metadata: string }): string {
    if (ClickFlashRustCore.queuePhoto) {
        return ClickFlashRustCore.queuePhoto(payload.dbPath, payload.filePath, payload.metadata);
    }
    return "Mock: Photo queued offline via Rust Core";
  },

  /**
   * Queues a generic sync event to the offline SQLite database using Rust core
   */
  enqueueSyncEvent(payload: { dbPath: string, eventType: string, endpoint: string, method: string, payload: string, priority: string }): string {
    if (ClickFlashRustCore.enqueueSyncEvent) {
        return ClickFlashRustCore.enqueueSyncEvent(payload.dbPath, payload.eventType, payload.endpoint, payload.method, payload.payload, payload.priority);
    }
    return "Mock: Sync event queued offline via Rust Core";
  },

  /**
   * Sweeps the offline SQLite database and pushes all pending photos to the Master Node via HTTP.
   */
  syncPendingPhotos(payload: { dbPath: string, masterUrl: string }): string {
    if (ClickFlashRustCore.syncPendingPhotos) {
        return ClickFlashRustCore.syncPendingPhotos(payload.dbPath, payload.masterUrl);
    }
    return "Mock: Photos synced via Rust Core";
  },

  /**
   * Pushes all generic pending events from the offline SQLite database to the target API prefix via HTTP.
   */
  async syncPendingEvents(payload: { dbPath: string, targetUrlPrefix: string }): Promise<string> {
    if (ClickFlashRustCore.syncPendingEvents) {
        return await ClickFlashRustCore.syncPendingEvents(payload.dbPath, payload.targetUrlPrefix);
    }
    return "Mock: Events synced via Rust Core";
  },

  /**
   * High-performance BLE background scanner built in Rust to detect nearby Guest UUIDs
   * and link them locally while offline.
   */
  async scanAndLinkBeacons(payload: { dbPath: string, uuid?: string, durationSecs?: number }): Promise<string> {
    const targetUuid = payload.uuid || "C11C-F1A5-0000-1000-8000-00805F9B34FB";
    const secs = payload.durationSecs || 5;
    if (ClickFlashRustCore.scanAndLinkBeacons) {
      return await ClickFlashRustCore.scanAndLinkBeacons(payload.dbPath, targetUuid, secs);
    }
    return JSON.stringify({ status: "mock", discovered: 0, linked: 0 });
  },

  /**
   * Broadcasts the Ghost-Link UUID and scans for proximity matches, adding them to the offline buffer.
   */
  async broadcastAndScanGhostLink(payload: { dbPath: string, ghostLinkUuid: string, durationSecs?: number }): Promise<string> {
    const secs = payload.durationSecs || 5;
    if (ClickFlashRustCore.broadcastAndScanGhostLink) {
      return await ClickFlashRustCore.broadcastAndScanGhostLink(payload.dbPath, payload.ghostLinkUuid, secs);
    }
    return JSON.stringify({ status: "mock", discovered: 0, linked: 0 });
  }
};
