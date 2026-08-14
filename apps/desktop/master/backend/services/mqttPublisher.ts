import mqtt from 'mqtt';
import { logger } from '../utils/logger';

export class MQTTPublisher {
  private static client: mqtt.MqttClient | null = null;
  private static readonly BROKER_URL = 'mqtt://127.0.0.1:1883';

  public static initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client) return resolve();

      this.client = mqtt.connect(this.BROKER_URL, {
        clientId: 'master-publisher',
        reconnectPeriod: 1000,
        clean: false // For persistent sessions (QoS > 0)
      });

      this.client.on('connect', () => {
        logger.info('[MQTT Publisher] Connected to local broker');
        resolve();
      });

      this.client.on('error', (err) => {
        logger.error('[MQTT Publisher] Connection error', { error: err.message });
        if (!this.client?.connected) {
           reject(err);
        }
      });
    });
  }

  public static publish(topic: string, payload: any, qos: 0 | 1 | 2 = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        return reject(new Error('MQTT client not connected'));
      }

      const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      this.client.publish(topic, message, { qos, retain: false }, (err) => {
        if (err) {
          logger.error(`[MQTT Publisher] Failed to publish to ${topic}`, { error: err.message });
          return reject(err);
        }
        resolve();
      });
    });
  }
}
