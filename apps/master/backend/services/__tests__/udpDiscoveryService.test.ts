/**
 * Layer 5.2 — UDP Discovery Service Tests
 *
 * Covers:
 *  - Socket creation and binding
 *  - Beacon broadcasting (periodic + direct)
 *  - Response to Touch ping messages
 *  - Stop / cleanup
 *  - Error handling (socket errors)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// --------------- dgram mock ---------------
const mockSocketOn = vi.fn();
const mockSocketBind = vi.fn();
const mockSocketClose = vi.fn();
const mockSocketSend = vi.fn((_msg, _offset, _len, _port, _address, cb) => {
  if (cb) cb(null);
});
const mockSocketSetBroadcast = vi.fn();
const mockSocketAddress = vi.fn().mockReturnValue({ port: 41234 });

vi.mock('dgram', () => ({
  default: {
    createSocket: vi.fn(() => ({
      on: mockSocketOn,
      bind: mockSocketBind,
      close: mockSocketClose,
      send: mockSocketSend,
      setBroadcast: mockSocketSetBroadcast,
      address: mockSocketAddress,
    })),
  },
}));

vi.mock('../networkDetection', () => ({
  getLocalNetworkIPs: vi.fn(() => ['192.168.1.100']),
}));

// Logger is instantiated inside the module, so we mock the Logger class
vi.mock('../../utils/logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('UDPDiscoveryService', () => {
  let UDPDiscoveryService: typeof import('../udpDiscoveryService').UDPDiscoveryService;
  let service: InstanceType<typeof UDPDiscoveryService>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Dynamic import to ensure mocks take effect
    const mod = await import('../udpDiscoveryService');
    UDPDiscoveryService = mod.UDPDiscoveryService;
    service = new UDPDiscoveryService();
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  // ----------------------------------------------------------------
  // Start / socket creation
  // ----------------------------------------------------------------
  describe('start()', () => {
    it('should create a UDP4 socket and bind to port 41234', () => {
      service.start();
      expect(mockSocketBind).toHaveBeenCalledWith(41234);
    });

    it('should not start twice', () => {
      service.start();
      service.start();
      // Only one bind call
      expect(mockSocketBind).toHaveBeenCalledTimes(1);
    });

    it('should set broadcast flag on listening', () => {
      service.start();

      // Trigger 'listening' handler
      const listeningHandler = mockSocketOn.mock.calls.find((c) => c[0] === 'listening')?.[1];
      expect(listeningHandler).toBeDefined();
      listeningHandler!();

      expect(mockSocketSetBroadcast).toHaveBeenCalledWith(true);
    });

    it('should broadcast periodic beacons every 3s after listening', () => {
      service.start();

      const listeningHandler = mockSocketOn.mock.calls.find((c) => c[0] === 'listening')?.[1];
      listeningHandler!();

      // Advance 3 seconds for first broadcast
      vi.advanceTimersByTime(3001);

      expect(mockSocketSend).toHaveBeenCalled();
      const sentPayload = JSON.parse(mockSocketSend.mock.calls[0][0].toString());
      expect(sentPayload).toEqual(
        expect.objectContaining({
          service: 'clickflash-master',
          host: '192.168.1.100',
          port: 8090,
        }),
      );
    });
  });

  // ----------------------------------------------------------------
  // Incoming messages
  // ----------------------------------------------------------------
  describe('incoming messages', () => {
    it('should respond to clickflash-touch-discovery pings with a beacon', () => {
      service.start();

      const messageHandler = mockSocketOn.mock.calls.find((c) => c[0] === 'message')?.[1];
      expect(messageHandler).toBeDefined();

      const touchPing = Buffer.from(JSON.stringify({ service: 'clickflash-touch-discovery' }));
      messageHandler!(touchPing, { address: '192.168.1.50', port: 41234 });

      // Should send a direct beacon back
      expect(mockSocketSend).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        41234,
        '192.168.1.50',
        expect.any(Function),
      );
    });

    it('should ignore non-JSON messages', () => {
      service.start();

      const messageHandler = mockSocketOn.mock.calls.find((c) => c[0] === 'message')?.[1];
      const badMsg = Buffer.from('not json');

      // Should not throw
      expect(() => messageHandler!(badMsg, { address: '10.0.0.1', port: 41234 })).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  // Stop / cleanup
  // ----------------------------------------------------------------
  describe('stop()', () => {
    it('should close socket and clear interval', () => {
      service.start();
      service.stop();

      expect(mockSocketClose).toHaveBeenCalled();
    });

    it('should be idempotent', () => {
      service.stop();
      service.stop();
      // No errors thrown
    });
  });

  // ----------------------------------------------------------------
  // Error handling
  // ----------------------------------------------------------------
  describe('error handling', () => {
    it('should close socket on error event', () => {
      service.start();

      const errorHandler = mockSocketOn.mock.calls.find((c) => c[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();

      errorHandler!(new Error('EADDRINUSE'));

      expect(mockSocketClose).toHaveBeenCalled();
    });
  });
});
