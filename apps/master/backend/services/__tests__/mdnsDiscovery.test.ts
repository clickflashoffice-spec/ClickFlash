/**
 * Layer 5.2 — mDNS Discovery Tests (Master)
 *
 * Covers:
 *  - Master service advertisement via Bonjour
 *  - Browsing for Touch Kiosks
 *  - Device up / down events
 *  - Stop / cleanup
 *  - getTouchDevices returns immutable copy
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

vi.mock('bonjour-service', () => ({
  default: vi.fn().mockImplementation(() => ({
    publish: mockPublish,
    find: mockFind,
    destroy: mockDestroy,
  })),
}));

// --------------- Logger mock ---------------
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

import { MasterMdnsDiscovery, DiscoveredDevice } from '../mdnsDiscovery';

describe('MasterMdnsDiscovery', () => {
  let discovery: MasterMdnsDiscovery;

  beforeEach(() => {
    vi.clearAllMocks();
    discovery = new MasterMdnsDiscovery(mockLogger as any);
  });

  afterEach(() => {
    discovery.stop();
  });

  // ----------------------------------------------------------------
  // Advertise
  // ----------------------------------------------------------------
  describe('advertise()', () => {
    it('should publish a clickflash service with correct TXT record', () => {
      discovery.advertise('desk-42', '4.3.0', 'Studio Main');

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ClickFlash-Master-desk-42',
          type: 'clickflash',
          port: 8090,
          txt: expect.objectContaining({
            deskId: 'desk-42',
            version: '4.3.0',
            name: 'Studio Main',
            status: 'ready',
          }),
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Advertising Master desk-42'),
      );
    });
  });

  // ----------------------------------------------------------------
  // Browse for Touches
  // ----------------------------------------------------------------
  describe('browseForTouches()', () => {
    it('should browse for clickflash-touch services', () => {
      const callback = vi.fn();
      discovery.browseForTouches(callback);

      expect(mockFind).toHaveBeenCalledWith({ type: 'clickflash-touch' });
    });

    it('should emit discovered device on "up" event', () => {
      const callback = vi.fn();
      discovery.browseForTouches(callback);

      // Simulate 'up' event
      const upHandler = mockBrowserOn.mock.calls.find((c) => c[0] === 'up')?.[1];
      expect(upHandler).toBeDefined();

      const fakeService = {
        name: 'ClickFlash-Touch-KIOSK01',
        host: 'kiosk01.local',
        port: 8091,
        txt: { kioskId: 'KIOSK01', version: '4.3.0', status: 'ready' },
        addresses: ['192.168.1.101'],
      };

      upHandler(fakeService);

      expect(callback).toHaveBeenCalledTimes(1);
      const devices: DiscoveredDevice[] = callback.mock.calls[0][0];
      expect(devices).toHaveLength(1);
      expect(devices[0]).toEqual(
        expect.objectContaining({
          name: 'ClickFlash-Touch-KIOSK01',
          type: 'touch',
          host: 'kiosk01.local',
          port: 8091,
          addresses: ['192.168.1.101'],
        }),
      );
    });

    it('should remove device on "down" event', () => {
      const callback = vi.fn();
      discovery.browseForTouches(callback);

      const upHandler = mockBrowserOn.mock.calls.find((c) => c[0] === 'up')?.[1];
      const downHandler = mockBrowserOn.mock.calls.find((c) => c[0] === 'down')?.[1];

      // Add a device
      upHandler({
        name: 'ClickFlash-Touch-KIOSK01',
        host: 'kiosk01.local',
        port: 8091,
        txt: {},
        addresses: ['192.168.1.101'],
      });

      expect(discovery.getTouchDevices()).toHaveLength(1);

      // Remove it
      downHandler({ name: 'ClickFlash-Touch-KIOSK01' });

      expect(callback).toHaveBeenCalledTimes(2);
      const afterDown: DiscoveredDevice[] = callback.mock.calls[1][0];
      expect(afterDown).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // getTouchDevices
  // ----------------------------------------------------------------
  describe('getTouchDevices()', () => {
    it('should return an immutable copy of devices', () => {
      const result = discovery.getTouchDevices();
      expect(result).toEqual([]);

      // Mutating the returned array should not affect internal state
      result.push({ name: 'hack', type: 'touch', host: '', port: 0, txt: {}, addresses: [] });
      expect(discovery.getTouchDevices()).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // Stop / cleanup
  // ----------------------------------------------------------------
  describe('stop()', () => {
    it('should stop service, browser, and destroy bonjour', () => {
      discovery.advertise('desk-1', '1.0.0', 'Test');
      discovery.browseForTouches(vi.fn());

      discovery.stop();

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Discovery stopped'));
    });
  });
});
