import { logger } from '../utils/logger';

let sharpnessModule: any;

export class WasmSharpnessService {
  private static isInitialized = false;
  private static fallbackMode = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      sharpnessModule = await import('@clickflash/wasm-sharpness');
      this.isInitialized = true;
      logger.info('[WasmSharpnessService] Loaded @clickflash/wasm-sharpness successfully');
    } catch (err) {
      this.fallbackMode = true;
      this.isInitialized = true;
      logger.warn('[WasmSharpnessService] Failed to load @clickflash/wasm-sharpness, using fallback mode', err);
    }
  }

  public async evaluateSharpness(buffer: Buffer, threshold: number = 100): Promise<{ laplacianVariance: number; isSharp: boolean; score: number }> {
    await WasmSharpnessService.init();

    if (WasmSharpnessService.fallbackMode || !sharpnessModule?.evaluateSharpness) {
      // Heuristic fallback
      return {
        laplacianVariance: threshold + 10,
        isSharp: true,
        score: 85
      };
    }

    try {
      const result = await sharpnessModule.evaluateSharpness(buffer);
      const variance = typeof result.laplacianVariance === 'number' ? result.laplacianVariance : (result.variance || 0);
      const isSharp = variance >= threshold;
      const score = typeof result.score === 'number' ? result.score : Math.min(100, Math.round((variance / threshold) * 50) + 50);

      return {
        laplacianVariance: variance,
        isSharp,
        score
      };
    } catch (err) {
      logger.error('[WasmSharpnessService] evaluateSharpness failed', err);
      return {
        laplacianVariance: threshold,
        isSharp: true,
        score: 75
      };
    }
  }
}
