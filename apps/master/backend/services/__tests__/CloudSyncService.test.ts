const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

import { CloudSyncService } from '../cloudSyncService';

const mockDbManager = {
    query: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
    prepare: jest.fn(() => ({ run: jest.fn() })),
    transaction: jest.fn((fn: Function) => fn()),
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

const mockEmailService = {
    setCloudConfig: jest.fn(),
};

describe('CloudSyncService', () => {
    let service: CloudSyncService;

    beforeEach(() => {
        jest.clearAllMocks();
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

        (service as any).syncOperationLogs = jest.fn(() => Promise.resolve());
        (service as any).syncLedgerEntries = jest.fn(() => Promise.resolve());
        (service as any).syncExpenses = jest.fn(() => Promise.reject(new Error('fail')));
        (service as any).syncInventory = jest.fn(() => Promise.resolve());
        (service as any).syncOrdersToGallery = jest.fn(() => Promise.resolve());
        (service as any).sendHeartbeat = jest.fn(() => Promise.resolve());
        (service as any).syncYieldIntelligence = jest.fn(() => Promise.resolve());
        (service as any).syncProspectingCRM = jest.fn(() => Promise.resolve());
        (service as any).sendFleetTriage = jest.fn(() => Promise.resolve());
        (service as any).pullRemoteOperations = jest.fn(() => Promise.resolve());
        (service as any).pullGlobalSettings = jest.fn(() => Promise.resolve());
        (service as any).pollPaidOrders = jest.fn(() => Promise.resolve());
        (service as any).processRetentionQueue = jest.fn(() => Promise.resolve());
        (service as any).syncRetentionStats = jest.fn(() => Promise.resolve());
        (service as any).syncDailyAnalytics = jest.fn(() => Promise.resolve());
        (service as any).syncResortBI = jest.fn(() => Promise.resolve());

        await service.sync();

        expect((service as any).consecutiveFailures).toBeGreaterThanOrEqual(1);
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

        await (service as any).syncOperationLogs();

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

        await (service as any).syncOperationLogs();

        // Transaction should have been called to mark all ops as synced
        expect(mockDbManager.transaction).toHaveBeenCalled();
        // Verify that the info log was emitted for 208 handling
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('already processed (208)')
        );
    });
});
