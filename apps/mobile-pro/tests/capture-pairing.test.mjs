import assert from 'node:assert/strict';
import test from 'node:test';

import pairing from '../src/services/CapturePairing.ts';

const {
  createCapturePairId,
  normalizeCaptureStem,
  selectPairCandidate,
} = pairing;

function capture(overrides) {
  return {
    objectId: 'raw-1',
    mediaType: 'raw',
    normalizedStem: 'DSC_0042',
    sequenceNumber: 0,
    cameraCreatedAt: 1_000_000,
    detectedAt: 1_001_000,
    ...overrides,
  };
}

test('normalizes Nikon RAW and JPEG names to the same stem', () => {
  assert.equal(normalizeCaptureStem('DCIM/100D7000/DSC_0042.NEF'), 'DSC_0042');
  assert.equal(normalizeCaptureStem('dsc_0042.jpg'), 'DSC_0042');
});

test('prefers an exact positive camera sequence', () => {
  const target = capture({ sequenceNumber: 88 });
  const selection = selectPairCandidate(target, [
    capture({
      objectId: 'jpeg-time',
      mediaType: 'jpeg',
      cameraCreatedAt: target.cameraCreatedAt,
    }),
    capture({
      objectId: 'jpeg-sequence',
      mediaType: 'jpeg',
      sequenceNumber: 88,
      cameraCreatedAt: target.cameraCreatedAt + 1_000,
    }),
  ]);

  assert.equal(selection.kind, 'MATCH');
  assert.equal(selection.candidate?.objectId, 'jpeg-sequence');
});

test('rejects same-stem objects outside the capture-time tolerance', () => {
  const selection = selectPairCandidate(capture({}), [
    capture({
      objectId: 'jpeg-old',
      mediaType: 'jpeg',
      cameraCreatedAt: 990_000,
    }),
  ]);

  assert.deepEqual(selection, { kind: 'NONE' });
});

test('fails closed when equally strong companions are ambiguous', () => {
  const selection = selectPairCandidate(capture({ sequenceNumber: 23 }), [
    capture({ objectId: 'jpeg-a', mediaType: 'jpeg', sequenceNumber: 23 }),
    capture({ objectId: 'jpeg-b', mediaType: 'jpeg', sequenceNumber: 23 }),
  ]);

  assert.equal(selection.kind, 'AMBIGUOUS');
  assert.deepEqual(selection.ambiguousObjectIds, ['jpeg-a', 'jpeg-b']);
});

test('creates one stable pair id regardless of arrival order', () => {
  assert.equal(
    createCapturePairId('raw-object', 'jpeg-object'),
    createCapturePairId('jpeg-object', 'raw-object')
  );
});
