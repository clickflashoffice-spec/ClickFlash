import assert from 'node:assert/strict';
import test from 'node:test';

import model from '../src/services/SpotIntelligenceModel.ts';

const {
  MIN_SPOT_PROFILE_SAMPLES,
  buildSpotRecommendation,
  confidenceFromGpsAccuracy,
  getSpotTimeBucket,
} = model;

test('GPS-only resolution is confidence capped and requires corroboration', () => {
  assert.equal(confidenceFromGpsAccuracy(10), 0.55);
  assert.equal(confidenceFromGpsAccuracy(50), 0.45);
  assert.equal(confidenceFromGpsAccuracy(500), 0.25);
});

test('cold-start profiles never recommend a camera change', () => {
  const recommendation = buildSpotRecommendation({
    sampleCount: MIN_SPOT_PROFILE_SAMPLES - 1,
    averagePoseQuality: 0.9,
    blurRate: 0.4,
    blinkRate: 0.2,
  });

  assert.equal(recommendation.kind, 'COLLECT');
  assert.equal(recommendation.profileReady, false);
  assert.equal(recommendation.confidence, 0);
});

test('blur guardrail outranks lower-severity coaching after minimum samples', () => {
  const recommendation = buildSpotRecommendation({
    sampleCount: 20,
    averagePoseQuality: 0.6,
    blurRate: 0.25,
    blinkRate: 0.2,
  });

  assert.equal(recommendation.kind, 'SHUTTER');
  assert.equal(recommendation.profileReady, true);
  assert.match(recommendation.reason, /25%/);
});

test('stable local quality produces a hold recommendation', () => {
  const recommendation = buildSpotRecommendation({
    sampleCount: 30,
    averagePoseQuality: 0.9,
    blurRate: 0.05,
    blinkRate: 0.04,
  });

  assert.equal(recommendation.kind, 'HOLD');
  assert.ok(recommendation.confidence >= 0.55);
});

test('time buckets are deterministic local-time categories', () => {
  const timestamp = new Date(2026, 6, 31, 18, 30, 0, 0).getTime();
  assert.equal(getSpotTimeBucket(timestamp), 'GOLDEN_HOUR');
});
