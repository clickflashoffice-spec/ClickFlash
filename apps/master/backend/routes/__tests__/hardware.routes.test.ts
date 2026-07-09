import request from 'supertest';
import express from 'express';
import { createHardwareRouter } from '../hardware.routes';
import { hardwareTriggerService } from '../../../src/services/hardwareTriggerService';

jest.mock('../../../src/services/hardwareTriggerService', () => ({
    hardwareTriggerService: {
        handleTrigger: jest.fn()
    }
}));

describe('Hardware API Routes', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.clearAllMocks();
        
        app = express();
        app.use(express.json());
        // Mount the router
        app.use('/api/hardware', createHardwareRouter());
    });

    describe('POST /api/hardware/trigger', () => {
        it('should successfully trigger hardware and return 200', async () => {
            const mockResponse = {
                success: true,
                captureId: '1234-abcd',
                message: 'Shutter triggered successfully'
            };
            
            (hardwareTriggerService.handleTrigger as jest.Mock).mockResolvedValue(mockResponse);

            const payload = {
                sensorId: 'sensor-1',
                rideId: 'ride-1'
            };

            const response = await request(app)
                .post('/api/hardware/trigger')
                .send(payload);
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResponse);
            expect(hardwareTriggerService.handleTrigger).toHaveBeenCalledWith(payload);
        });

        it('should return 400 when payload is invalid', async () => {
            (hardwareTriggerService.handleTrigger as jest.Mock).mockRejectedValue(new Error('Invalid hardware trigger payload'));

            const invalidPayload = {
                sensorId: 'sensor-1'
                // missing rideId
            };

            const response = await request(app)
                .post('/api/hardware/trigger')
                .send(invalidPayload);
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid hardware trigger payload');
        });
    });
});
