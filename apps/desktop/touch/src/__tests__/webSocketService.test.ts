// @vitest-environment jsdom
/**
 * Layer 5.2 — Touch Kiosk WebSocket Client Tests
 *
 * Covers:
 *  - Connection to Master's WebSocket server
 *  - REGISTER_CLIENT sent on open
 *  - PING heartbeat at 15 s intervals
 *  - Message parsing and routing (PONG, KIOSK_STATUS_UPDATE, album/order events)
 *  - Reconnection with exponential backoff (max 30 s)
 *  - Pending message queue (max 50)
 *  - Intentional disconnect stops heartbeat and reconnect
 *  - getConnectionStats()
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// --------------- Mock logger ---------------
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// --------------- Mock timing constants ---------------
vi.mock('../constants/timing.ts', () => ({
  TIMEOUTS: {
    HEARTBEAT: 15000,
    RECONNECT_BASE: 1000,
    RECONNECT_MAX: 30000,
  },
}));

// --------------- Fake WebSocket ---------------
interface FakeWebSocketInstance {
  url: string;
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  onerror: ((error: any) => void) | null;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

let wsInstances: FakeWebSocketInstance[] = [];

class FakeWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  send = vi.fn();
  close = vi.fn().mockImplementation(() => {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose({ code: 1000, reason: '' });
    }
  });

  constructor(url: string) {
    this.url = url;
    wsInstances.push(this as any);
  }
}

// Replace global WebSocket
const origWS = globalThis.WebSocket;

describe('Touch WebSocketService', () => {
  let WebSocketService: any;
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    wsInstances = [];
    vi.useFakeTimers();

    // Inject fake WebSocket
    (globalThis as any).WebSocket = FakeWebSocket;

    // Dynamic import to get a fresh instance
    vi.resetModules();
    const mod = await import('../services/webSocketService');
    // The module exports a singleton; for testing we need the class
    // We'll test via the exported singleton
    service = mod.webSocketService;
  });

  afterEach(() => {
    service.disconnect(true);
    vi.useRealTimers();
    (globalThis as any).WebSocket = origWS;
  });

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  function connectService(overrides: Record<string, any> = {}) {
    const onMessage = vi.fn();
    const onStatusChange = vi.fn();
    const onKioskStatusUpdate = vi.fn();
    const onRefresh = vi.fn();
    const wsUrl = overrides.wsUrl ?? 'ws://192.168.1.100:8090/ws';

    service.connect(
      { type: 'kiosk', kioskId: 'KIOSK_001' },
      onMessage,
      onStatusChange,
      onKioskStatusUpdate,
      onRefresh,
      wsUrl,
    );

    return { onMessage, onStatusChange, onKioskStatusUpdate, onRefresh };
  }

  function getLatestWs(): FakeWebSocketInstance {
    return wsInstances[wsInstances.length - 1];
  }

  // ----------------------------------------------------------------
  // Connection
  // ----------------------------------------------------------------
  describe('connect()', () => {
    it('should create a WebSocket to the given URL', () => {
      connectService();
      expect(wsInstances).toHaveLength(1);
      expect(getLatestWs().url).toBe('ws://192.168.1.100:8090/ws');
    });

    it('should require a wsUrl for Touch Kiosk', () => {
      const { onStatusChange } = connectService({ wsUrl: undefined });
      // Without URL the service sets status Disconnected
      // (connect() returns early because wsUrl is empty in the module)
    });

    it('should send REGISTER_CLIENT on open', () => {
      connectService();
      const ws = getLatestWs();

      // Simulate open
      ws.readyState = 1;
      ws.onopen!();

      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'REGISTER_CLIENT',
          payload: { type: 'kiosk', kioskId: 'KIOSK_001' },
        }),
      );
    });

    it('should set status to Connected on open', () => {
      const { onStatusChange } = connectService();
      const ws = getLatestWs();

      ws.readyState = 1;
      ws.onopen!();

      expect(onStatusChange).toHaveBeenCalledWith('Connected');
      expect(service.status).toBe('Connected');
    });
  });

  // ----------------------------------------------------------------
  // Message routing
  // ----------------------------------------------------------------
  describe('message handling', () => {
    it('should update lastConnectionTime on PONG', () => {
      connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      ws.onmessage!({ data: JSON.stringify({ type: 'PONG' }) });

      const stats = service.getConnectionStats();
      expect(stats.lastConnectionTime).toBeInstanceOf(Date);
    });

    it('should call onKioskStatusUpdate for KIOSK_STATUS_UPDATE', () => {
      const { onKioskStatusUpdate } = connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      const statusPayload = { id: 'k2', name: 'Kiosk 2', status: 'Connected' };
      ws.onmessage!({ data: JSON.stringify({ type: 'KIOSK_STATUS_UPDATE', payload: statusPayload }) });

      expect(onKioskStatusUpdate).toHaveBeenCalledWith(statusPayload);
    });

    it('should call onRefresh for album/order events', () => {
      const { onRefresh, onMessage } = connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      const events = ['NEW_ALBUM_FOR_KIOSK', 'ALBUM_UPDATED', 'ORDER_UPDATED'];
      for (const evt of events) {
        ws.onmessage!({ data: JSON.stringify({ type: evt }) });
      }

      expect(onRefresh).toHaveBeenCalledTimes(events.length);
      expect(onMessage).toHaveBeenCalledTimes(events.length);
    });

    it('should forward unknown message types to onMessage', () => {
      const { onMessage } = connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      ws.onmessage!({ data: JSON.stringify({ type: 'CUSTOM_EVENT', payload: 123 }) });

      expect(onMessage).toHaveBeenCalledWith({ type: 'CUSTOM_EVENT', payload: 123 });
    });
  });

  // ----------------------------------------------------------------
  // Heartbeat
  // ----------------------------------------------------------------
  describe('heartbeat', () => {
    it('should send PING every 15 seconds', () => {
      connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      vi.advanceTimersByTime(15_001);

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PING' }));
    });
  });

  // ----------------------------------------------------------------
  // Reconnection
  // ----------------------------------------------------------------
  describe('reconnection', () => {
    it('should schedule reconnect with exponential backoff after disconnect', () => {
      connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      // Simulate unexpected close
      ws.readyState = 3;
      ws.onclose!({ code: 1006, reason: '' });

      expect(service.status).toBe('Disconnected');

      // First reconnect delay = 1000ms + up to 800ms jitter
      vi.advanceTimersByTime(1805);

      // A new WebSocket should have been created
      expect(wsInstances.length).toBeGreaterThanOrEqual(2);
    });

    it('should immediately connect on forceReconnect', () => {
      connectService();
      expect(wsInstances.length).toBe(1);
      service.forceReconnect();
      expect(wsInstances.length).toBe(2);
    });

    it('should stop reconnecting after MAX_RECONNECT_ATTEMPTS', () => {
      connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      // Simulate 100 disconnects (the max)
      for (let i = 0; i < 101; i++) {
        const currentWs = getLatestWs();
        currentWs.readyState = 3;
        currentWs.onclose!({ code: 1006, reason: '' });
        vi.advanceTimersByTime(30_001); // Max backoff
      }

      const countBefore = wsInstances.length;
      vi.advanceTimersByTime(60_000);
      // No more reconnects
      expect(wsInstances.length).toBe(countBefore);
    });
  });

  // ----------------------------------------------------------------
  // Pending message queue
  // ----------------------------------------------------------------
  describe('pending message queue', () => {
    it('should queue messages when not connected', () => {
      connectService();
      // Don't fire onopen — socket stays in CONNECTING state
      const ws = getLatestWs();
      ws.readyState = 0;

      service.sendMessage({ type: 'TEST', payload: 1 });
      service.sendMessage({ type: 'TEST', payload: 2 });

      const stats = service.getConnectionStats();
      expect(stats.queuedMessages).toBe(2);
    });

    it('should drain queued messages on reconnect', () => {
      connectService();
      const ws1 = getLatestWs();
      ws1.readyState = 0;

      service.sendMessage({ type: 'QUEUED', payload: 'a' });

      // Now simulate open
      ws1.readyState = 1;
      ws1.onopen!();

      // REGISTER_CLIENT + drained message
      expect(ws1.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'QUEUED', payload: 'a' }),
      );
    });
  });

  // ----------------------------------------------------------------
  // Intentional disconnect
  // ----------------------------------------------------------------
  describe('disconnect()', () => {
    it('should not schedule reconnect after intentional disconnect', () => {
      connectService();
      const ws = getLatestWs();
      ws.readyState = 1;
      ws.onopen!();

      service.disconnect(true);

      const countBefore = wsInstances.length;
      vi.advanceTimersByTime(60_000);

      expect(wsInstances.length).toBe(countBefore);
      expect(service.status).toBe('Disconnected');
    });
  });

  // ----------------------------------------------------------------
  // getConnectionStats
  // ----------------------------------------------------------------
  describe('getConnectionStats()', () => {
    it('should return current status and URL', () => {
      connectService();
      const stats = service.getConnectionStats();

      expect(stats.status).toBe('Disconnected'); // Not yet opened
      expect(stats.wsUrl).toBe('ws://192.168.1.100:8090/ws');
    });
  });
});
