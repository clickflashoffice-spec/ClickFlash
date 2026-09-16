import { logger } from '@/utils/logger';
import { getRustDbPath } from './OfflineQueueService';
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
  private dbPath: string = getRustDbPath(); // SQLite DB managed by Rust

  private isExecutingScan = false;

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

    const runScanLoop = async () => {
      if (!this.isScanning) return;
      if (this.isExecutingScan) {
         this.scanInterval = setTimeout(runScanLoop, 500);
         return;
      }
      
      this.isExecutingScan = true;
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
      } finally {
        this.isExecutingScan = false;
        if (this.isScanning) {
          this.scanInterval = setTimeout(runScanLoop, 500);
        }
      }
    };

    // Kick off the scanning loop
    runScanLoop();
  }

  public stopScanning() {
    if (!this.isScanning) return;

    if (this.scanInterval) {
      clearTimeout(this.scanInterval);
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
