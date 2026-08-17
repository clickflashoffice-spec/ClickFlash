import { describe, it, expect } from 'vitest';
import { highSpeedOpticalFlowService } from '../HighSpeedOpticalFlowService';

describe('HighSpeedOpticalFlowService', () => {
  it('calculates velocity vectors scaled to coaster speed and angle', () => {
    const vectorStraight = highSpeedOpticalFlowService.calculateVelocityVector(108, 0);
    expect(vectorStraight.magnitude).toBeGreaterThan(0);
    expect(vectorStraight.x).toBeGreaterThan(0);
    expect(vectorStraight.y).toBe(0);

    const vectorAngled = highSpeedOpticalFlowService.calculateVelocityVector(108, 45);
    expect(vectorAngled.x).toBeGreaterThan(0);
    expect(vectorAngled.y).toBeGreaterThan(0);
  });

  it('processes high speed burst frames and selects peak coherence frame', () => {
    const rawFrames = [
      { frameIndex: 0, timestampMicroseconds: 1000, rawSharpnessScore: 65 },
      { frameIndex: 1, timestampMicroseconds: 1500, rawSharpnessScore: 92 },
      { frameIndex: 2, timestampMicroseconds: 2000, rawSharpnessScore: 78 }
    ];

    const result = highSpeedOpticalFlowService.processCaptureBurst('coaster-hero-44', rawFrames, {
      coasterSpeedKmh: 120
    });

    expect(result.photoId).toBe('coaster-hero-44');
    expect(result.framesProcessed).toBe(3);
    expect(result.peakCoherenceFrame.frameIndex).toBe(1);
    expect(result.peakCoherenceFrame.coherenceConfidence).toBeGreaterThan(0.8);
    expect(result.deblurImprovementPercent).toBeGreaterThan(0);
  });
});
