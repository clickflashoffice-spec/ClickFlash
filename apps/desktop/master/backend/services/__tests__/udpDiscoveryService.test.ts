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

// Jest globals

// --------------- dgram mock ---------------
const mockSocketOn = jest.fn();
const mockSocketBind = jest.fn();
const mockSocketClose = jest.fn();
const mockSocketSend = jest.fn((_msg, _offset, _len, _port, _address, cb) => {
  if (cb) cb(null);
});
const mockSocketSetBroadcast = jest.fn();
const mockSocketAddress = jest.fn().mockReturnValue({ port: 41234 });

jest.mock('dgram', () => {
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
    default: { createSocket: jest.fn(socketMock) },
    createSocket: jest.fn(socketMock),
  };
});

jest.mock('../networkDetection', () => ({
  getLocalNetworkIPs: jest.fn(() => ['192.168.1.100']),
}));

// Logger is instantiated inside the module, so we mock the Logger class
jest.mock('../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('UDPDiscoveryService', () => {
  let UDPDiscoveryService: typeof import('../udpDiscoveryService').UDPDiscoveryService;
  let service: InstanceType<typeof UDPDiscoveryService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Dynamic import to ensure mocks take effect
    const mod = await import('../udpDiscoveryService');
    UDPDiscoveryService = mod.UDPDiscoveryService;
    service = new UDPDiscoveryService();
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
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
      jest.advanceTimersByTime(3001);

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
