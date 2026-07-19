import mqtt from 'mqtt';
import { appLogger as logger } from '../shared/logger';

export class MQTTClientService {
  private client: mqtt.MqttClient | null = null;
  // TODO: Use mDNS discovery to find Master's IP. Hardcoded for local testing.
  private readonly brokerUrl = process.env.MASTER_MQTT_URL || 'mqtt://127.0.0.1:1883';
  private queuedEvents: { topic: string, payload: any }[] = [];

  constructor() {
    this.client = mqtt.connect(this.brokerUrl, {
      clientId: `touch-client-${Math.random().toString(16).slice(2, 8)}`,
      reconnectPeriod: 2000,
      clean: false // For resilient messaging
    });

    this.client.on('connect', () => {
      logger.info('[MQTT Touch] Connected to Master Broker');
      this.flushQueue();
      // Subscribe to commands intended for kiosks
      this.client?.subscribe('touch/+/commands', { qos: 1 });
    });

    this.client.on('message', (topic, message) => {
      logger.info(`[MQTT Touch] Received on ${topic}: ${message.toString()}`);
      // Handle remote commands here (e.g. reload, sleep)
    });

    this.client.on('error', (err) => {
      logger.error('[MQTT Touch] Connection error', { error: err.message });
    });

    this.client.on('offline', () => {
      logger.warn('[MQTT Touch] Broker offline, queueing messages locally');
    });
  }

  public publish(topic: string, payload: any, qos: 0 | 1 | 2 = 1) {
    if (this.client?.connected) {
      const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
      this.client.publish(topic, msg, { qos, retain: false }, (err) => {
        if (err) logger.error(`[MQTT Touch] Failed to publish ${topic}`, { error: err.message });
      });
    } else {
      logger.debug(`[MQTT Touch] Queueing message for ${topic}`);
      this.queuedEvents.push({ topic, payload });
    }
  }

  private flushQueue() {
    if (this.queuedEvents.length === 0) return;
    logger.info(`[MQTT Touch] Flushing ${this.queuedEvents.length} queued messages`);
    
    const queue = [...this.queuedEvents];
    this.queuedEvents = [];

    queue.forEach(({ topic, payload }) => {
      this.publish(topic, payload);
    });
  }

  public stop() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }
}

export const mqttClientService = new MQTTClientService();
