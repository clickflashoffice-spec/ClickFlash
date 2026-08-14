/**
 * @jest-environment jsdom
 */

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

vi.mock('../pb', () => {
    const mockPbCollection = {
        getFullList: vi.fn(),
        getOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };
    return {
        pb: {
            baseUrlValue: 'http://localhost:8091',
            collection: vi.fn(() => mockPbCollection),
        }
    };
});

vi.mock('../db', () => ({
    db: {
        albums: { bulkPut: vi.fn(), orderBy: vi.fn(() => ({ reverse: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })) },
        orders: { put: vi.fn(), toArray: vi.fn(() => Promise.resolve([])), where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn(() => Promise.resolve([])) })) })), bulkDelete: vi.fn() },
    }
}));

vi.mock('../syncCheckpointService', () => ({
    syncCheckpointService: {
        loadCheckpoint: vi.fn(() => Promise.resolve(null)),
        saveCheckpoint: vi.fn(() => Promise.resolve()),
        updateCheckpoint: vi.fn(() => Promise.resolve()),
        clearCheckpoint: vi.fn(() => Promise.resolve()),
        isAlbumProcessed: vi.fn(() => Promise.resolve(false)),
        isPhotoProcessed: vi.fn(() => Promise.resolve(false)),
        markAlbumProcessed: vi.fn(() => Promise.resolve()),
        markPhotoProcessed: vi.fn(() => Promise.resolve()),
    }
}));

import { syncService } from '../syncService';
import { pb } from '../pb';
import { type Mock } from 'vitest';

const mockPbCollection = pb.collection('orders');

describe('Touch SyncService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('masterLocalIPAddress', '192.168.1.100');
        localStorage.setItem('kioskId', 'kiosk-test-01');
        (syncService as any).masterUrl = 'http://192.168.1.100:8090';
        (syncService as any).isSyncing = false;
    });

    it('should update master IP and store in localStorage', () => {
        syncService.updateMasterIp('192.168.1.200');
        expect(localStorage.getItem('masterLocalIPAddress')).toBe('192.168.1.200');
    });

    it('should subscribe and receive sync state updates', () => {
        const listener = vi.fn();
        const unsubscribe = syncService.subscribe(listener);

        expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
                isSyncing: false,
                lastSyncAt: null,
                lastSyncError: null,
                pendingOrdersCount: 0,
            })
        );

        unsubscribe();
    });

    it('should push orders with clientMutationId to Master', async () => {
        (mockPbCollection.getFullList as Mock).mockResolvedValue([
            {
                id: 'ord-1',
                clientName: 'Alice',
                email: 'alice@example.com',
                total: 50,
                status: 'Pending',
                items: [],
                date: '2026-06-05',
                destinationId: 'dest1',
                photographerId: 1,
                roomNumber: '101',
                appliedDiscount: 0,
                clientMutationId: 'kiosk-test-01:abc123:def456',
            }
        ]);

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, id: 'MASTER-ORD-1' }),
        });

        await (syncService as any).pushOrdersToMaster();

        expect(mockFetch).toHaveBeenCalledWith(
            'http://192.168.1.100:8090/api/orders/kiosk/orders',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('clientMutationId'),
            })
        );

        const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(requestBody.clientMutationId).toBe('kiosk-test-01:abc123:def456');
    });

    it('should handle 208 deduplication from Master', async () => {
        (mockPbCollection.getFullList as Mock).mockResolvedValue([
            {
                id: 'ord-2',
                clientName: 'Bob',
                email: 'bob@example.com',
                total: 75,
                status: 'Pending',
                items: [],
                date: '2026-06-05',
                destinationId: 'dest1',
                photographerId: 2,
                roomNumber: '',
                appliedDiscount: 0,
                clientMutationId: 'kiosk-test-01:dup:123',
            }
        ]);

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 208,
            json: async () => ({ success: true, id: 'MASTER-ORD-2', deduplicated: true }),
        });

        await (syncService as any).pushOrdersToMaster();

        expect(mockPbCollection.update).toHaveBeenCalledWith('ord-2', { status: 'Synced' });
    });

    it('should skip sync when master is unreachable', async () => {
        mockFetch.mockResolvedValueOnce(null);

        await syncService.sync();

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/kiosk/heartbeat'),
            expect.any(Object)
        );
    });
});
