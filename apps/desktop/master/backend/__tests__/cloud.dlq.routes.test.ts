import { vi, describe, it, test, expect, beforeEach } from 'vitest';
if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

import request from 'supertest';
import express from 'express';
import cloudRoutes from '../routes/cloud';

// Mock strictRateLimiter
vi.mock('../middleware/rateLimiter', () => ({
    strictRateLimiter: (_req: any, _res: any, next: any) => next(),
    apiRateLimiter: (_req: any, _res: any, next: any) => next()
}));

describe('Cloud DLQ Routes', () => {
    let app: express.Application;
    let mockCloudSyncService: any;
    let mockLogger: any;
    let mockDbManager: any;

    beforeEach(() => {
        mockCloudSyncService = {
            getDeadLetterQueue: vi.fn().mockReturnValue({
                items: [{ id: 'dlq-1', operation: 'test', status: 'dead_letter' }],
                total: 1
            }),
            replayDeadLetterQueue: vi.fn().mockReturnValue({
                replayed: 1,
                errors: []
            }),
            deleteDeadLetterQueueItems: vi.fn().mockReturnValue({
                deleted: 1,
                errors: []
            })
        };

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn()
        };

        mockDbManager = {
            query: vi.fn().mockReturnValue([])
        };

        app = express();
        app.use(express.json());
        app.use('/api/cloud', cloudRoutes({
            logger: mockLogger,
            cloudSyncService: mockCloudSyncService,
            dbManager: mockDbManager
        }));
    });

    it('GET /api/cloud/dlq should return dlq items', async () => {
        const res = await request(app).get('/api/cloud/dlq?limit=50&offset=0');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.items).toHaveLength(1);
        expect(mockCloudSyncService.getDeadLetterQueue).toHaveBeenCalledWith(50, 0);
    });

    it('POST /api/cloud/dlq/replay should replay dead letter queue items', async () => {
        const res = await request(app)
            .post('/api/cloud/dlq/replay')
            .send({ ids: ['dlq-1'] });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.replayed).toBe(1);
        expect(mockCloudSyncService.replayDeadLetterQueue).toHaveBeenCalledWith(['dlq-1']);
    });

    it('DELETE /api/cloud/dlq/:id should delete dlq item by id', async () => {
        const res = await request(app).delete('/api/cloud/dlq/dlq-1');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.deleted).toBe(1);
        expect(mockCloudSyncService.deleteDeadLetterQueueItems).toHaveBeenCalledWith(['dlq-1']);
    });
});
