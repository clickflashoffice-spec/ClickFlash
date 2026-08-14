import { logger } from '@clickflash/logger';

export interface PtpIpEvent {
  type: string;
  data?: Uint8Array;
}

interface PtpIpSocket {
  on(event: 'data', listener: (data: Uint8Array) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'close', listener: () => void): void;
  destroy(): void;
}

export type PtpIpSocketFactory = (
  options: { host: string; port: number },
  onConnected: () => void
) => PtpIpSocket;

export class PtpIpTransportUnavailableError extends Error {
  constructor() {
    super('PTP/IP is unavailable until a certified Android socket adapter is installed.');
    this.name = 'PtpIpTransportUnavailableError';
  }
}

export class PtpIpClient {
  private commandSocket: PtpIpSocket | null = null;
  private eventSocket: PtpIpSocket | null = null;

  constructor(
    private readonly host = '192.168.1.1',
    private readonly port = 15740,
    private readonly createSocket?: PtpIpSocketFactory
  ) {}

  connect(): Promise<void> {
    if (!this.createSocket) {
      return Promise.reject(new PtpIpTransportUnavailableError());
    }

    return new Promise((resolve, reject) => {
      let connected = false;
      try {
        this.commandSocket = this.createSocket?.(
          { port: this.port, host: this.host },
          () => {
            connected = true;
            logger.info('[PtpIpClient] Command socket connected');
            this.sendInitCommand();
            resolve();
          }
        ) ?? null;

        this.commandSocket?.on('data', (data) => this.handleCommandData(data));
        this.commandSocket?.on('error', (error) => {
          if (!connected) {
            reject(error);
            return;
          }
          logger.error('[PtpIpClient] Command socket failed after connecting.', error);
        });
        this.commandSocket?.on('close', () => {
          logger.info('[PtpIpClient] Command socket closed');
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  disconnect(): void {
    this.commandSocket?.destroy();
    this.eventSocket?.destroy();
    this.commandSocket = null;
    this.eventSocket = null;
  }

  private sendInitCommand(): void {
    logger.info('[PtpIpClient] Sending Init Command...');
  }

  private handleCommandData(data: Uint8Array): void {
    logger.info(`[PtpIpClient] Received command data: ${data.byteLength} bytes`);
    this.connectEventSocket();
  }

  private connectEventSocket(): void {
    if (!this.createSocket || this.eventSocket) return;

    this.eventSocket = this.createSocket(
      { port: this.port, host: this.host },
      () => logger.info('[PtpIpClient] Event socket connected')
    );
    this.eventSocket.on('data', (data) => this.handleEventData(data));
    this.eventSocket.on('error', (error) => {
      logger.error('[PtpIpClient] Event socket failed.', error);
    });
  }

  private handleEventData(data: Uint8Array): void {
    logger.info(`[PtpIpClient] Received event data: ${data.byteLength} bytes`);
  }
}
