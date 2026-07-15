import request from 'supertest';
import express from 'express';
import { orderRoutes } from '../orders';
import { db } from '../../database';
import { CloudSyncService } from '../../services/cloudSyncService';
import { emitToApp } from '../../websocket';

// Mock dependencies
jest.mock('../../database', () => ({
    db: {
        prepare: jest.fn().mockReturnValue({
            run: jest.fn().mockReturnValue({ lastInsertRowid: 1 })
        })
    }
}));

jest.mock('../../services/cloudSyncService', () => ({
    CloudSyncService: {
        getInstance: jest.fn().mockReturnValue({
            queueRecord: jest.fn().mockResolvedValue(undefined)
        })
    }
}));

jest.mock('../../websocket', () => ({
    emitToApp: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

describe('Order Routes', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create an order successfully with valid payload', async () => {
        const validPayload = {
            clientMutationId: 'mut-123',
            clientDeviceId: 'TOUCH_KIOSK',
            items: [
                {
                    id: 'item-1',
                    type: 'photo',
                    quantity: 1,
                    price: 10,
                    photo: { id: 'p1', url: 'img.jpg', photographerId: 1 }
                }
            ],
            clientName: 'Test User',
            email: 'test@example.com',
            total: 10,
            status: 'Pending',
            date: '2026-07-15'
        };

        const res = await request(app)
            .post('/api/orders')
            .send(validPayload);

        expect(res.status).toBe(201);
        expect(res.body).toEqual(expect.objectContaining({
            success: true,
            orderId: expect.any(String)
        }));
        expect(db.prepare).toHaveBeenCalled();
        expect(emitToApp).toHaveBeenCalledWith('orders:new', expect.any(Object));
    });

    it('should fail with invalid payload', async () => {
        const invalidPayload = {
            // Missing clientMutationId and items
            clientName: 'Test User'
        };

        const res = await request(app)
            .post('/api/orders')
            .send(invalidPayload);

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });
});
