if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

import request from 'supertest';
import express from 'express';
import telemetryRoutes from '../routes/system/telemetry';

describe('Telemetry Routes', () => {
    let app: express.Application;
    let mockTelemetryService: any;

    beforeEach(() => {
        mockTelemetryService = {
            getTelemetry: jest.fn().mockReturnValue({
                "sync.queue_depth": 5,
                "sync.dlq_count": 0,
                "db.write_latency_ms": 12.5,
                "backup.last_success_timestamp": "2026-07-02T12:00:00.000Z",
                sync: { queue_depth: 5, dlq_count: 0 },
                db: { write_latency_ms: 12.5 },
                backup: { last_success_timestamp: "2026-07-02T12:00:00.000Z" },
                timestamp: "2026-07-02T12:00:00.000Z"
            })
        };

        app = express();
        app.use(express.json());
        app.use('/api/telemetry', telemetryRoutes({
            telemetryService: mockTelemetryService,
            logger: { error: jest.fn(), info: jest.fn() }
        }));
    });

    it('should return aggregated telemetry when telemetryService is available', async () => {
        const response = await request(app).get('/api/telemetry');
        expect(response.status).toBe(200);
        expect(response.body['sync.queue_depth']).toBe(5);
        expect(response.body['db.write_latency_ms']).toBe(12.5);
        expect(mockTelemetryService.getTelemetry).toHaveBeenCalled();
    });

    it('should fallback gracefully when telemetryService is missing', async () => {
        const fallbackApp = express();
        fallbackApp.use(express.json());
        fallbackApp.use('/api/telemetry', telemetryRoutes({
            cloudSyncService: { getStats: () => ({ queues: { operations: 3, dlq: 1 } }) },
            dbWriteQueue: { getStats: () => ({ writeLatencyMs: 8.0 }) },
            backupService: { getStats: () => ({ lastSuccessTimestamp: "2026-07-01T00:00:00.000Z" }) }
        }));

        const response = await request(fallbackApp).get('/api/telemetry');
        expect(response.status).toBe(200);
        expect(response.body['sync.queue_depth']).toBe(3);
        expect(response.body['sync.dlq_count']).toBe(1);
        expect(response.body['db.write_latency_ms']).toBe(8.0);
        expect(response.body['backup.last_success_timestamp']).toBe("2026-07-01T00:00:00.000Z");
    });
});
