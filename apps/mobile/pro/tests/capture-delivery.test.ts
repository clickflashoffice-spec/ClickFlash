import assert from 'node:assert/strict';
import test from 'node:test';

import delivery from '../src/services/CaptureDelivery.ts';

const {
  canTransitionDelivery,
  createDeliveryIdempotencyKey,
  requiresAuthenticatedReceipt,
  validateDeliveryReceipt,
} = delivery;

const SHA256 = 'a'.repeat(64);
const expectation = {
  destination: 'MASTER',
  idempotencyKey: 'intent-key',
  assetSha256: SHA256,
  assetByteSize: 42_000,
};

function receipt(overrides = {}) {
  return {
    destination: 'MASTER',
    remoteReceiptId: 'master-receipt-1',
    idempotencyKey: 'intent-key',
    assetSha256: SHA256,
    assetByteSize: 42_000,
    authenticated: true,
    persisted: true,
    checksumVerified: true,
    metadataCommitted: true,
    processingQueued: true,
    ...overrides,
  };
}

test('delivery transitions are monotonic and READY is terminal', () => {
  assert.equal(canTransitionDelivery('PENDING', 'QUEUED'), true);
  assert.equal(canTransitionDelivery('QUEUED', 'TRANSFERRING'), true);
  assert.equal(canTransitionDelivery('TRANSFERRING', 'RECEIVED'), true);
  assert.equal(canTransitionDelivery('READY', 'QUEUED'), false);
  assert.equal(canTransitionDelivery('VERIFIED', 'PENDING'), false);
  assert.equal(requiresAuthenticatedReceipt('RECEIVED'), true);
  assert.equal(requiresAuthenticatedReceipt('VERIFIED'), true);
  assert.equal(requiresAuthenticatedReceipt('READY'), true);
  assert.equal(requiresAuthenticatedReceipt('TRANSFERRING'), false);
});

test('rejects unauthenticated and checksum-mismatched receipts', () => {
  assert.deepEqual(
    validateDeliveryReceipt(expectation, receipt({ authenticated: false })),
    { valid: false, reason: 'Receipt authentication has not been verified.' }
  );
  assert.deepEqual(
    validateDeliveryReceipt(expectation, receipt({ assetSha256: 'b'.repeat(64) })),
    { valid: false, reason: 'Receipt SHA-256 does not match the local asset.' }
  );
});

test('requires matching destination, idempotency key, and byte size', () => {
  assert.equal(
    validateDeliveryReceipt(expectation, receipt({ destination: 'CLOUD' })).valid,
    false
  );
  assert.equal(
    validateDeliveryReceipt(expectation, receipt({ idempotencyKey: 'wrong' })).valid,
    false
  );
  assert.equal(
    validateDeliveryReceipt(expectation, receipt({ assetByteSize: 41_999 })).valid,
    false
  );
});

test('requires destination-specific durable proof before READY', () => {
  assert.deepEqual(
    validateDeliveryReceipt(expectation, receipt({ processingQueued: false })),
    { valid: true, ready: false }
  );
  assert.deepEqual(validateDeliveryReceipt(expectation, receipt()), {
    valid: true,
    ready: true,
  });

  const kioskExpectation = { ...expectation, destination: 'KIOSK' };
  assert.deepEqual(
    validateDeliveryReceipt(
      kioskExpectation,
      receipt({
        destination: 'KIOSK',
        processingQueued: undefined,
        indexed: true,
        displayable: true,
      })
    ),
    { valid: true, ready: true }
  );

  const cloudExpectation = { ...expectation, destination: 'CLOUD' };
  assert.deepEqual(
    validateDeliveryReceipt(
      cloudExpectation,
      receipt({
        destination: 'CLOUD',
        processingQueued: undefined,
        published: true,
      })
    ),
    { valid: true, ready: true }
  );
});

test('idempotency identity is stable and content-bound', () => {
  const key = createDeliveryIdempotencyKey(
    'capture-1',
    'MASTER',
    'ORIGINAL',
    SHA256.toUpperCase()
  );
  assert.equal(
    key,
    createDeliveryIdempotencyKey('capture-1', 'MASTER', 'ORIGINAL', SHA256)
  );
  assert.notEqual(
    key,
    createDeliveryIdempotencyKey('capture-1', 'CLOUD', 'ORIGINAL', SHA256)
  );
});
