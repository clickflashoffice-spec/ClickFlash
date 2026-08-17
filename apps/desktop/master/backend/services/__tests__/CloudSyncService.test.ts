import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;
vi.mock('node-fetch', () => ({ default: mockFetch }));
import { CloudSyncService } from '../cloudSyncService';

const mockDbManager = {
    query: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
    prepare: vi.fn(() => ({ run: vi.fn() })),
    transaction: vi.fn((fn: Function) => fn()),
};

const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

const mockEmailService = {
    setCloudConfig: vi.fn(),
};

vi.mock('../SystemHardwareService', () => ({
    HardwareService: {
        getMachineId: vi.fn().mockResolvedValue('test-machine-id')
    }
}));

describe('CloudSyncService', () => {
    let service: CloudSyncService;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CLOUD_API_URL = 'https://hub.example.com';
        process.env.CLOUD_EMAIL = 'test@example.com';
        process.env.CLOUD_PASSWORD = 'secret';
        process.env.DESK_ID = 'TEST_DESK_01';

        mockDbManager.get.mockImplementation((sql: string) => {
            if (sql.includes("cloud_url")) return { value: 'https://hub.example.com' };
            if (sql.includes("cloud_email")) return { value: 'test@example.com' };
            if (sql.includes("cloud_password")) return { value: 'secret' };
            if (sql.includes("desk_id")) return { value: 'TEST_DESK_01' };
            return undefined;
        });

        service = new CloudSyncService(
            mockDbManager as any,
            mockLogger as any,
            mockEmailService as any,
        );
    });

    afterEach(() => {
        service.stop();
    });

    it('should generate consistent idempotency keys', () => {
        const key1 = (service as any).generateIdempotencyKey('operation_logs', 42);
        const key2 = (service as any).generateIdempotencyKey('operation_logs', 42);

        expect(key1).toBe(key2);
        expect(key1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should track per-pipeline failures and open circuit', () => {
        (service as any).recordPipelineResult('expenses', false, 'Timeout');
        (service as any).recordPipelineResult('expenses', false, 'Timeout');
        (service as any).recordPipelineResult('expenses', false, 'Timeout');
        (service as any).recordPipelineResult('expenses', false, 'Timeout');
        (service as any).recordPipelineResult('expenses', false, 'Timeout');

        expect((service as any).isPipelineOpen('expenses')).toBe(true);
        expect((service as any).isPipelineOpen('ledger')).toBe(false);
    });

    it('should reset pipeline failure on success', () => {
        (service as any).recordPipelineResult('expenses', false, 'Timeout');
        expect((service as any).failuresByPipeline.get('expenses')).toBe(1);

        (service as any).recordPipelineResult('expenses', true);
        expect((service as any).failuresByPipeline.has('expenses')).toBe(false);
    });

    it('should not reset global consecutiveFailures if some pipelines fail', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'mock-jwt' }),
            headers: { get: () => new Date().toUTCString() },
        });

        // Mock the internal logic by directly forcing the circuit breaker loop via fetch mocks
        // Or simply force an error in one of the direct pipeline calls
        (service as any).syncYieldIntelligence = vi.fn(() => Promise.reject(new Error('fail')));
        (service as any).syncProspectingCRM = vi.fn(() => Promise.resolve());
        (service as any).sendFleetTriage = vi.fn(() => Promise.resolve());
        (service as any).pullRemoteOperations = vi.fn(() => Promise.resolve());
        (service as any).pullGlobalSettings = vi.fn(() => Promise.resolve());
        (service as any).pollPaidOrders = vi.fn(() => Promise.resolve());
        (service as any).processRetentionQueue = vi.fn(() => Promise.resolve());
        (service as any).syncRetentionStats = vi.fn(() => Promise.resolve());
        (service as any).syncResortBI = vi.fn(() => Promise.resolve());

        await service.sync();

        expect((service as any).consecutiveFailures).toBeGreaterThanOrEqual(1);
    });
});

import { OperationLogsPipeline } from '../sync/pipelines/OperationLogsPipeline';

describe('OperationLogsPipeline', () => {
    let pipeline: OperationLogsPipeline;
    let mockCtx: any;

    beforeEach(() => {
        pipeline = new OperationLogsPipeline();
        mockCtx = {
            dbManager: mockDbManager,
            logger: mockLogger,
            cloudApiUrl: 'https://hub.example.com',
            deskId: 'TEST_DESK_01',
            getHeaders: async () => ({ Authorization: 'Bearer token' })
        };
    });

    it('should store idempotency key before sending operations', async () => {
        mockDbManager.query.mockReturnValue([
            { id: 'op-1', type: 'INSERT', table_name: 'orders', record_id: 'r1', payload: '{}', timestamp: 1, sequence_number: 1 },
        ]);

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, processed: ['op-1'] }),
            headers: { get: () => new Date().toUTCString() },
        });

        await pipeline.execute(mockCtx);

        expect(mockDbManager.run).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO sync_idempotency_keys'),
            expect.arrayContaining([
                expect.stringMatching(/^[a-f0-9]{64}$/),
                'TEST_DESK_01',
                'operation_logs',
            ])
        );
    });

    it('should handle 208 Already Reported as success', async () => {
        mockDbManager.query.mockReturnValue([
            { id: 'op-1', type: 'INSERT', table_name: 'orders', record_id: 'r1', payload: '{}', timestamp: 1, sequence_number: 1 },
        ]);

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 208,
            text: async () => 'Already Reported',
            headers: { get: () => new Date().toUTCString() },
        });

        await pipeline.execute(mockCtx);

        // Transaction should have been called to mark all ops as synced
        expect(mockDbManager.transaction).toHaveBeenCalled();
        // Verify that the info log was emitted for 208 handling
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('already processed (208)')
        );
    });
});
