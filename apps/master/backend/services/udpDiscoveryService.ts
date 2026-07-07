import dgram from 'dgram';
import { Logger } from '../utils/logger';
import { getLocalNetworkIPs } from './networkDetection';

const logger = new Logger('UDPDiscovery');
const UDP_PORT = 41234;

export class UDPDiscoveryService {
    private socket: dgram.Socket | null = null;
    private broadcastInterval: NodeJS.Timeout | null = null;
    private readonly BROADCAST_INTERVAL_MS = 3000;
    private isRunning = false;

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            this.socket = dgram.createSocket('udp4');
            
            this.socket.on('error', (err) => {
                logger.error(`UDP socket error: ${err.message}`, { error: err.stack });
                this.socket?.close();
                this.socket = null;
            });

            this.socket.on('message', (msg, rinfo) => {
                try {
                    const data = JSON.parse(msg.toString());
                    if (data.service === 'clickflash-touch-discovery') {
                        logger.info(`Received ping from Touch Kiosk at ${rinfo.address}:${rinfo.port}`);
                        this.sendBeacon(rinfo.address, rinfo.port);
                    }
                } catch (e) {
                    // Ignore non-JSON or invalid UDP traffic
                }
            });

            this.socket.on('listening', () => {
                const address = this.socket?.address();
                logger.info(`UDP Discovery listening on port ${address?.port}`);
                
                if (this.socket) {
                    try {
                        this.socket.setBroadcast(true);
                    } catch (e) {
                        logger.warn(`Failed to set broadcast flag, discovery may be limited`, { error: (e as Error).message });
                    }
                }

                // Start periodic beacon
                this.broadcastInterval = setInterval(() => {
                    this.broadcastBeacon();
                }, this.BROADCAST_INTERVAL_MS);
            });

            this.socket.bind(UDP_PORT);
        } catch (e) {
            logger.error(`Failed to start UDP discovery: ${(e as Error).message}`, { error: (e as Error).stack });
            this.isRunning = false;
        }
    }

    public stop() {
        if (!this.isRunning) return;
        this.isRunning = false;

        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        logger.info('UDP Discovery stopped');
    }

    private getBeaconPayload() {
        const ips = getLocalNetworkIPs();
        const primaryIp = ips.length > 0 ? ips[0] : '127.0.0.1';
        
        return JSON.stringify({
            service: 'clickflash-master',
            host: primaryIp,
            port: parseInt(process.env.PORT || '8090', 10),
            wsPort: parseInt(process.env.PORT || '8090', 10),
            version: '4.3.0',
            timestamp: Date.now()
        });
    }

    private broadcastBeacon() {
        if (!this.socket || !this.isRunning) return;
        const payload = this.getBeaconPayload();
        const message = Buffer.from(payload);
        
        // Broadcast to 255.255.255.255 (local subnet broadcast)
        this.socket.send(message, 0, message.length, UDP_PORT, '255.255.255.255', (err) => {
            if (err) {
                // Ignore EACCES or ENETUNREACH which are common when network interfaces change
                if (err.message.includes('EACCES') || err.message.includes('ENETUNREACH')) return;
                logger.warn(`Failed to broadcast beacon`, { error: err.message });
            }
        });
    }

    private sendBeacon(targetIp: string, targetPort: number) {
        if (!this.socket || !this.isRunning) return;
        const payload = this.getBeaconPayload();
        const message = Buffer.from(payload);
        
        this.socket.send(message, 0, message.length, targetPort, targetIp, (err) => {
            if (err) {
                logger.warn(`Failed to send direct beacon to ${targetIp}:${targetPort}`, { error: err.message });
            }
        });
    }
}

export const udpDiscoveryService = new UDPDiscoveryService();
