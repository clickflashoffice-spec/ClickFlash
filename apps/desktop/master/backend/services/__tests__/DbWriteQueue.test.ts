import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DbWriteQueue } from '../DbWriteQueue';

const mockExecute = vi.fn().mockResolvedValue(undefined);
const mockShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock('../../workers/workerPool', () => {
  return {
    WorkerPool: class WorkerPool {
      execute = mockExecute;
      shutdown = mockShutdown;
    }
  };
});

describe('DbWriteQueue', () => {
    let queue: DbWriteQueue;

    beforeEach(() => {
        vi.clearAllMocks();
        queue = new DbWriteQueue({} as any, {});
    });

    afterEach(async () => {
        if (queue) await queue.shutdown();
    });

    it('should forward enqueue to worker pool', async () => {
        await queue.enqueue('test_table', '123', { field: 'value' });
        expect(mockExecute).toHaveBeenCalledWith({
            table: 'test_table',
            id: '123',
            data: { field: 'value' },
            priority: 'normal'
        });
    });
});
