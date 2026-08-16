import assert from 'node:assert/strict';
import test from 'node:test';

import * as registryModule from '../src/services/CameraCapabilityRegistry.ts';

const {
  CAMERA_CAPABILITIES,
  createCameraCapabilityRegistry,
  deserializeCameraCapabilityRegistry,
  recordCameraCapabilityEvidence,
  serializeCameraCapabilityRegistry,
  summarizeCameraCapabilities,
} = registryModule;

function evidence(overrides = {}) {
  return {
    evidenceId: 'field-run-001',
    capability: 'REMOTE_SHUTTER',
    kind: 'OBSERVED',
    result: 'SUPPORTED',
    recordedAt: 1_785_456_000_000,
    source: 'RUNTIME_PROBE',
    artifactId: null,
    ...overrides,
  };
}

function d7000Registry(records = []) {
  return createCameraCapabilityRegistry(
    {
      vendorId: 0x04b0,
      productId: 0x0428,
      manufacturerName: 'NIKON CORPORATION',
      productName: 'NIKON D7000',
    },
    records
  );
}

test('unknown cameras and every capability are unverified by default', () => {
  const summary = summarizeCameraCapabilities(
    createCameraCapabilityRegistry({ vendorId: 0x1234, productName: 'Camera' })
  );

  assert.equal(summary.identity.recognition, 'UNKNOWN');
  assert.equal(summary.identity.modelId, 'UNKNOWN');
  assert.equal(summary.identity.displayName, 'Unknown camera');
  assert.equal(summary.capabilities.length, CAMERA_CAPABILITIES.length);
  expect(summary.capabilities.every((item) => item.status === 'UNVERIFIED'));
  expect(summary.capabilities.every((item) => item.isSupported === false));
  assert.deepEqual(summary.allowedRemoteCommands, []);
});

test('recognizing Nikon D7000 identity grants no capability or remote command', () => {
  const summary = summarizeCameraCapabilities(d7000Registry());

  assert.deepEqual(summary.identity, {
    recognition: 'RECOGNIZED',
    modelId: 'NIKON_D7000',
    displayName: 'Nikon D7000',
  });
  assert.equal(
    summary.capabilities.find((item) => item.capability === 'REMOTE_SHUTTER')?.status,
    'UNVERIFIED'
  );
  assert.deepEqual(summary.allowedRemoteCommands, []);
});

test('a D7000-looking product from an untrusted manufacturer remains unknown', () => {
  const summary = summarizeCameraCapabilities(
    createCameraCapabilityRegistry({
      vendorId: 0x1234,
      manufacturerName: 'Example Corp',
      productName: 'D7000',
    })
  );

  assert.equal(summary.identity.recognition, 'UNKNOWN');
});

test('observed command support is explicit and is not presented as certification', () => {
  const summary = summarizeCameraCapabilities(
    d7000Registry([evidence()])
  );
  const shutter = summary.capabilities.find(
    (item) => item.capability === 'REMOTE_SHUTTER'
  );

  assert.equal(shutter?.status, 'OBSERVED_SUPPORTED');
  assert.equal(shutter?.isSupported, true);
  assert.equal(shutter?.isCertified, false);
  assert.deepEqual(summary.allowedRemoteCommands, []);
});

test('only certified-supported evidence unlocks a remote command', () => {
  const summary = summarizeCameraCapabilities(
    d7000Registry([
      evidence({
        evidenceId: 'lab-cert-supported-001',
        kind: 'CERTIFIED',
        source: 'COMPATIBILITY_LAB',
        artifactId: 'd7000-lab-report-supported-001',
      }),
    ])
  );
  const shutter = summary.capabilities.find(
    (item) => item.capability === 'REMOTE_SHUTTER'
  );

  assert.equal(shutter?.status, 'CERTIFIED_SUPPORTED');
  assert.equal(shutter?.isSupported, true);
  assert.equal(shutter?.isCertified, true);
  assert.deepEqual(summary.allowedRemoteCommands, ['REMOTE_SHUTTER']);
});

test('certified evidence is distinct and can conservatively deny an observed command', () => {
  const registry = d7000Registry([
    evidence(),
    evidence({
      evidenceId: 'lab-cert-001',
      kind: 'CERTIFIED',
      result: 'UNSUPPORTED',
      recordedAt: 1_785_456_100_000,
      source: 'COMPATIBILITY_LAB',
      artifactId: 'd7000-lab-report-001',
    }),
  ]);
  const shutter = summarizeCameraCapabilities(registry).capabilities.find(
    (item) => item.capability === 'REMOTE_SHUTTER'
  );

  assert.equal(shutter?.status, 'CERTIFIED_UNSUPPORTED');
  assert.equal(shutter?.isSupported, false);
  assert.equal(shutter?.isCertified, true);
  assert.deepEqual(summarizeCameraCapabilities(registry).allowedRemoteCommands, []);
});

test('serialization is canonical, versioned, and independent of evidence order', () => {
  const first = evidence({ capability: 'RAW_IMPORT', evidenceId: 'field-raw-001' });
  const second = evidence({ capability: 'JPEG_IMPORT', evidenceId: 'field-jpeg-001' });
  const forward = d7000Registry([first, second]);
  const reverse = d7000Registry([second, first]);
  const serialized = serializeCameraCapabilityRegistry(forward);

  assert.equal(serialized, serializeCameraCapabilityRegistry(reverse));
  assert.equal(
    serializeCameraCapabilityRegistry(deserializeCameraCapabilityRegistry(serialized)),
    serialized
  );
  const unsupportedVersion = JSON.parse(serialized);
  unsupportedVersion.version = 2;
  expect(
    () => deserializeCameraCapabilityRegistry(JSON.stringify(unsupportedVersion)),
    /version is unsupported/
  );
});

test('summary is deeply read-only and excludes raw evidence and device strings', () => {
  const summary = summarizeCameraCapabilities(d7000Registry([evidence()]));
  const serializedSummary = JSON.stringify(summary);

  expect(Object.isFrozen(summary));
  expect(Object.isFrozen(summary.identity));
  expect(Object.isFrozen(summary.capabilities));
  expect(summary.capabilities.every(Object.isFrozen));
  expect(Object.isFrozen(summary.allowedRemoteCommands));
  expect(() => summary.allowedRemoteCommands.push('LIVE_VIEW'), TypeError);
  assert.equal(serializedSummary.includes('field-run-001'), false);
  assert.equal(serializedSummary.includes('NIKON CORPORATION'), false);
});

test('evidence validation rejects duplicates and certification without an artifact', () => {
  expect(
    () => d7000Registry([evidence(), evidence()]),
    /Duplicate camera capability evidenceId/
  );
  expect(
    () => recordCameraCapabilityEvidence(
      d7000Registry(),
      evidence({
        evidenceId: 'lab-cert-missing-artifact',
        kind: 'CERTIFIED',
        source: 'COMPATIBILITY_LAB',
      })
    ),
    /requires an artifactId/
  );
});
