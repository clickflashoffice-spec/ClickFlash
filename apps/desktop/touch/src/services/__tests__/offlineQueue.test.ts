/**
 * @jest-environment jsdom
 */

import { offlineQueue, QueueItem } from '../OfflineQueue';
import { logger } from '../../utils/logger';
import util from 'util';

const TextEncoderClass = util.TextEncoder || (globalThis as any).TextEncoder;
(globalThis as any).TextEncoder = TextEncoderClass;
if (typeof window !== 'undefined') {
    (window as any).TextEncoder = TextEncoderClass;
}

const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

// Polyfill AbortSignal.timeout for jsdom
if (!(global as any).AbortSignal?.timeout) {
    (global as any).AbortSignal = (global as any).AbortSignal || class AbortSignal {};
    (global as any).AbortSignal.timeout = (ms: number) => {
        const controller = new (global as any).AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
    };
}

// Mock import.meta.env for Vite compatibility in Jest
Object.defineProperty(global, 'import', {
    value: { meta: { env: { VITE_LOG_LEVEL: 'INFO' } } },
    writable: true,
});

vi.mock('../../utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }
}));

let queueStore: QueueItem[] = [];

const createWhere = () => ({
    equals: (value: QueueItem['status']) => ({
        sortBy: async (field: keyof QueueItem) => {
            const filtered = queueStore.filter(i => i.status === value);
            return filtered.sort((a, b) => (a[field] as number) - (b[field] as number));
        },
        toArray: async () => queueStore.filter(i => i.status === value)
    }),
    notEqual: (value: QueueItem['status']) => ({
        sortBy: async (field: keyof QueueItem) => {
            const filtered = queueStore.filter(i => i.status !== value);
            return filtered.sort((a, b) => (a[field] as number) - (b[field] as number));
        }
    })
});

const mockTable = {
    add: vi.fn(async (item: QueueItem) => { queueStore.push(item); }),
    delete: vi.fn(async (id: string) => { queueStore = queueStore.filter(i => i.id !== id); }),
    clear: vi.fn(async () => { queueStore = []; }),
    update: vi.fn(async (id: string, changes: Partial<QueueItem>) => {
        const idx = queueStore.findIndex(i => i.id === id);
        if (idx !== -1) queueStore[idx] = { ...queueStore[idx], ...changes };
    }),
    toArray: vi.fn(async () => [...queueStore]),
    where: vi.fn(createWhere),
};

vi.mock('../db', () => ({
    db: { table: vi.fn(() => mockTable) }
}));

function resetQueueState() {
    queueStore = [];
    (offlineQueue as any).isProcessing = false;
    const timers: Map<string, ReturnType<typeof setTimeout>> = (offlineQueue as any).retryTimers;
    for (const timer of timers.values()) {
        clearTimeout(timer);
    }
    timers.clear();
}

function setOnline(online: boolean) {
    Object.defineProperty(navigator, 'onLine', {
        value: online,
        writable: true,
        configurable: true
    });
}

function setupCrypto() {
    const mockCrypto = {
        randomUUID: vi.fn(() => 'test-id-123'),
        getRandomValues: vi.fn((arr: Uint8Array) => {
            arr.fill(1);
            return arr;
        }),
        subtle: {
            importKey: vi.fn(async () => ({ type: 'secret' } as CryptoKey)),
            digest: vi.fn(async () => new Uint8Array(32).buffer),
            encrypt: vi.fn(async () => new Uint8Array(32).buffer)
        }
    };
    Object.defineProperty(global, 'crypto', { value: mockCrypto, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'crypto', { value: mockCrypto, writable: true, configurable: true });
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'crypto', { value: mockCrypto, writable: true, configurable: true });
    }
}

describe('Unified OfflineQueue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        resetQueueState();
        setOnline(true);
        localStorage.clear();
        setupCrypto();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('enqueues a mutation and stores it as pending', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true });

        const item = await offlineQueue.enqueue('orders', 'update', { id: 'ord-1' });

        expect(item).not.toBeNull();
        expect(item?.entity).toBe('orders');
        expect(item?.action).toBe('update');
        expect(item?.status).toBe('pending');
        expect(mockTable.add).toHaveBeenCalledWith(expect.objectContaining({
            entity: 'orders',
            action: 'update',
            status: 'pending'
        }));
    });

    it('processes pending items and removes them on success', async () => {
        queueStore = [
            {
                id: 'item-1',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-1' },
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending'
            }
        ];
        mockFetch.mockResolvedValueOnce({ ok: true });

        await offlineQueue.processQueue();

        expect(mockFetch).toHaveBeenCalledWith(
            '/api/sync/mutation',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('item-1')
            })
        );
        expect(queueStore).toHaveLength(0);
    });

    it('halts processing and marks item failed when the server rejects', async () => {
        queueStore = [
            {
                id: 'item-2',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-2' },
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending'
            }
        ];
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

        await offlineQueue.processQueue();

        expect(queueStore).toHaveLength(1);
        expect(queueStore[0].status).toBe('failed');
        expect(queueStore[0].retryCount).toBe(1);
    });

    it('does not process when offline and resumes on online event', async () => {
        vi.useRealTimers();
        queueStore = [
            {
                id: 'item-3',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-3' },
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending'
            }
        ];
        mockFetch.mockResolvedValueOnce({ ok: true });
        setOnline(false);

        await offlineQueue.processQueue();
        expect(mockFetch).not.toHaveBeenCalled();

        setOnline(true);
        window.dispatchEvent(new Event('online'));
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockFetch).toHaveBeenCalledTimes(1);
        vi.useFakeTimers();
    });

    it('schedules an exponential backoff retry for failed items', async () => {
        queueStore = [
            {
                id: 'item-4',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-4' },
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending'
            }
        ];
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

        await offlineQueue.processQueue();

        expect(queueStore).toHaveLength(1);
        expect(queueStore[0].status).toBe('failed');
        expect(queueStore[0].retryCount).toBe(1);

        // Backoff for retry 1 is 1000ms
        vi.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(queueStore[0].status).toBe('pending');
    });

    it('moves an item to the dead-letter queue after max retries', async () => {
        queueStore = [
            {
                id: 'item-5',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-5' },
                timestamp: Date.now(),
                retryCount: 4,
                status: 'pending'
            }
        ];
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

        await offlineQueue.processQueue();

        expect(queueStore).toHaveLength(1);
        expect(queueStore[0].status).toBe('dead');
        expect(queueStore[0].retryCount).toBe(5);
    });

    it('retries failed items when retryFailed is called', async () => {
        queueStore = [
            {
                id: 'item-6',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-6' },
                timestamp: Date.now(),
                retryCount: 2,
                status: 'failed',
                error: 'Previous failure'
            }
        ];
        mockFetch.mockResolvedValueOnce({ ok: true });

        const complete = new Promise<void>(resolve => {
            offlineQueue.on('queue:processing:complete', () => resolve());
        });
        await offlineQueue.retryFailed();
        await complete;

        expect(queueStore).toHaveLength(0);
    });

    it('encrypts outgoing requests with AEAD when a signing secret is configured', async () => {
        localStorage.setItem('kioskId', 'kiosk-test');
        localStorage.setItem('signingSecret', 'super-secret');

        queueStore = [
            {
                id: 'item-7',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-7' },
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending'
            }
        ];
        mockFetch.mockResolvedValueOnce({ ok: true });

        expect(localStorage.getItem('signingSecret')).toBe('super-secret');

        await offlineQueue.processQueue();

        expect(mockFetch).toHaveBeenCalledWith(
            '/api/sync/mutation',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'x-kiosk-id': 'kiosk-test'
                })
            })
        );
        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.kioskId).toBe('kiosk-test');
        expect(requestBody.iv).toBeDefined();
        expect(requestBody.ciphertext).toBeDefined();
        expect(requestBody.tag).toBeDefined();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('uses the Electron IPC bridge when available', async () => {
        const sendSyncMessage = vi.fn().mockResolvedValue(true);
        Object.defineProperty(window, 'sendSyncMessage', {
            value: sendSyncMessage,
            writable: true,
            configurable: true
        });

        queueStore = [
            {
                id: 'item-8',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-8' },
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending'
            }
        ];

        await offlineQueue.processQueue();

        expect(sendSyncMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-8' }));
        expect(mockFetch).not.toHaveBeenCalled();

        delete (window as any).sendSyncMessage;
    });

    it('clears the queue and cancels pending retry timers', async () => {
        queueStore = [
            {
                id: 'item-9',
                type: 'MUTATION',
                entity: 'orders',
                action: 'update',
                payload: { id: 'ord-9' },
                timestamp: Date.now(),
                retryCount: 1,
                status: 'failed'
            }
        ];

        await offlineQueue.clear();

        expect(mockTable.clear).toHaveBeenCalled();
        expect(queueStore).toHaveLength(0);
        expect((offlineQueue as any).retryTimers.size).toBe(0);
    });

    it('reports queue stats', async () => {
        queueStore = [
            { id: 'a', type: 'MUTATION', entity: 'orders', action: 'create', payload: {}, timestamp: 1, retryCount: 0, status: 'pending' },
            { id: 'b', type: 'MUTATION', entity: 'orders', action: 'create', payload: {}, timestamp: 2, retryCount: 1, status: 'failed' },
            { id: 'c', type: 'MUTATION', entity: 'orders', action: 'create', payload: {}, timestamp: 3, retryCount: 5, status: 'dead' }
        ];

        const stats = await offlineQueue.getStats();

        expect(stats).toEqual({
            total: 3,
            pending: 1,
            processing: 0,
            failed: 1,
            dead: 1
        });
    });
});
