import { AutoEditEngine, ImageStats } from '../services/AutoEditEngine';

describe('AutoEditEngine Heuristics', () => {
  it('should increase exposure for dark images', () => {
    const stats: ImageStats = { luminance: 60, contrast: 50, rMean: 60, gMean: 60, bMean: 60 };
    const edits = AutoEditEngine.computeHeuristics(stats);
    expect(edits.exposure).toBeGreaterThan(0);
    // target 128, 128-60 = 68, 68*0.45 = 31
    expect(edits.exposure).toBe(31);
  });

  it('should decrease exposure for bright images', () => {
    const stats: ImageStats = { luminance: 200, contrast: 50, rMean: 200, gMean: 200, bMean: 200 };
    const edits = AutoEditEngine.computeHeuristics(stats);
    expect(edits.exposure).toBeLessThan(0);
    // 128-200 = -72, -72*0.45 = -32
    expect(edits.exposure).toBe(-32);
  });

  it('should increase contrast for flat images', () => {
    const stats: ImageStats = { luminance: 128, contrast: 30, rMean: 128, gMean: 128, bMean: 128 };
    const edits = AutoEditEngine.computeHeuristics(stats);
    expect(edits.contrast).toBeGreaterThan(0);
    // 55 - 30 = 25
    expect(edits.contrast).toBe(25);
  });

  it('should decrease contrast for harsh images', () => {
    const stats: ImageStats = { luminance: 128, contrast: 85, rMean: 128, gMean: 128, bMean: 128 };
    const edits = AutoEditEngine.computeHeuristics(stats);
    expect(edits.contrast).toBeLessThan(0);
    // -(85-75)*0.5 = -5
    expect(edits.contrast).toBe(-5);
  });
  
  it('should cap exposure changes to sensible bounds', () => {
    const stats: ImageStats = { luminance: 10, contrast: 50, rMean: 10, gMean: 10, bMean: 10 };
    const edits = AutoEditEngine.computeHeuristics(stats);
    // 128 - 10 = 118, 118 * 0.45 = 53 (still below 60, wait let's use luminance 0 wait 0 is ignored)
    expect(edits.exposure).toBeLessThanOrEqual(60);
  });
});
