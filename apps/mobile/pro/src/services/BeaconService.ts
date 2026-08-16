import { logger } from '@/utils/logger';

import { RustCore } from '../../modules/clickflash-rust-core';

export interface BeaconPayload {
  photographerId: string;
  sessionId?: string;
  timestamp: number;
}

export class BeaconService {
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private currentPayload: BeaconPayload | null = null;
  private dbPath: string = 'offline_queue.db'; // SQLite DB managed by Rust

  /**
   * Starts high-performance background BLE scanning using Rust Core.
   * This runs during an active photographer shift to detect nearby guests.
   */
  public startScanning(photographerId: string, sessionId?: string) {
    if (this.isScanning) {
      this.stopScanning();
    }

    this.currentPayload = {
      photographerId,
      sessionId,
      timestamp: Date.now(),
    };

    this.isScanning = true;
    logger.info(`[BeaconService] Started BLE background scanning for photographer: ${photographerId}`);

    // Loop to continuously scan in chunks of 5 seconds via Rust JNI
    this.scanInterval = setInterval(async () => {
      this.currentPayload!.timestamp = Date.now();
      
      try {
        const resultJson = await RustCore.scanAndLinkBeacons({
          dbPath: this.dbPath,
          durationSecs: 5
        });
        const result = JSON.parse(resultJson);
        
        if (result.linked > 0) {
          logger.info(`[BeaconService] Rust Core successfully linked ${result.linked} nearby guests in this pass.`);
        }
      } catch (error) {
        logger.error(`[BeaconService] Rust BLE Scanner Error:`, error);
      }
    }, 5500); // Wait 500ms between 5-second scans
  }

  public stopScanning() {
    if (!this.isScanning) return;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this.isScanning = false;
    this.currentPayload = null;
    logger.info('[BeaconService] Stopped BLE background scanning');
  }

  public getStatus() {
    return {
      isScanning: this.isScanning,
      payload: this.currentPayload,
    };
  }
}

export const beaconService = new BeaconService();
