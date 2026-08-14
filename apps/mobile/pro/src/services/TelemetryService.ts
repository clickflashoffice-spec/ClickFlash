// @ts-ignore
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { getDatabase } from '@/backend/database';
import { logger } from '@/utils/logger';
import * as Crypto from 'expo-crypto';

export type AnomalySeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export interface AnomalyEvent {
  id: string;
  photographerId: string;
  type: string;
  severity: AnomalySeverity;
  timestamp: string;
  spotId?: string;
  details?: Record<string, any>;
}

/**
 * Tracks photographer movement and location to detect time-theft ("Hiding") 
 * or abnormal stationary behavior.
 */
class TelemetryService {
  private subscription: any = null;
  private lastMovementTimestamp: number = Date.now();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly IDLE_THRESHOLD_MS = 45 * 60 * 1000; // 45 minutes

  public async startTracking(photographerId: string) {
    // Request permissions
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') {
      logger.warn('[Telemetry] Location permission denied. Cannot track hotspots properly.');
      return;
    }

    this.lastMovementTimestamp = Date.now();

    // Monitor accelerometer for physical movement
    if (Accelerometer?.setUpdateInterval) {
      Accelerometer.setUpdateInterval(5000); // Check every 5 seconds
      this.subscription = (Accelerometer as any).addListener((accelerometerData: { x: number; y: number; z: number }) => {
        const { x, y, z } = accelerometerData;
        // Basic movement threshold calculation
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        if (Math.abs(acceleration - 1.0) > 0.2) { // 1.0 is gravity, > 0.2 is movement
          this.lastMovementTimestamp = Date.now();
        }
      });
    }

    // Periodically check if idle
    this.checkInterval = setInterval(() => this.checkForIdle(photographerId), 60000); // Check every minute
    logger.info('[Telemetry] Started behavioral telemetry tracking.');
  }

  public stopTracking() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('[Telemetry] Stopped telemetry tracking.');
  }

  public registerPhotoCaptured() {
    // A photo capture resets the idle timer
    this.lastMovementTimestamp = Date.now();
  }

  private async checkForIdle(photographerId: string) {
    const now = Date.now();
    if (now - this.lastMovementTimestamp > this.IDLE_THRESHOLD_MS) {
      logger.warn('[Telemetry] Idle threshold exceeded. Flagging anomaly.');
      await this.flagAnomaly(photographerId, 'Idle', 'High', 'Photographer stationary for over 45 minutes.');
      
      // Reset timer so we don't spam
      this.lastMovementTimestamp = Date.now();
    }
  }

  private async flagAnomaly(photographerId: string, type: AnomalyEvent['type'], severity: AnomalySeverity, reason: string) {
    const database = await getDatabase();
    // Get active spot
    const activeSpot = await database.getFirstAsync<{ spotId: string }>(
      `SELECT spot_id AS spotId FROM spot_state WHERE id = 'active'`
    );

    const event: AnomalyEvent = {
      id: Crypto.randomUUID(),
      photographerId,
      type,
      severity,
      timestamp: new Date().toISOString(),
      spotId: activeSpot?.spotId,
      details: { reason }
    };

    // Save to local queue for syncing
    // Assuming sync_queue or similar exists; for now we log it.
    logger.info(`[Telemetry] Anomaly Logged: ${JSON.stringify(event)}`);
    // In a full implementation, this would insert into a local outbox to sync to Master.
  }
}

export const telemetryService = new TelemetryService();
