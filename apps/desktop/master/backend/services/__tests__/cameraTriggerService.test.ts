import { vi, describe, it, test, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cameraTriggerService } from '../cameraTriggerService';
import { hardwareTriggerService } from '../hardwareTriggerService';
import dgram from 'dgram';

// Mock hardwareTriggerService
vi.mock('../hardwareTriggerService', () => ({
    hardwareTriggerService: {
        handleTrigger: vi.fn().mockResolvedValue(undefined)
    }
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

describe('CameraTriggerService', () => {
    let client: dgram.Socket;
    let testPort: number = 0;

    beforeAll(() => new Promise<void>((resolve) => {
        cameraTriggerService.start(0, () => {
            testPort = cameraTriggerService.getPort() || 5556;
            client = dgram.createSocket('udp4');
            resolve();
        });
    }));

    afterAll(() => new Promise<void>((resolve) => {
        cameraTriggerService.stop(() => {
            if (client) {
                client.close(() => resolve());
            } else {
                resolve();
            }
        });
    }));

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should process JSON payloads correctly', () => new Promise<void>((resolve, reject) => {
        const payload = { sensorId: 'TEST_S1', rideId: 'TEST_R1' };
        const message = Buffer.from(JSON.stringify(payload));

        client.send(message, testPort, '127.0.0.1', (err) => {
            if (err) return reject(err);
            
            // Wait for the async processing to occur
            setTimeout(() => {
                expect(hardwareTriggerService.handleTrigger).toHaveBeenCalledWith(payload);
                resolve();
            }, 100);
        });
    }));

    it('should process raw byte trigger (0x01)', () => new Promise<void>((resolve, reject) => {
        const message = Buffer.from([0x01]);

        client.send(message, testPort, '127.0.0.1', (err) => {
            if (err) return reject(err);
            
            setTimeout(() => {
                expect(hardwareTriggerService.handleTrigger).toHaveBeenCalledWith(
                    expect.objectContaining({
                        rideId: 'GENERIC_RIDE'
                    })
                );
                resolve();
            }, 100);
        });
    }));

    it('should ignore invalid payloads', () => new Promise<void>((resolve, reject) => {
        const message = Buffer.from('invalid-payload');

        client.send(message, testPort, '127.0.0.1', (err) => {
            if (err) return reject(err);
            
            setTimeout(() => {
                expect(hardwareTriggerService.handleTrigger).not.toHaveBeenCalled();
                resolve();
            }, 100);
        });
    }));
});

