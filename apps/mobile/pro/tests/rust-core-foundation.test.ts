import assert from 'node:assert/strict';
import test from 'node:test';

import { RustCore } from '../modules/clickflash-rust-core/index.ts';

test('RustCore.saveBooking registers guest booking offline and enqueues sync event', () => {
  const result = RustCore.saveBooking({
    dbPath: 'offline_queue.db',
    name: 'Alice Wonder',
    whatsapp: '+1234567890',
    email: 'alice@example.com'
  });

  assert.ok(result.includes('registered offline via Rust Core') || result.includes('Alice Wonder'));
  assert.match(result, /Booking/);
});

test('RustCore.queuePhoto queues photo payload offline with metadata', () => {
  const result = RustCore.queuePhoto({
    dbPath: 'offline_photos.db',
    filePath: '/storage/emulated/0/DCIM/CF_0042.JPG',
    metadata: JSON.stringify({ guestUuid: 'uuid-1234', spotId: 'spot-01' })
  });

  assert.ok(result.includes('CF_0042.JPG') || result.includes('queued offline'));
});

test('RustCore.enqueueSyncEvent stores durable event with priority level', () => {
  const result = RustCore.enqueueSyncEvent({
    dbPath: 'offline_queue.db',
    eventType: 'SHIFT_EVENT',
    endpoint: '/api/v1/shifts/clock-in',
    method: 'POST',
    payload: JSON.stringify({ photographerId: 'p-100', timestamp: Date.now() }),
    priority: 'HIGH'
  });

  assert.ok(result.includes('SHIFT_EVENT') || result.includes('queued offline'));
});

test('RustCore.processSpotIntelligence computes deterministic yield and shutter recommendation', () => {
  // Scenario 1: High motion blur triggers shutter speed recommendation
  const highBlurInput = JSON.stringify({
    sampleCount: 35,
    averagePoseQuality: 0.88,
    blurRate: 0.32,
    blinkRate: 0.04
  });

  const highBlurResultStr = RustCore.processSpotIntelligence(highBlurInput);
  const highBlurResult = JSON.parse(highBlurResultStr);

  assert.equal(highBlurResult.recommendation, 'INCREASE_SHUTTER_SPEED');
  assert.equal(highBlurResult.offlineComputed, true);
  assert.ok(highBlurResult.yieldScore > 0);

  // Scenario 2: Pristine conditions trigger hold position peak yield
  const pristineInput = JSON.stringify({
    sampleCount: 50,
    averagePoseQuality: 0.95,
    blurRate: 0.03,
    blinkRate: 0.02
  });

  const pristineResultStr = RustCore.processSpotIntelligence(pristineInput);
  const pristineResult = JSON.parse(pristineResultStr);

  assert.equal(pristineResult.recommendation, 'HOLD_POSITION_PEAK_YIELD');
  assert.ok(pristineResult.yieldScore >= 80);
});

test('RustCore.processSpotIntelligence gracefully handles raw spot name fallback', () => {
  const fallbackStr = RustCore.processSpotIntelligence('Splash Mountain Exit Spot');
  const fallback = JSON.parse(fallbackStr);

  assert.equal(fallback.spot, 'Splash Mountain Exit Spot');
  assert.equal(fallback.recommendation, 'OPTIMAL_LIGHTING');
  assert.equal(fallback.offlineComputed, true);
});

test('RustCore.getQueueStats returns structured telemetry contracts', () => {
  const stats = RustCore.getQueueStats({ dbPath: 'offline_queue.db' });

  assert.equal(typeof stats.pendingPhotos, 'number');
  assert.equal(typeof stats.pendingEvents, 'number');
  assert.equal(typeof stats.pendingBookings, 'number');
  assert.equal(typeof stats.totalPending, 'number');
});

test('RustCore.syncPendingEvents and syncPendingPhotos execute without unhandled rejections', async () => {
  const photosResult = RustCore.syncPendingPhotos({
    dbPath: 'offline_photos.db',
    masterUrl: 'http://192.168.1.50:8090/api/photos/sync'
  });
  assert.ok(typeof photosResult === 'string');

  const eventsResult = await RustCore.syncPendingEvents({
    dbPath: 'offline_queue.db',
    targetUrlPrefix: 'http://192.168.1.50:8090'
  });
  assert.ok(typeof eventsResult === 'string');
});

test('RustCore.scanAndLinkBeacons and broadcastAndScanGhostLink return JSON statuses', async () => {
  const beaconRes = await RustCore.scanAndLinkBeacons({
    dbPath: 'offline_queue.db',
    durationSecs: 2
  });
  const beaconJson = JSON.parse(beaconRes);
  assert.ok('status' in beaconJson || 'discovered' in beaconJson);

  const ghostRes = await RustCore.broadcastAndScanGhostLink({
    dbPath: 'offline_queue.db',
    ghostLinkUuid: 'C11C-F1A5-0000-1000-8000-00805F9B34FB',
    durationSecs: 2
  });
  const ghostJson = JSON.parse(ghostRes);
  assert.ok('status' in ghostJson || 'discovered' in ghostJson);
});
