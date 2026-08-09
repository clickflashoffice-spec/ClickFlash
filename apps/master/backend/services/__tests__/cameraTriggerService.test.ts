import { cameraTriggerService } from '../cameraTriggerService';
import { hardwareTriggerService } from '../hardwareTriggerService';
import dgram from 'dgram';

// Mock hardwareTriggerService
jest.mock('../hardwareTriggerService', () => ({
    hardwareTriggerService: {
        handleTrigger: jest.fn().mockResolvedValue(undefined)
    }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

describe('CameraTriggerService', () => {
    let client: dgram.Socket;

    beforeAll((done) => {
        // Start the service on a random port for testing
        cameraTriggerService.start(5556, done);
        client = dgram.createSocket('udp4');
    });

    afterAll((done) => {
        cameraTriggerService.stop(() => {
            client.close(done);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should process JSON payloads correctly', (done) => {
        const payload = { sensorId: 'TEST_S1', rideId: 'TEST_R1' };
        const message = Buffer.from(JSON.stringify(payload));

        client.send(message, 5556, '127.0.0.1', (err) => {
            expect(err).toBeNull();
            
            // Wait for the async processing to occur
            setTimeout(() => {
                expect(hardwareTriggerService.handleTrigger).toHaveBeenCalledWith(payload);
                done();
            }, 100);
        });
    });

    it('should process raw byte trigger (0x01)', (done) => {
        const message = Buffer.from([0x01]);

        client.send(message, 5556, '127.0.0.1', (err) => {
            expect(err).toBeNull();
            
            setTimeout(() => {
                expect(hardwareTriggerService.handleTrigger).toHaveBeenCalledWith(
                    expect.objectContaining({
                        rideId: 'GENERIC_RIDE'
                    })
                );
                done();
            }, 100);
        });
    });

    it('should ignore invalid payloads', (done) => {
        const message = Buffer.from('invalid-payload');

        client.send(message, 5556, '127.0.0.1', (err) => {
            expect(err).toBeNull();
            
            setTimeout(() => {
                expect(hardwareTriggerService.handleTrigger).not.toHaveBeenCalled();
                done();
            }, 100);
        });
    });
});
