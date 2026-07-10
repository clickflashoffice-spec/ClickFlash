/**
 * Layer 5.2 — WebSocket Server Tests
 *
 * Covers:
 *  - Connection establishment & verifyClient logic
 *  - PING/PONG heartbeat protocol
 *  - REGISTER_CLIENT kiosk registration
 *  - ASSISTANCE_REQUEST broadcast
 *  - BROADCAST_DATA_REFRESH relay
 *  - GHOST_FRAME relay (admin ghosting)
 *  - Connection rate-limiting per IP
 *  - Oversized message rejection (1 MB limit)
 *  - Client disconnect cleanup & broadcast
 *  - Heartbeat interval terminates dead connections
 */

// Jest globals

// --------------- ws mock ---------------
const mockWssOn = jest.fn();
const mockWssClients = new Set<any>();
const MockWebSocketServer = jest.fn().mockImplementation(() => ({
  on: mockWssOn,
  clients: mockWssClients,
}));

jest.mock('ws', () => {
  const wsMock = { OPEN: 1, CLOSED: 3 };
  return {
    __esModule: true,
    default: wsMock,
    WebSocket: wsMock,
    WebSocketServer: MockWebSocketServer,
  };
});

// --------------- DB mock ---------------
const mockDbManager = {
  run: jest.fn(),
  get: jest.fn(),
  query: jest.fn().mockReturnValue([]),
  prepare: jest.fn(() => ({ run: jest.fn() })),
  transaction: jest.fn((fn: () => void) => fn()),
};

// --------------- Logger mock ---------------
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// --------------- SyncManager mock ---------------
const mockSyncManager = {
  handleConnection: jest.fn(),
  stop: jest.fn(),
};

// --------------- helpers ---------------
function createMockWs(overrides: Record<string, any> = {}) {
  return {
    readyState: 1, // OPEN
    isAlive: true,
    clientInfo: undefined as any,
    send: jest.fn(),
    close: jest.fn(),
    ping: jest.fn(),
    terminate: jest.fn(),
    on: jest.fn(),
    ...overrides,
  };
}

function createMockReq(ip = '192.168.1.50', url = '/ws?kioskId=kiosk-001') {
  return {
    url,
    socket: { remoteAddress: ip },
  };
}

// We import lazily after mocks are set up
let initWebSocketServer: typeof import('../websocket').default;

describe('WebSocket Server (initWebSocketServer)', () => {
  let connectionHandler: (ws: any, req: any) => void;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWssClients.clear();
    jest.useFakeTimers();

    // Dynamic import so `jest.mock('ws')` takes effect
    const mod = await import('../websocket');
    initWebSocketServer = mod.default;

    // Create server instance (server arg is unused in ws because we set `path`)
    const fakeHttpServer = {} as any;
    initWebSocketServer(fakeHttpServer, {
      logger: mockLogger as any,
      dbManager: mockDbManager as any,
      syncManager: mockSyncManager as any,
    });

    // Extract 'connection' handler registered on the WSS
    const connectionCall = mockWssOn.mock.calls.find((c) => c[0] === 'connection');
    expect(connectionCall).toBeDefined();
    connectionHandler = connectionCall![1];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ----------------------------------------------------------------
  // Connection establishment
  // ----------------------------------------------------------------
  describe('connection establishment', () => {
    it('should register new client with SyncManager', () => {
      const ws = createMockWs();
      const req = createMockReq();

      connectionHandler(ws, req);

      expect(mockSyncManager.handleConnection).toHaveBeenCalledWith(ws, req);
    });

    it('should set isAlive = true on new connection', () => {
      const ws = createMockWs({ isAlive: false });
      connectionHandler(ws, createMockReq());
      expect(ws.isAlive).toBe(true);
    });

    it('should close socket when rate limit exceeded', () => {
      const ip = '10.0.0.99';
      const req = createMockReq(ip);

      // 20 connections per minute is the limit
      for (let i = 0; i < 21; i++) {
        const ws = createMockWs();
        connectionHandler(ws, req);
        if (i === 20) {
          expect(ws.close).toHaveBeenCalledWith(1008, 'Too many connections');
        }
      }
    });
  });

  // ----------------------------------------------------------------
  // Message routing
  // ----------------------------------------------------------------
  describe('message routing', () => {
    let ws: ReturnType<typeof createMockWs>;
    let messageHandler: (msg: any) => void;

    beforeEach(() => {
      ws = createMockWs();
      connectionHandler(ws, createMockReq());
      const msgCall = ws.on.mock.calls.find((c: any[]) => c[0] === 'message');
      expect(msgCall).toBeDefined();
      messageHandler = msgCall![1];
    });

    it('should respond PONG to PING', () => {
      messageHandler(JSON.stringify({ type: 'PING' }));
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PONG' }));
    });

    it('should store clientInfo on REGISTER_CLIENT', () => {
      const payload = { type: 'kiosk', kioskId: 'kiosk-001', name: 'Lobby' };
      messageHandler(JSON.stringify({ type: 'REGISTER_CLIENT', payload }));
      expect(ws.clientInfo).toEqual(payload);
    });

    it('should broadcast ASSISTANCE_REQUEST to all open clients', () => {
      const adminWs = createMockWs();
      mockWssClients.add(ws);
      mockWssClients.add(adminWs);

      messageHandler(JSON.stringify({
        type: 'ASSISTANCE_REQUEST',
        payload: { kioskId: 'kiosk-001', message: 'Need help' },
      }));

      // Both clients should receive the broadcast
      expect(adminWs.send).toHaveBeenCalledWith(expect.stringContaining('ASSISTANCE_REQUEST'));
    });

    it('should relay BROADCAST_DATA_REFRESH to other clients', () => {
      const otherWs = createMockWs();
      mockWssClients.add(ws);
      mockWssClients.add(otherWs);

      messageHandler(JSON.stringify({ type: 'BROADCAST_DATA_REFRESH', collection: 'albums' }));

      // Source should NOT receive its own broadcast
      expect(otherWs.send).toHaveBeenCalled();
    });

    it('should reject oversized messages (> 1 MB)', () => {
      const hugePayload = 'x'.repeat(1_048_577);
      messageHandler(hugePayload);

      // No send() should be called, and a warning logged
      expect(ws.send).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rejected oversized message'),
      );
    });

    it('should relay GHOST_FRAME only to non-kiosk clients', () => {
      // Source kiosk
      ws.clientInfo = { type: 'kiosk', kioskId: 'k1' };

      // Admin client (not a kiosk)
      const adminWs = createMockWs();
      adminWs.clientInfo = { type: 'admin' };

      // Another kiosk
      const kioskWs = createMockWs();
      kioskWs.clientInfo = { type: 'kiosk', kioskId: 'k2' };

      mockWssClients.add(ws);
      mockWssClients.add(adminWs);
      mockWssClients.add(kioskWs);

      const ghostMsg = JSON.stringify({ type: 'GHOST_FRAME', data: 'base64...' });
      messageHandler(ghostMsg);

      expect(adminWs.send).toHaveBeenCalledWith(ghostMsg);
      expect(kioskWs.send).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Disconnect cleanup
  // ----------------------------------------------------------------
  describe('disconnect handling', () => {
    it('should broadcast KIOSK_STATUS_UPDATE Disconnected on kiosk close', () => {
      const ws = createMockWs();
      ws.clientInfo = { type: 'kiosk', kioskId: 'kiosk-001', name: 'Lobby' };

      const adminWs = createMockWs();
      mockWssClients.add(adminWs);

      connectionHandler(ws, createMockReq());
      const closeHandler = ws.on.mock.calls.find((c: any[]) => c[0] === 'close')?.[1];
      expect(closeHandler).toBeDefined();

      closeHandler!();

      expect(adminWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"status":"Disconnected"'),
      );
      expect(mockDbManager.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE kiosks SET status'),
        ['Disconnected', 'kiosk-001'],
      );
    });
  });

  // ----------------------------------------------------------------
  // Heartbeat interval
  // ----------------------------------------------------------------
  describe('heartbeat interval', () => {
    it('should terminate clients that miss heartbeat', () => {
      const ws = createMockWs({ isAlive: false });
      mockWssClients.add(ws);

      connectionHandler(ws, createMockReq());
      ws.isAlive = false;

      // The heartbeat runs every 30 000 ms
      jest.advanceTimersByTime(30_001);

      expect(ws.terminate).toHaveBeenCalled();
    });

    it('should ping alive clients and reset isAlive', () => {
      const ws = createMockWs({ isAlive: true });
      mockWssClients.add(ws);

      connectionHandler(ws, createMockReq());

      // Force isAlive true initially
      ws.isAlive = true;
      jest.advanceTimersByTime(30_001);

      expect(ws.isAlive).toBe(false);
      expect(ws.ping).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Pong handler
  // ----------------------------------------------------------------
  describe('pong handler', () => {
    it('should set isAlive on pong and update kiosk status', () => {
      const ws = createMockWs();
      ws.clientInfo = { type: 'kiosk', kioskId: 'kiosk-001', name: 'Lobby' };

      connectionHandler(ws, createMockReq());

      const pongHandler = ws.on.mock.calls.find((c: any[]) => c[0] === 'pong')?.[1];
      expect(pongHandler).toBeDefined();

      ws.isAlive = false;
      pongHandler!();

      expect(ws.isAlive).toBe(true);
    });
  });
});
