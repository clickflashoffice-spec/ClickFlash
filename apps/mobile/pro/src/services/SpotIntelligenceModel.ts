export const MIN_SPOT_PROFILE_SAMPLES = 12;

export type SpotTimeBucket =
  | 'DAWN'
  | 'MORNING'
  | 'MIDDAY'
  | 'AFTERNOON'
  | 'GOLDEN_HOUR'
  | 'EVENING';

export type SpotRecommendationKind =
  | 'COLLECT'
  | 'SHUTTER'
  | 'EYE_CHECK'
  | 'POSE'
  | 'HOLD';

export interface SpotAggregate {
  sampleCount: number;
  averagePoseQuality: number;
  blurRate: number;
  blinkRate: number;
}

export interface SpotRecommendation {
  id: string;
  kind: SpotRecommendationKind;
  title: string;
  guidance: string;
  reason: string;
  confidence: number;
  supportingSampleCount: number;
  expectedImprovement: string;
  profileReady: boolean;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getSpotTimeBucket(timestamp: number): SpotTimeBucket {
  const hour = new Date(timestamp).getHours();
  if (hour < 7) return 'DAWN';
  if (hour < 11) return 'MORNING';
  if (hour < 15) return 'MIDDAY';
  if (hour < 18) return 'AFTERNOON';
  if (hour < 20) return 'GOLDEN_HOUR';
  return 'EVENING';
}

export function confidenceFromGpsAccuracy(accuracyMeters: number): number {
  if (!Number.isFinite(accuracyMeters) || accuracyMeters <= 0) return 0.25;
  if (accuracyMeters <= 20) return 0.55;
  if (accuracyMeters <= 75) return 0.45;
  if (accuracyMeters <= 200) return 0.35;
  return 0.25;
}

export function buildSpotRecommendation(aggregate: SpotAggregate): SpotRecommendation {
  const sampleCount = Math.max(0, Math.floor(aggregate.sampleCount));
  if (sampleCount < MIN_SPOT_PROFILE_SAMPLES) {
    const remaining = MIN_SPOT_PROFILE_SAMPLES - sampleCount;
    return {
      id: `collect:${sampleCount}`,
      kind: 'COLLECT',
      title: 'Cold-start profile',
      guidance: `Collect ${remaining} more verified capture${remaining === 1 ? '' : 's'} here.`,
      reason: 'Scout does not recommend camera changes from an undersized sample.',
      confidence: 0,
      supportingSampleCount: sampleCount,
      expectedImprovement: 'No automatic change',
      profileReady: false,
    };
  }

  const confidence = clamp(0.55 + sampleCount / 100, 0.55, 0.92);
  if (aggregate.blurRate >= 0.18) {
    return {
      id: `shutter:${sampleCount}:${Math.round(aggregate.blurRate * 100)}`,
      kind: 'SHUTTER',
      title: 'Protect shutter speed',
      guidance: 'Use a faster shutter or stabilize before the next capture.',
      reason: `${Math.round(aggregate.blurRate * 100)}% of verified captures here were flagged for blur.`,
      confidence,
      supportingSampleCount: sampleCount,
      expectedImprovement: 'Lower motion-blur risk',
      profileReady: true,
    };
  }

  if (aggregate.blinkRate >= 0.12) {
    return {
      id: `eyes:${sampleCount}:${Math.round(aggregate.blinkRate * 100)}`,
      kind: 'EYE_CHECK',
      title: 'Add an eye-check beat',
      guidance: 'Pause briefly after directing the group, then capture a short safety burst.',
      reason: `${Math.round(aggregate.blinkRate * 100)}% of verified captures here included a blink flag.`,
      confidence,
      supportingSampleCount: sampleCount,
      expectedImprovement: 'Fewer blink rejects',
      profileReady: true,
    };
  }

  if (aggregate.averagePoseQuality < 0.75) {
    return {
      id: `pose:${sampleCount}:${Math.round(aggregate.averagePoseQuality * 100)}`,
      kind: 'POSE',
      title: 'Re-center the pose',
      guidance: 'Confirm shoulder alignment and edge clearance before the next frame.',
      reason: `Average local pose quality is ${Math.round(aggregate.averagePoseQuality * 100)}%.`,
      confidence,
      supportingSampleCount: sampleCount,
      expectedImprovement: 'Safer crops and alignment',
      profileReady: true,
    };
  }

  return {
    id: `hold:${sampleCount}`,
    kind: 'HOLD',
    title: 'Keep the current setup',
    guidance: 'Quality is stable here; preserve the current position and capture rhythm.',
    reason: 'Blur, blink, and pose signals are inside the local safety guardrails.',
    confidence,
    supportingSampleCount: sampleCount,
    expectedImprovement: 'Maintain consistent quality',
    profileReady: true,
  };
}

const spotIntelligenceModel = {
  MIN_SPOT_PROFILE_SAMPLES,
  buildSpotRecommendation,
  confidenceFromGpsAccuracy,
  getSpotTimeBucket,
};

export default spotIntelligenceModel;
