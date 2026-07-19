import TcpSocket from 'react-native-tcp-socket';
import { EventEmitter } from 'expo';

type Buffer = any;

export type PtpIpEvent = {
  type: string;
  data?: any;
};

export class PtpIpClient {
  private host: string;
  private port: number;
  private commandSocket: any;
  private eventSocket: any;
  public emitter: EventEmitter;

  constructor(host: string = '192.168.1.1', port: number = 15740) {
    this.host = host;
    this.port = port;
    // @ts-ignore - Mocking expo event emitter for this architecture demo
    this.emitter = new EventEmitter({} as any);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.commandSocket = TcpSocket.createConnection(
          { port: this.port, host: this.host },
          () => {
            console.log('Command socket connected');
            this.sendInitCommand();
          }
        );

        this.commandSocket.on('data', (data: Buffer) => {
          this.handleCommandData(data);
        });

        this.commandSocket.on('error', (error: any) => {
          reject(error);
        });

        this.commandSocket.on('close', () => {
          console.log('Command socket closed');
        });

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  private sendInitCommand() {
    // Basic PTP/IP Init Command (16 bytes)
    // Needs proper packet construction based on PTP/IP spec.
    console.log('Sending Init Command...');
  }

  private handleCommandData(data: Buffer) {
    // Parse PTP/IP Init Reply
    console.log('Received command data:', data.length, 'bytes');
    // If it's Init Reply, open Event Socket
    this.connectEventSocket();
  }

  private connectEventSocket() {
    this.eventSocket = TcpSocket.createConnection(
      { port: this.port, host: this.host },
      () => {
        console.log('Event socket connected');
      }
    );

    this.eventSocket.on('data', (data: Buffer) => {
      this.handleEventData(data);
    });
  }

  private handleEventData(data: Buffer) {
    // Parse Event Data (e.g. ObjectAdded)
    console.log('Received event data:', data.length, 'bytes');
    // For demo architecture, emit generic object added
    (this.emitter as any).emit('onPhotoReceived', { uri: 'tcp://photo-received' });
  }

  disconnect() {
    if (this.commandSocket) this.commandSocket.destroy();
    if (this.eventSocket) this.eventSocket.destroy();
  }
}
