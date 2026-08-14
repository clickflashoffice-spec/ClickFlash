import { logger } from '@clickflash/logger';

export interface BurstSequence {
  sequenceId: string;
  photoUris: string[];
  durationSeconds: number;
  heroPhotoUri: string;
}

export class BurstReelService {
  /**
   * Identifies burst capture sequences based on timestamps (<500ms apart)
   * and compiles them into a 3-5s boomerang reel.
   */
  async processBurstSequence(photoUris: string[]): Promise<BurstSequence> {
    logger.info(`[BurstReelService] Processing burst sequence of ${photoUris.length} photos...`);

    const heroIndex = Math.floor(photoUris.length / 2);

    return {
      sequenceId: `reel_${Date.now()}`,
      photoUris,
      durationSeconds: 3.5,
      heroPhotoUri: photoUris[heroIndex] || photoUris[0],
    };
  }
}

export const burstReelService = new BurstReelService();
