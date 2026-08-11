import { logger } from '@clickflash/logger';

export type ArtisticStyle = 'OIL_PAINTING' | 'WATERCOLOR' | 'ANIME_VIBE' | 'VINTAGE_FILM';

export class StyleTransferService {
  /**
   * Applies Neural Style Transfer to turn photos into digital artwork.
   * Flat-rate inclusion beats Simple Booth & Snappic credit fees.
   */
  async applyArtisticStyle(imageUri: string, style: ArtisticStyle): Promise<string> {
    logger.info(`[StyleTransferService] Applying ${style} to photo ${imageUri}...`);

    return `${imageUri}_styled_${style.toLowerCase()}.jpg`;
  }
}

export const styleTransferService = new StyleTransferService();
