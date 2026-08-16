import { SyncManager } from '../SyncManager';

const mockDb = {
    run: jest.fn(),
    get: jest.fn(),
    query: jest.fn(),
    prepare: jest.fn(() => ({ run: jest.fn() })),
    transaction: jest.fn((fn: Function) => fn()),
};

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

jest.mock('ws', () => {
    return {
        __esModule: true,
        default: {
            OPEN: 1,
        },
        WebSocket: {
            OPEN: 1,
        }
    };
});

const mockWs = {
    readyState: 1, // OPEN
    bufferedAmount: 0,
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    terminate: jest.fn(),
};

const mockReq = {
    url: '/ws?clientId=kiosk-123',
    socket: { remoteAddress: '192.168.1.50' },
};

describe('SyncManager', () => {
    let manager: SyncManager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new SyncManager(mockLogger as any, mockDb as any);
    });

    afterEach(() => {
        manager.stop();
    });

    it('should acknowledge heartbeat', async () => {
        manager.handleConnection(mockWs as any, mockReq as any);
        // Simulate heartbeat message from client
        const messageHandler = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];
        expect(messageHandler).toBeDefined();
        await messageHandler(JSON.stringify({ type: 'HEARTBEAT', clientId: 'kiosk-123', timestamp: Date.now() }));
        expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('HEARTBEAT_ACK')
        );
    });

    it('should apply a valid mutation and record ack', async () => {
        mockDb.get.mockReturnValueOnce(null); // No existing record

        const result = await manager.handleMutation(
            {
                type: 'MUTATION',
                clientId: 'kiosk-123',
                timestamp: Date.now(),
                entity: 'orders',
                action: 'create',
                data: { id: 'ord-1', total: 100 },
            },
            'kiosk-123'
        );

        expect(result.status).toBe('APPLIED');
        expect(mockDb.transaction).toHaveBeenCalled();
        expect(mockDb.run).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO mutation_ack_log'),
            expect.any(Array)
        );
    });

    it('should reject duplicate mutation via idempotency', async () => {
        mockDb.get.mockReturnValueOnce({ id: 'ack-1' }); // Already acked

        const result = await manager.handleMutation(
            {
                type: 'MUTATION',
                clientId: 'kiosk-123',
                timestamp: Date.now(),
                entity: 'orders',
                action: 'update',
                data: { id: 'ord-1', total: 200 },
            },
            'kiosk-123'
        );

        expect(result.status).toBe('ALREADY_APPLIED');
        expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should reject invalid mutation payload', async () => {
        const result = await manager.handleMutation(
            {
                type: 'MUTATION',
                clientId: 'kiosk-123',
                timestamp: Date.now(),
                entity: '',
                action: 'create',
                data: { id: 'ord-1' },
            },
            'kiosk-123'
        );

        expect(result.status).toBe('REJECTED');
    });

    it('should broadcast order status to all clients except source', () => {
        manager.handleConnection(mockWs as any, mockReq as any);

        // Add a second client
        const ws2 = { ...mockWs, send: jest.fn() };
        manager.handleConnection(ws2 as any, { ...mockReq, url: '/ws?clientId=kiosk-456' } as any);

        manager.broadcastOrderStatus('ord-1', 'Completed', { total: 50 });

        // Both connected clients (not MASTER) should receive the broadcast
        expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('ord-1')
        );
        expect(ws2.send).toHaveBeenCalledWith(
            expect.stringContaining('ord-1')
        );
    });
});
