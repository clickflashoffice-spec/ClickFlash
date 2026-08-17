import { describe, it, expect } from 'vitest';
import { BiometricLivenessEngine } from '../BiometricLivenessEngine';

describe('BiometricLivenessEngine', () => {
  it('confirms genuine 3D facial liveness when depth variance and blink score are normal', () => {
    // Simulated genuine 3D facial depth points (nose, cheekbones, eye sockets)
    const genuine3DDepthMap = [0.45, 0.48, 0.52, 0.41, 0.38, 0.55, 0.49, 0.44, 0.51, 0.47, 0.43, 0.50];
    const result = BiometricLivenessEngine.verifyLiveness(genuine3DDepthMap, 0.92);

    expect(result.isLive).toBe(true);
    expect(result.confidenceScore).toBeGreaterThan(0.95);
    expect(result.blinkDetected).toBe(true);
    expect(result.spoofTypeDetected).toBe('NONE');
    expect(result.depthMapVariance).toBeGreaterThan(0.001);
  });

  it('detects and flags 2D printed photo spoofing on flat surfaces', () => {
    // Flat 2D planar depth values with near-zero variance
    const flat2DPhotoDepthMap = [0.50, 0.50, 0.501, 0.50, 0.499, 0.50, 0.50, 0.501, 0.50, 0.50];
    const result = BiometricLivenessEngine.verifyLiveness(flat2DPhotoDepthMap, 0.95);

    expect(result.isLive).toBe(false);
    expect(result.spoofTypeDetected).toBe('PRINTED_2D_PHOTO');
    expect(result.confidenceScore).toBeLessThan(0.5);
  });

  it('detects motionless latex mask spoofing when blinking is absent', () => {
    const genuine3DDepthMap = [0.45, 0.48, 0.52, 0.41, 0.38, 0.55, 0.49, 0.44, 0.51, 0.47, 0.43, 0.50];
    const result = BiometricLivenessEngine.verifyLiveness(genuine3DDepthMap, 0.15); // Blink score below threshold

    expect(result.isLive).toBe(false);
    expect(result.spoofTypeDetected).toBe('LATEX_MASK');
  });
});
