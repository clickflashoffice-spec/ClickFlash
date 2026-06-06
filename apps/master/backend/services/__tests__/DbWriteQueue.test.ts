import { DbWriteQueue } from '../DbWriteQueue';

const mockDb = {
    run: jest.fn(),
    query: jest.fn(),
    get: jest.fn(),
    prepare: jest.fn(),
    transaction: jest.fn((fn: Function) => fn()),
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

describe('DbWriteQueue', () => {
    let queue: DbWriteQueue;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDb.query.mockReturnValue([]);
        queue = new DbWriteQueue(mockDb as any, { logger: mockLogger as any, flushInterval: 50, maxQueueSize: 5 });
    });

    afterEach(async () => {
        await queue.shutdown();
    });

    it('should enqueue a write and persist to pending_writes', async () => {
        await queue.enqueue('photos', 'p1', { title: 'Test' });

        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO pending_writes'),
            expect.arrayContaining([
                'photos:p1',
                'photos',
                'p1',
                JSON.stringify({ title: 'Test' }),
                'normal',
            ])
        );
    });

    it('should merge data for the same record', async () => {
        await queue.enqueue('photos', 'p1', { title: 'A' });
        await queue.enqueue('photos', 'p1', { caption: 'B' });

        // Should have called INSERT / UPDATE twice
        expect(mockDb.run).toHaveBeenCalledTimes(2);
    });

    it('should flush immediately for high priority writes', async () => {
        await queue.enqueue('photos', 'p1', { title: 'Urgent' }, 'high');

        expect(mockDb.transaction).toHaveBeenCalled();
        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM pending_writes'),
            expect.any(Array)
        );
    });

    it('should recover pending writes on construction and flush them', () => {
        mockDb.query.mockReturnValue([
            {
                id: 'photos:p2',
                table_name: 'photos',
                record_id: 'p2',
                payload_json: JSON.stringify({ title: 'Recovered' }),
                priority: 'normal',
            }
        ]);

        const recoveredQueue = new DbWriteQueue(mockDb as any, { logger: mockLogger as any });

        // Recovery should query pending_writes
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT id, table_name, record_id, payload_json, priority')
        );

        // Recovery triggers flush, so queue should be empty after async flush settles
        // We verify by checking that transaction was attempted
        expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should re-enqueue failed writes on transaction failure', async () => {
        mockDb.transaction.mockImplementation(() => {
            throw new Error('DB locked');
        });

        await queue.enqueue('photos', 'p1', { title: 'Fail' }, 'high');

        // Should try to re-enqueue as high priority
        expect(mockLogger.error).toHaveBeenCalledWith(
            'DbWriteQueue flush failed',
            expect.any(Object)
        );
    });

    it('should force flush when queue size exceeds max', async () => {
        mockDb.transaction.mockClear();
        for (let i = 0; i < 5; i++) {
            await queue.enqueue('photos', `p${i}`, { title: `Photo ${i}` });
        }
        // The 5th enqueue should trigger a flush
        expect(mockDb.transaction).toHaveBeenCalled();
    });
});
