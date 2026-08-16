import { RedisStreamConsumer } from './redisStreamConsumer';
import { redisCache } from './redisCacheService';
import { logger } from '../utils/logger';
import { BleHeartbeatEvent, GuestProximityMatch } from '@clickflash/types';
import { randomUUID } from 'crypto';

export class BleMatchEngine {
  private consumer: RedisStreamConsumer;

  constructor() {
    this.consumer = new RedisStreamConsumer(redisCache);
  }

  /**
   * Initializes the engine and begins listening to the BLE heartbeats stream.
   */
  public async start(): Promise<void> {
    logger.info('[BleMatchEngine] Starting BLE Match Engine');
    
    this.consumer.register({
      stream: 'ble:heartbeats',
      group: 'match-engine-group',
      consumer: 'match-engine-worker',
      handler: async (eventId: string, fields: Record<string, string>) => {
        await this.handleHeartbeat(eventId, fields);
      }
    });

    // Start consuming
    await this.consumer.start();
  }

  /**
   * Stops the consumer gracefully.
   */
  public stop(): void {
    logger.info('[BleMatchEngine] Stopping BLE Match Engine');
    this.consumer.stop();
  }

  /**
   * Process a single BLE heartbeat event from the Redis stream.
   * Auto-links Guest UUID and Photographer/Node Camera ID based on proximity.
   */
  private async handleHeartbeat(eventId: string, fields: Record<string, string>): Promise<void> {
    try {
      // In Redis streams, complex objects might be JSON serialized in a 'payload' field,
      // or the fields might be flattened. We handle both cases for robustness.
      let payload: BleHeartbeatEvent['payload'] | any = {};
      
      if (fields.payload) {
        payload = JSON.parse(fields.payload);
      } else {
        payload = fields;
      }

      logger.debug(`[BleMatchEngine] Received heartbeat from device ${payload.deviceId}`);

      // Perform matching logic here
      // For demonstration, we attempt to parse a potential match from the payload or state
      const guestId = payload.guestId || payload.userId; // Guest UUID
      const nodeId = payload.nodeId || payload.deviceId; // Photographer/Node ID
      
      if (guestId && nodeId && guestId !== nodeId) {
        const rssi = parseInt(payload.rssi || '-50', 10);
        const match = this.evaluateProximityMatch(guestId, nodeId, rssi);

        if (match.confidenceScore > 0.7) {
          logger.info(`[BleMatchEngine] High confidence match found: Guest ${guestId} -> Node ${nodeId}`);
          await this.registerMatch(match);
        }
      }
    } catch (error) {
      logger.error(`[BleMatchEngine] Error handling heartbeat event ${eventId}: ${error}`);
    }
  }

  /**
   * Evaluates if a given guest and node have a strong enough proximity match.
   */
  private evaluateProximityMatch(guestId: string, nodeId: string, rssi: number): GuestProximityMatch {
    // Basic heuristic: Closer distances have higher RSSI (closer to 0)
    // -40 is very close, -90 is far.
    let confidenceScore = 0;
    
    if (rssi >= -50) {
      confidenceScore = 0.95; // Very close, highly confident
    } else if (rssi >= -65) {
      confidenceScore = 0.8;  // Close, reasonably confident
    } else if (rssi >= -80) {
      confidenceScore = 0.4;  // Far, low confidence
    } else {
      confidenceScore = 0.1;  // Very far, ignore
    }

    // Rough distance estimation formula for BLE
    const txPower = -59; // Hardcoded default txPower for example
    const estimatedDistanceMeters = Math.pow(10, (txPower - rssi) / (10 * 2));

    return {
      matchId: randomUUID(),
      guestId,
      nodeId,
      timestamp: Date.now(),
      rssi,
      estimatedDistanceMeters,
      confidenceScore
    };
  }

  /**
   * Registers a successfully evaluated match.
   * This might save to the database, or publish a new event for downstream processing.
   */
  private async registerMatch(match: GuestProximityMatch): Promise<void> {
    // For now, we stub the registration by publishing a match event to Redis.
    // In a full implementation, this might insert into SQLite or link specific photos.
    await redisCache.publishEvent('ble:matches', {
      matchId: match.matchId,
      payload: JSON.stringify(match)
    });
    
    logger.debug(`[BleMatchEngine] Match ${match.matchId} published to stream`);
  }
}

// Export singleton instance for easy usage
export const bleMatchEngine = new BleMatchEngine();
