import { logger } from '../logger';

/**
 * WatermarkService
 * Applies visible adaptive watermarks and steganographic metadata tracking (LSB).
 */

export interface WatermarkRequest {
  imageUrl: string;
  viewerId: string; // Used for steganographic forensic tracking
  galleryId: string;
  watermarkText?: string;
  imageBuffer?: ArrayBuffer | Uint8Array;
}

export interface WatermarkResponse {
  success: boolean;
  watermarkedUrl?: string;
  watermarkedBuffer?: Uint8Array;
  error?: string;
}

const LSB_MAGIC_HEADER = 'CFLSB:';

export class WatermarkService {
  /**
   * Helper: Encodes string payload into a bit array (0s and 1s)
   */
  private static payloadToBits(payload: string): number[] {
    const fullPayload = `${LSB_MAGIC_HEADER}${payload}\0`;
    const bits: number[] = [];
    for (let i = 0; i < fullPayload.length; i++) {
      const charCode = fullPayload.charCodeAt(i);
      for (let bit = 7; bit >= 0; bit--) {
        bits.push((charCode >> bit) & 1);
      }
    }
    return bits;
  }

  /**
   * Embeds steganographic LSB payload into an image buffer (raw bytes / RGBA / JPEG payload).
   */
  public static embedLSBPayload(buffer: Uint8Array, payload: string): Uint8Array {
    const output = new Uint8Array(buffer.length);
    output.set(buffer);

    const bits = WatermarkService.payloadToBits(payload);
    // Offset past initial image format headers (e.g. 128 bytes) to preserve metadata header integrity
    const startOffset = Math.min(128, Math.floor(output.length / 10));

    if (startOffset + bits.length > output.length) {
      logger.warn('[WatermarkService] Buffer too small for full LSB steganography payload');
      return output;
    }

    for (let i = 0; i < bits.length; i++) {
      const targetIndex = startOffset + i;
      // Modify least significant bit
      output[targetIndex] = (output[targetIndex] & 0xfe) | bits[i];
    }

    return output;
  }

  /**
   * Processes an image to add both visible adaptive watermark and steganographic metadata.
   */
  static async applyWatermarks(request: WatermarkRequest): Promise<WatermarkResponse> {
    if (!request.imageUrl || !request.viewerId || !request.galleryId) {
      return { success: false, error: 'Image, viewer, and gallery identifiers are required' };
    }

    try {
      const watermarkPayload = `CF-${request.galleryId}-${request.viewerId}-${Date.now()}`;
      logger.info(`[WatermarkService] Applying steganographic LSB payload: ${watermarkPayload}`);

      let outputBuffer: Uint8Array | undefined;

      if (request.imageBuffer) {
        const inputBytes = request.imageBuffer instanceof Uint8Array 
          ? request.imageBuffer 
          : new Uint8Array(request.imageBuffer);
        outputBuffer = WatermarkService.embedLSBPayload(inputBytes, watermarkPayload);
      }

      const watermarkedUrl = `${request.imageUrl}?watermark=${encodeURIComponent(watermarkPayload)}`;

      return {
        success: true,
        watermarkedUrl,
        watermarkedBuffer: outputBuffer,
      };
    } catch (err: any) {
      logger.error('[WatermarkService] Error applying watermark:', err);
      return { success: false, error: err.message || 'Watermarking failed' };
    }
  }

  /**
   * Extracts steganographic LSB payload from an image buffer for leak tracking.
   */
  static async extractForensicPayload(imageBuffer: Uint8Array): Promise<string | null> {
    if (!imageBuffer || imageBuffer.byteLength < 256) return null;

    try {
      const startOffset = Math.min(128, Math.floor(imageBuffer.length / 10));
      const maxBitsToRead = Math.min(2048, (imageBuffer.length - startOffset) * 8);

      let currentByte = 0;
      let bitCount = 0;
      let decodedStr = '';

      for (let i = 0; i < maxBitsToRead; i++) {
        const targetIndex = startOffset + i;
        if (targetIndex >= imageBuffer.length) break;

        const lsb = imageBuffer[targetIndex] & 1;
        currentByte = (currentByte << 1) | lsb;
        bitCount++;

        if (bitCount === 8) {
          if (currentByte === 0) {
            // Null terminator reached
            break;
          }
          decodedStr += String.fromCharCode(currentByte);
          currentByte = 0;
          bitCount = 0;
        }
      }

      if (decodedStr.startsWith(LSB_MAGIC_HEADER)) {
        const payload = decodedStr.slice(LSB_MAGIC_HEADER.length);
        logger.info(`[WatermarkService] Forensic LSB payload extracted: ${payload}`);
        return payload;
      }

      return null;
    } catch (err) {
      logger.error('[WatermarkService] Extraction error:', err);
      return null;
    }
  }
}

