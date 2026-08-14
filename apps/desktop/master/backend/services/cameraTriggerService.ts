import dgram from 'dgram';
import { logger } from '../utils/logger';
import { hardwareTriggerService } from './hardwareTriggerService';

class CameraTriggerService {
    private server?: dgram.Socket;
    private readonly PORT = 5555; // Default UDP port for hardware triggers

    constructor() {}

    private setupListeners(socket: dgram.Socket) {
        socket.on('error', (err) => {
            logger.error(`[CameraTriggerService] UDP server error:\n${err.stack}`);
            try {
                socket.close();
            } catch {
                // Ignore if already closed
            }
        });

        socket.on('message', (msg, rinfo) => {
            logger.debug(`[CameraTriggerService] Received UDP packet from ${rinfo.address}:${rinfo.port}`);
            
            try {
                // Assuming hardware sends a simple JSON string or specific byte sequence
                // For this implementation, we assume JSON: {"sensorId": "S1", "rideId": "RIDE_01"}
                const payloadStr = msg.toString('utf8');
                const payload = JSON.parse(payloadStr);

                // Pass to the business logic handler
                hardwareTriggerService.handleTrigger(payload).catch((err) => {
                     logger.error('[CameraTriggerService] Failed to process hardware trigger', err);
                });
                
            } catch {
                // If it's a raw byte trigger (e.g., just 0x01), we can handle it here too.
                // Fallback for simple byte trigger:
                if (msg.length === 1 && msg[0] === 0x01) {
                     logger.info('[CameraTriggerService] Received raw byte trigger (0x01). Firing generic shutter.');
                     hardwareTriggerService.handleTrigger({
                         sensorId: `RAW_UDP_${rinfo.address}`,
                         rideId: 'GENERIC_RIDE'
                     }).catch(logger.error);
                } else {
                     logger.warn(`[CameraTriggerService] Invalid UDP payload from ${rinfo.address}`, { payload: msg.toString() });
                }
            }
        });

        socket.on('listening', () => {
            const address = socket.address();
            logger.info(`[CameraTriggerService] UDP hardware trigger listener bound to ${address.address}:${address.port}`);
        });
    }

    public getPort(): number | undefined {
        if (!this.server) return undefined;
        try {
            const addr = this.server.address();
            return typeof addr === 'object' && addr !== null ? addr.port : undefined;
        } catch {
            return undefined;
        }
    }

    public start(port: number = this.PORT, cb?: () => void) {
        let callbackCalled = false;
        const safeCb = () => {
            if (!callbackCalled && cb) {
                callbackCalled = true;
                cb();
            }
        };

        try {
            if (this.server) {
                try {
                    this.server.close();
                } catch {
                    // Ignore
                }
            }
            this.server = dgram.createSocket('udp4');
            this.setupListeners(this.server);
            this.server.once('listening', safeCb);
            this.server.once('error', safeCb);
            this.server.bind(port);
        } catch (error) {
            logger.error(`[CameraTriggerService] Failed to bind UDP server on port ${port}`, error);
            safeCb();
        }
    }

    public stop(cb?: () => void) {
        if (!this.server) {
            if (cb) cb();
            return;
        }
        try {
            const s = this.server;
            this.server = undefined;
            s.close(() => {
                logger.info('[CameraTriggerService] UDP server stopped');
                if (cb) cb();
            });
        } catch {
            logger.debug('[CameraTriggerService] Stop called but server was not running');
            if (cb) cb();
        }
    }
}

export const cameraTriggerService = new CameraTriggerService();
