import { removeBackground } from '@imgly/background-removal-node';
import { logger } from '../utils/logger';
import fs from 'fs';

export class BackgroundRemovalService {
  async removeBackground(inputPath: string, outputPath: string): Promise<{ success: boolean; outputPath: string }> {
    try {
      const buffer = fs.readFileSync(inputPath);
      const resultBuffer = await this.removeBackgroundFromBuffer(buffer);
      fs.writeFileSync(outputPath, resultBuffer);
      return { success: true, outputPath };
    } catch (err: any) {
      logger.error(`[BackgroundRemovalService] Failed to remove background: ${err.message}`);
      throw err;
    }
  }

  async removeBackgroundFromBuffer(buffer: Buffer): Promise<Buffer> {
    try {
      // @imgly/background-removal-node accepts Buffer, Blob, etc. according to its docs.
      // Usually it can take a Blob or a Unit8Array/Buffer. 
      // The easiest way is to pass a Blob and convert the returned Blob back to Buffer.
      const blob = new Blob([buffer as any]);
      const resultBlob = await removeBackground(blob);
      const arrayBuffer = await resultBlob.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      logger.error(`[BackgroundRemovalService] Buffer processing failed: ${err.message}`);
      throw err;
    }
  }
}

export const backgroundRemovalService = new BackgroundRemovalService();
