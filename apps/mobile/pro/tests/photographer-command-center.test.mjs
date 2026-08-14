import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { Buffer } from 'node:buffer';

import model from '../src/services/PhotographerCommandCenterModel.ts';
import responseVerifier from '../src/services/PhotographerCommandCenterResponse.ts';
import protocol from '../src/services/MasterCaptureProtocol.ts';

const {
  UNAVAILABLE_METRIC,
  formatBasisPoints,
  formatMinorUnits,
  targetProgressBps,
} = model;
const { parseVerifiedCommandCenterResponse } = responseVerifier;
const {
  MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL,
  MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
  MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
  canonicalMobileCommandCenterEncryptionKeyInfo,
  canonicalMobileCommandCenterResponse,
  canonicalMobileCommandCenterResponseAad,
} = protocol;

test('formats integer minor units using the producer currency exponent', () => {
  assert.match(formatMinorUnits(125500, 'TND', 3, 'en'), /125\.500/);
  assert.match(formatMinorUnits(12550, 'USD', 2, 'en'), /125\.50/);
  assert.match(formatMinorUnits(125, 'JPY', 0, 'en'), /125/);
  assert.equal(formatMinorUnits(null, 'TND', 3, 'en'), UNAVAILABLE_METRIC);
});

test('keeps unavailable metrics distinct from zero and bounds progress', () => {
  assert.equal(formatBasisPoints(null), UNAVAILABLE_METRIC);
  assert.equal(formatBasisPoints(0), '0.0%');
  assert.equal(targetProgressBps(50, null), null);
  assert.equal(targetProgressBps(50, 100), 5000);
  assert.equal(targetProgressBps(150, 100), 10000);
});

function snapshotFixture() {
  return {
    schemaVersion: '1',
    generatedAt: '2026-08-03T10:00:00.000Z',
    source: 'MASTER',
    scope: {
      photographerId: '1',
      deskId: 'desk-1',
      timezone: 'Africa/Tunis',
      currency: 'TND',
      currencyExponent: 3,
      from: '2026-08-03',
      toExclusive: '2026-08-04',
    },
    sync: {
      sourceWatermark: 'master:test',
      lastHubSyncAt: null,
      stale: false,
      pendingEventCount: 0,
    },
    shift: {
      state: 'UNKNOWN',
      clockedInAt: null,
      workedSecondsToday: null,
      verification: 'UNAVAILABLE',
    },
    activity: {
      capturesReceived: null,
      photosCatalogued: 2,
      photosEdited: null,
      photosDelivered: null,
      distinctPhotosSold: 1,
      qualityFlagged: 0,
    },
    sales: {
      completedOrders: 1,
      grossMinor: 12500,
      tipsMinor: 0,
      averageOrderMinor: 12500,
      settledMinor: null,
      refundMinor: null,
      netMinor: null,
    },
    earnings: {
      commissionMinor: null,
      salaryMinor: null,
      bonusMinor: null,
      deductionMinor: null,
      paidOutMinor: null,
      payableMinor: null,
    },
    performance: {
      revenueTargetMinor: null,
      photoTarget: null,
      meetingsTaken: null,
      meetingsMade: null,
      meetingConversionBps: null,
      photoSellThroughBps: 5000,
      averageSessionSeconds: null,
    },
    daily: [
      {
        date: '2026-08-03',
        grossMinor: 12500,
        orders: 1,
        photosCatalogued: 2,
        distinctPhotosSold: 1,
        workedSeconds: null,
      },
    ],
    completeness: {
      sales: 'PROVISIONAL',
      settlement: 'UNAVAILABLE',
      earnings: 'UNAVAILABLE',
      shifts: 'UNAVAILABLE',
      issues: ['SETTLEMENT_EVENTS_UNAVAILABLE'],
    },
  };
}

function sealResponse(secret, identity, plaintext) {
  const key = Buffer.from(
    crypto.hkdfSync(
      'sha256',
      secret,
      Buffer.alloc(0),
      Buffer.from(canonicalMobileCommandCenterEncryptionKeyInfo(identity)),
      32
    )
  );
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: 16,
  });
  cipher.setAAD(Buffer.from(canonicalMobileCommandCenterResponseAad(identity)));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return {
    protocol: MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
    algorithm: MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptResponse(secret, envelope, keyInfo, aad) {
  const key = Buffer.from(
    crypto.hkdfSync(
      'sha256',
      secret,
      Buffer.alloc(0),
      Buffer.from(keyInfo),
      32
    )
  );
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(envelope.iv, 'base64'),
    { authTagLength: 16 }
  );
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function signedResponseInput(secret, identity, plaintext) {
  const responseText = JSON.stringify(sealResponse(secret, identity, plaintext));
  const bodySha256 = crypto.createHash('sha256').update(responseText).digest('hex');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(canonicalMobileCommandCenterResponse(identity, bodySha256))
    .digest('base64');
  return {
    responseText,
    responseProtocol: MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL,
    encryptionProtocol: MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
    keyEpoch: identity.keyEpoch,
    declaredSha256: bodySha256,
    computedSha256: bodySha256,
    signature,
    identity,
    verifySignature: (message, candidate) =>
      crypto.createHmac('sha256', secret).update(message).digest('base64') === candidate,
    decryptEnvelope: (envelope, keyInfo, aad) =>
      decryptResponse(secret, envelope, keyInfo, aad),
  };
}

test('authenticates and decrypts the strict AEAD response before schema validation', async () => {
  const secret = Buffer.from('command-center-test-secret');
  const identity = {
    masterId: 'master-1',
    deviceId: 'android-test-device',
    encryptionProtocol: MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
    keyEpoch: '1770000000000',
    timestamp: '1770000000000',
    nonce: 'abcdefghijklmnop',
    period: 'TODAY',
  };
  const base = signedResponseInput(
    secret,
    identity,
    JSON.stringify(snapshotFixture())
  );

  assert.deepEqual(await parseVerifiedCommandCenterResponse(base), snapshotFixture());
  const tamperedCiphertextBase = JSON.parse(base.responseText);
  tamperedCiphertextBase.ciphertext = `${tamperedCiphertextBase.ciphertext.startsWith('A') ? 'B' : 'A'}${tamperedCiphertextBase.ciphertext.slice(1)}`;
  const tamperedCiphertextStr = JSON.stringify(tamperedCiphertextBase);

  await assert.rejects(
    () =>
      parseVerifiedCommandCenterResponse({
        ...base,
        responseText: tamperedCiphertextStr,
        computedSha256: crypto
          .createHash('sha256')
          .update(tamperedCiphertextStr)
          .digest('hex'),
      }),
    /authentication failed/
  );
  await assert.rejects(
    () => parseVerifiedCommandCenterResponse({ ...base, signature: 'wrong' }),
    /authentication failed/
  );

  const plaintextDowngrade = JSON.stringify(snapshotFixture());
  const downgradeHash = crypto
    .createHash('sha256')
    .update(plaintextDowngrade)
    .digest('hex');
  await assert.rejects(
    () =>
      parseVerifiedCommandCenterResponse({
        ...base,
        responseText: plaintextDowngrade,
        declaredSha256: downgradeHash,
        computedSha256: downgradeHash,
        signature: crypto
          .createHmac('sha256', secret)
          .update(canonicalMobileCommandCenterResponse(identity, downgradeHash))
          .digest('base64'),
      }),
    /authentication failed/
  );

  const envelope = JSON.parse(base.responseText);
  envelope.tag = `${envelope.tag.startsWith('A') ? 'B' : 'A'}${envelope.tag.slice(1)}`;
  const tamperedText = JSON.stringify(envelope);
  const tamperedHash = crypto.createHash('sha256').update(tamperedText).digest('hex');
  await assert.rejects(
    () =>
      parseVerifiedCommandCenterResponse({
        ...base,
        responseText: tamperedText,
        declaredSha256: tamperedHash,
        computedSha256: tamperedHash,
        signature: crypto
          .createHmac('sha256', secret)
          .update(canonicalMobileCommandCenterResponse(identity, tamperedHash))
          .digest('base64'),
      }),
    /authentication failed/
  );

  const invalidText = JSON.stringify({ ...snapshotFixture(), schemaVersion: '2' });
  await assert.rejects(
    () => parseVerifiedCommandCenterResponse(signedResponseInput(secret, identity, invalidText)),
    /invalid command-center snapshot/
  );

  const replayIdentity = { ...identity, nonce: 'qrstuvwxyzabcdef' };
  const replayHash = base.computedSha256;
  await assert.rejects(
    () =>
      parseVerifiedCommandCenterResponse({
        ...base,
        identity: replayIdentity,
        signature: crypto
          .createHmac('sha256', secret)
          .update(canonicalMobileCommandCenterResponse(replayIdentity, replayHash))
          .digest('base64'),
      }),
    /authentication failed/
  );
});
