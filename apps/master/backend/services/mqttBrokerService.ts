import * as aedesModule from 'aedes';
const Aedes = (aedesModule as any).default || aedesModule;
import net from 'net';
import { logger } from '../utils/logger';

export class MQTTBrokerService {
  private static broker: any = null;
  private static server: net.Server | null = null;
  private static readonly PORT = 1883;

  public static start(): void {
    if (this.broker) return;

    // @ts-ignore - aedes has varied export styles depending on version
    this.broker = typeof Aedes === 'function' ? new (Aedes as any)() : new (Aedes as any).default();
    this.server = net.createServer(this.broker.handle);

    this.server.listen(this.PORT, () => {
      logger.info(`[MQTT Broker] Listening on port ${this.PORT}`);
    });

    this.broker.on('client', (client: any) => {
      logger.debug(`[MQTT Broker] Client Connected: ${client ? client.id : 'unknown'}`);
    });

    this.broker.on('clientDisconnect', (client: any) => {
      logger.debug(`[MQTT Broker] Client Disconnected: ${client ? client.id : 'unknown'}`);
    });

    this.broker.on('publish', (packet: any, client: any) => {
      if (client && !packet.topic.startsWith('$SYS/')) {
        logger.debug(`[MQTT Broker] Publish from ${client.id} to topic ${packet.topic}`);
      }
    });
  }

  public static stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (this.broker) {
      this.broker.close();
      this.broker = null;
    }
    logger.info('[MQTT Broker] Stopped');
  }
}
