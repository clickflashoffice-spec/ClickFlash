// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';

import protocol from '../src/services/MasterCaptureProtocol.ts';

const {
  canonicalMasterCaptureReceipt,
  canonicalMobileCommandCenterEncryptionKeyInfo,
  canonicalMobileCommandCenterRequest,
  canonicalMobileCommandCenterResponse,
  canonicalMobileCommandCenterResponseAad,
  canonicalMobileCaptureRequest,
  EMPTY_SHA256,
  pairingRequestMessage,
  pairingResponseMessage,
} = protocol;

test('command-center transcripts are domain-separated and nonce-bound', () => {
  const identity = {
    masterId: 'master-desk-01',
    deviceId: 'android-test-device',
    encryptionProtocol: 'CF-AEAD-V1',
    keyEpoch: '1769999999999',
    timestamp: '1770000000000',
    nonce: 'abcdefghijklmnop',
    period: '30D',
  };
  assert.equal(
    canonicalMobileCommandCenterRequest(identity),
    [
      'CF-MOBILE-COMMAND-CENTER-REQUEST-V2',
      'GET',
      '/api/v1/mobile-capture/photographer/me/command-center',
      'CF-AEAD-V1',
      'master-desk-01',
      'android-test-device',
      '1769999999999',
      '1770000000000',
      'abcdefghijklmnop',
      '30D',
    ].join('\n')
  );
  assert.equal(
    canonicalMobileCommandCenterResponse(identity, 'A'.repeat(64)),
    [
      'CF-MOBILE-COMMAND-CENTER-ENCRYPTED-RESPONSE-V1',
      '200',
      'CF-AEAD-V1',
      'master-desk-01',
      'android-test-device',
      '1769999999999',
      'abcdefghijklmnop',
      'a'.repeat(64),
    ].join('\n')
  );
  assert.match(
    canonicalMobileCommandCenterEncryptionKeyInfo(identity),
    /MASTER_TO_MOBILE\nmaster-desk-01\nandroid-test-device/
  );
  assert.match(
    canonicalMobileCommandCenterResponseAad(identity),
    /A256GCM\nCOMMAND_CENTER_RESPONSE\nMASTER_TO_MOBILE/
  );
});

test('mobile request canonicalization is stable and lowercases digests', () => {
  assert.equal(
    canonicalMobileCaptureRequest({
      operation: 'STATUS',
      encryptionProtocol: 'CF-AEAD-V1',
      deviceId: 'android-test-device',
      keyEpoch: '1769999999999',
      timestamp: '1770000000000',
      nonce: 'abcdefghijklmnop',
      idempotencyKey: 'cf2:test',
      contentSha256: EMPTY_SHA256.toUpperCase(),
      assetSha256: 'A'.repeat(64),
      assetByteSize: '1234',
      offset: '0',
      assetRole: 'ORIGINAL',
    }),
    [
      'CF-MOBILE-V1',
      'STATUS',
      'CF-AEAD-V1',
      'android-test-device',
      '1769999999999',
      '1770000000000',
      'abcdefghijklmnop',
      'cf2:test',
      EMPTY_SHA256,
      'a'.repeat(64),
      '1234',
      '0',
      'ORIGINAL',
    ].join('\n')
  );
});

test('pairing transcripts bind both keys, device, code id, and Master id', () => {
  assert.equal(
    pairingRequestMessage('code-id', 'device-id', 'client-key'),
    'CF-PAIR-V1\ncode-id\ndevice-id\nclient-key'
  );
  assert.equal(
    pairingResponseMessage(
      'code-id',
      'device-id',
      'client-key',
      'server-key',
      'master-id'
    ),
    [
      'CF-PAIR-RESPONSE-V1',
      'code-id',
      'device-id',
      'client-key',
      'server-key',
      'master-id',
    ].join('\n')
  );
});

test('receipt canonicalization binds every readiness proof bit', () => {
  assert.equal(
    canonicalMasterCaptureReceipt({
      destination: 'MASTER',
      remoteReceiptId: 'master-receipt',
      idempotencyKey: 'cf2:test',
      assetSha256: 'B'.repeat(64),
      assetByteSize: 99,
      persisted: true,
      checksumVerified: true,
      metadataCommitted: true,
      processingQueued: false,
    }),
    [
      'CF-RECEIPT-V1',
      'MASTER',
      'master-receipt',
      'cf2:test',
      'b'.repeat(64),
      '99',
      '1',
      '1',
      '1',
      '0',
    ].join('\n')
  );
});
