import { logger } from '@/utils/logger';

export interface BeaconPayload {
  photographerId: string;
  sessionId?: string;
  timestamp: number;
}

export class BeaconService {
  private isBroadcasting = false;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private currentPayload: BeaconPayload | null = null;

  /**
   * Starts broadcasting UWB and BLE beacons.
   * In a real React Native app, this would use `react-native-ble-plx` or 
   * platform-specific native modules for UWB (like iOS NearbyInteraction).
   */
  public startBroadcasting(photographerId: string, sessionId?: string) {
    if (this.isBroadcasting) {
      this.stopBroadcasting();
    }

    this.currentPayload = {
      photographerId,
      sessionId,
      timestamp: Date.now(),
    };

    this.isBroadcasting = true;
    logger.info(`[BeaconService] Started UWB/BLE broadcasting for photographer: ${photographerId}`);

    // Mock beacon broadcasting by logging every 5 seconds
    this.broadcastInterval = setInterval(() => {
      this.currentPayload!.timestamp = Date.now();
      logger.debug(`[BeaconService] Broadcasting payload...`, this.currentPayload);
      
      // In production, this would call native modules to emit BLE advertisements
      // and update UWB ranging sessions.
    }, 5000);
  }

  public stopBroadcasting() {
    if (!this.isBroadcasting) return;

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    this.isBroadcasting = false;
    this.currentPayload = null;
    logger.info('[BeaconService] Stopped UWB/BLE broadcasting');
  }

  public getStatus() {
    return {
      isBroadcasting: this.isBroadcasting,
      payload: this.currentPayload,
    };
  }
}

export const beaconService = new BeaconService();
