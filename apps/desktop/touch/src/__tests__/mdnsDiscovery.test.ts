/**
 * Layer 5.2 — Touch mDNS Discovery Tests
 *
 * Covers:
 *  - Touch service advertisement (clickflash-touch)
 *  - Browsing for Master services (clickflash)
 *  - Master up event with latency measurement and sorting
 *  - Master down event removal
 *  - getMasters() immutability
 *  - Stop / cleanup
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// --------------- Bonjour mock ---------------
const mockPublish = vi.fn().mockReturnValue({ stop: vi.fn() });
const mockBrowserOn = vi.fn();
const mockBrowserStop = vi.fn();
const mockFind = vi.fn().mockReturnValue({
  on: mockBrowserOn,
  stop: mockBrowserStop,
});
const mockDestroy = vi.fn();

vi.mock('bonjour-service', () => {
  class MockBonjour {
    publish = mockPublish;
    find = mockFind;
    destroy = mockDestroy;
  }
  return {
    Bonjour: MockBonjour,
    default: MockBonjour,
  };
});

// --------------- Logger mock ---------------
vi.mock('../shared/logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Use the real import path for Touch's mDNS discovery
// Touch backend lives at apps/touch/backend/services/mdnsDiscovery.ts
// but vitest for touch includes src/**/*.test.ts
// We import relative to the test file location
import { TouchMdnsDiscovery, type DiscoveredMaster } from '../../backend/services/mdnsDiscovery';

// Mock fetch for pingMaster
const originalFetch = globalThis.fetch;

describe('TouchMdnsDiscovery', () => {
  let discovery: TouchMdnsDiscovery;
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for latency ping
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;
    discovery = new TouchMdnsDiscovery(mockLogger as any);
  });

  afterEach(() => {
    discovery.stop();
    globalThis.fetch = originalFetch;
  });

  // ----------------------------------------------------------------
  // Advertise
  // ----------------------------------------------------------------
  describe('advertise()', () => {
    it('should publish a clickflash-touch service', () => {
      discovery.advertise('KIOSK_001', '4.3.0');

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ClickFlash-Touch-KIOSK_001',
          type: 'clickflash-touch',
          port: 8091,
          txt: expect.objectContaining({
            kioskId: 'KIOSK_001',
            version: '4.3.0',
            status: 'ready',
          }),
        }),
      );
    });
  });

  // ----------------------------------------------------------------
  // Browse for Masters
  // ----------------------------------------------------------------
  describe('browseForMasters()', () => {
    it('should browse for clickflash services', () => {
      const callback = vi.fn();
      discovery.browseForMasters(callback);

      expect(mockFind).toHaveBeenCalledWith({ type: 'clickflash' });
    });

    it('should add discovered master with latency and sort by it', async () => {
      const callback = vi.fn();
      discovery.browseForMasters(callback);

      const upHandler = mockBrowserOn.mock.calls.find((c) => c[0] === 'up')?.[1];
      expect(upHandler).toBeDefined();

      const fakeMasterService = {
        name: 'ClickFlash-Master-desk42',
        host: 'master.local',
        port: 8090,
        txt: { deskId: 'desk42', version: '4.3.0' },
        addresses: ['192.168.1.100'],
      };

      await upHandler(fakeMasterService);

      // Wait for the callback (async pingMaster)
      // The fetch mock resolves immediately, so latencyMs should be ~0
      expect(callback).toHaveBeenCalled();
      const masters: DiscoveredMaster[] = callback.mock.calls[0][0];
      expect(masters).toHaveLength(1);
      expect(masters[0]).toEqual(
        expect.objectContaining({
          name: 'ClickFlash-Master-desk42',
          deskId: 'desk42',
          port: 8090,
        }),
      );
      expect(masters[0].latencyMs).toBeDefined();
    });

    it('should remove master on "down" event', async () => {
      const callback = vi.fn();
      discovery.browseForMasters(callback);

      const upHandler = mockBrowserOn.mock.calls.find((c) => c[0] === 'up')?.[1];
      const downHandler = mockBrowserOn.mock.calls.find((c) => c[0] === 'down')?.[1];

      await upHandler({
        name: 'ClickFlash-Master-desk42',
        host: 'master.local',
        port: 8090,
        txt: { deskId: 'desk42', version: '4.3.0' },
        addresses: ['192.168.1.100'],
      });

      expect(discovery.getMasters()).toHaveLength(1);

      downHandler({ name: 'ClickFlash-Master-desk42' });

      expect(discovery.getMasters()).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // getMasters
  // ----------------------------------------------------------------
  describe('getMasters()', () => {
    it('should return a copy (immutable)', () => {
      const copy = discovery.getMasters();
      expect(copy).toEqual([]);
      copy.push({ name: 'x', host: '', port: 0, deskId: '', version: '', addresses: [] });
      expect(discovery.getMasters()).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // Stop / cleanup
  // ----------------------------------------------------------------
  describe('stop()', () => {
    it('should destroy bonjour instance', () => {
      discovery.advertise('K1', '1.0');
      discovery.browseForMasters(vi.fn());
      discovery.stop();

      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});
