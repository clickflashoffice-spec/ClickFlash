import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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

// --------------- dgram mock ---------------
const mockSocketOn = vi.fn();
const mockSocketBind = vi.fn();
const mockSocketClose = vi.fn();
const mockSocketSend = vi.fn((_msg, _offset, _len, _port, _address, cb) => {
  if (cb) cb(null);
});
const mockSocketSetBroadcast = vi.fn();
const mockSocketAddress = vi.fn().mockReturnValue({ port: 41234 });

vi.mock('dgram', () => {
  const socketMock = () => ({
    on: mockSocketOn,
    bind: mockSocketBind,
    close: mockSocketClose,
    send: mockSocketSend,
    setBroadcast: mockSocketSetBroadcast,
    address: mockSocketAddress,
  });
  return {
    __esModule: true,
    default: { createSocket: vi.fn(socketMock) },
    createSocket: vi.fn(socketMock),
  };
});

vi.mock('../networkDetection', () => ({
  getLocalNetworkIPs: vi.fn(() => ['192.168.1.100']),
}));

// Logger is instantiated inside the module, so we mock the Logger class
vi.mock('../../utils/logger', () => {
  return {
    Logger: class {
      info = vi.fn();
      warn = vi.fn();
      error = vi.fn();
      debug = vi.fn();
    }
  };
});

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
      expect(mockSocketBind).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // Listening & beacon
  // ----------------------------------------------------------------
  describe('beacon broadcasting', () => {
    it('should set broadcast flag on listening', () => {
      service.start();

      const listeningHandler = mockSocketOn.mock.calls.find(
        ([evt]: [string]) => evt === 'listening'
      )?.[1];
      expect(listeningHandler).toBeDefined();

      listeningHandler();
      expect(mockSocketSetBroadcast).toHaveBeenCalledWith(true);
    });

    it('should broadcast periodic beacons every 3s after listening', () => {
      service.start();

      const listeningHandler = mockSocketOn.mock.calls.find(
        ([evt]: [string]) => evt === 'listening'
      )?.[1];
      listeningHandler();

      mockSocketSend.mockClear();

      vi.advanceTimersByTime(3000);
      expect(mockSocketSend).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(3000);
      expect(mockSocketSend).toHaveBeenCalledTimes(2);
    });
  });

  // ----------------------------------------------------------------
  // Message handling (Touch ping)
  // ----------------------------------------------------------------
  describe('message handling', () => {
    it('should respond to clickflash-touch-discovery pings with a beacon', () => {
      service.start();

      const messageHandler = mockSocketOn.mock.calls.find(
        ([evt]: [string]) => evt === 'message'
      )?.[1];
      expect(messageHandler).toBeDefined();

      const pingPayload = Buffer.from(
        JSON.stringify({ service: 'clickflash-touch-discovery', timestamp: Date.now() })
      );

      mockSocketSend.mockClear();
      messageHandler(pingPayload, { address: '192.168.1.50', port: 54321 });

      expect(mockSocketSend).toHaveBeenCalledWith(
        expect.any(Buffer),
        0,
        expect.any(Number),
        54321,
        '192.168.1.50',
        expect.any(Function)
      );

      const sentBuffer: Buffer = mockSocketSend.mock.calls[0][0];
      const parsed = JSON.parse(sentBuffer.toString());
      expect(parsed.service).toBe('clickflash-master');
      expect(parsed.port).toBe(8090);
      expect(parsed.host).toBe('192.168.1.100');
    });

    it('should ignore non-JSON messages', () => {
      service.start();

      const messageHandler = mockSocketOn.mock.calls.find(
        ([evt]: [string]) => evt === 'message'
      )?.[1];

      mockSocketSend.mockClear();
      messageHandler(Buffer.from('not-json'), { address: '192.168.1.50', port: 54321 });

      expect(mockSocketSend).not.toHaveBeenCalled();
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
      service.start();
      service.stop();
      service.stop();
      expect(mockSocketClose).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  // Error handling
  // ----------------------------------------------------------------
  describe('error handling', () => {
    it('should close socket on error event', () => {
      service.start();

      const errorHandler = mockSocketOn.mock.calls.find(
        ([evt]: [string]) => evt === 'error'
      )?.[1];
      expect(errorHandler).toBeDefined();

      errorHandler(new Error('EADDRINUSE'));
      expect(mockSocketClose).toHaveBeenCalled();
    });
  });
});
