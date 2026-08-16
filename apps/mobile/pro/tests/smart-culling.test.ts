import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as smartCullingModule from '../src/services/SmartCullingService.ts';

const { smartCullingService } = smartCullingModule;

const smartCullingSource = readFileSync(
  new URL('../src/services/SmartCullingService.ts', import.meta.url),
  'utf8'
);
const cameraTetherSource = readFileSync(
  new URL('../src/services/CameraTetherService.ts', import.meta.url),
  'utf8'
);

test('reports an explicit deterministic unavailable outcome without fabricated scores', async () => {
  const first = await smartCullingService.evaluatePhoto('file:///verified-photo.jpg');
  const second = await smartCullingService.evaluatePhoto('file:///verified-photo.jpg');

  assert.deepEqual(first, {
    status: 'ANALYSIS_UNAVAILABLE',
    reason: 'NO_DETERMINISTIC_PIXEL_ANALYZER',
  });
  assert.deepEqual(second, first);

  for (const fabricatedField of [
    'sharpness',
    'eyeOpennessScore',
    'smileScore',
    'exposureScore',
    'overallQuality',
    'autoStarRating',
    'isBlurry',
    'hasBlinks',
    'facesDetected',
    'isAcceptable',
  ]) {
    assert.equal(
      fabricatedField in first,
      false,
      `${fabricatedField} must not be fabricated.`
    );
  }
});

test('contains no random or model-readiness fallback scoring', () => {
  assert.equal(smartCullingSource.includes('Math.random'), false);
  assert.equal(smartCullingSource.includes('Fail-open default'), false);
  assert.equal(smartCullingSource.includes('Simulated Laplacian'), false);
  assert.equal(smartCullingSource.includes('@tensorflow'), false);
});

test('post-import verification and optional culling are outside the camera import retry loop', () => {
  const handlerStart = cameraTetherSource.indexOf('private async handleDetectedObject');
  const helperStart = cameraTetherSource.indexOf('private async evaluateCullingSafely');
  const handlerBody = cameraTetherSource.slice(handlerStart, helperStart);
  const retryLoopStart = handlerBody.indexOf(
    'for (let attempt = 1; attempt <= MAX_IMPORT_ATTEMPTS',
  );
  const verifiedIndex = handlerBody.indexOf('await captureLedgerService.markVerified');
  const retryLoopBody = handlerBody.slice(retryLoopStart, verifiedIndex);
  const deliveryIndex = handlerBody.indexOf(
    'await this.ensureOriginalDeliverySafely',
    verifiedIndex
  );
  const pairingIndex = handlerBody.indexOf(
    'await this.reconcilePairingSafely',
    deliveryIndex
  );
  const previewIndex = handlerBody.indexOf(
    'appState.tether.lastVerifiedPreview',
    pairingIndex
  );
  const cullingIndex = handlerBody.indexOf(
    'void this.evaluateCullingSafely',
    previewIndex
  );

  expect(handlerStart >= 0, 'The camera ingest handler must exist.');
  expect(helperStart > handlerStart, 'The safe culling helper must follow the ingest handler.');
  expect(retryLoopStart >= 0, 'The bounded camera import retry loop must exist.');
  expect(verifiedIndex >= 0, 'The imported original must be verified first.');
  expect(deliveryIndex > verifiedIndex, 'Original delivery must be retained after verification.');
  expect(pairingIndex > deliveryIndex, 'RAW/JPEG pairing must remain in the verified flow.');
  expect(previewIndex > pairingIndex, 'The verified preview must be published before culling.');
  expect(cullingIndex > previewIndex, 'Culling must run only after verified ingest is published.');
  assert.equal(retryLoopBody.includes('markVerified'), false);
  assert.equal(retryLoopBody.includes('ensureOriginalDeliverySafely'), false);
  assert.equal(retryLoopBody.includes('evaluateCullingSafely'), false);
  assert.equal(handlerBody.includes('await smartCullingService.evaluatePhoto'), false);

  const helperEnd = cameraTetherSource.indexOf('\n  private ', helperStart + 1);
  const helperBody = cameraTetherSource.slice(helperStart, helperEnd);
  assert.match(helperBody, /try\s*\{/);
  assert.match(helperBody, /await smartCullingService\.evaluatePhoto\(localUri\)/);
  assert.match(helperBody, /catch \(error\)/);
});
