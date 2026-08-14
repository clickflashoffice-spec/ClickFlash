import sharp from 'sharp';
import { encode } from 'blurhash';
import { logger } from '@clickflash/logger';

export interface BlurhashResult {
  hash: string;
  width: number;
  height: number;
}

export class BlurhashService {
  /**
   * Generates a Blurhash string from an image filepath or Buffer.
   * Resizes internally to a small dimension (default 32x32) for fast calculation.
   */
  public static async generateBlurhash(
    input: string | Buffer,
    componentX = 4,
    componentY = 3
  ): Promise<string | null> {
    try {
      // Resize to max 32x32 preserving aspect ratio, then get raw RGBA pixels
      const { data, info } = await sharp(input, { failOn: 'none' })
        .resize(32, 32, { fit: 'inside' })
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

      const uint8ClampedArray = new Uint8ClampedArray(data);
      const hash = encode(uint8ClampedArray, info.width, info.height, componentX, componentY);
      return hash;
    } catch (error) {
      logger.warn('[BlurhashService] Failed to generate blurhash:', error);
      return null;
    }
  }
}
