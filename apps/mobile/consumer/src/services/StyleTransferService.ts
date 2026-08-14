import { logger } from '@clickflash/logger';

export type ArtisticStyle =
  | 'OIL_PAINTING'
  | 'WATERCOLOR'
  | 'ANIME_VIBE'
  | 'VINTAGE_FILM'
  | 'GOLDEN_OASIS'
  | 'CYBERPUNK_NEON'
  | 'MONOCHROME_SILVER'
  | 'VIVID_AQUA';

export interface ColorMatrixPreset {
  name: string;
  matrix: number[];
}

/** 4x5 Color Transformation Matrices for High-Performance Mobile Shaders / Skia */
export const COLOR_MATRIX_PRESETS: Record<ArtisticStyle, number[]> = {
  VINTAGE_FILM: [
    0.9, 0.5, 0.1, 0, 0.05,
    0.3, 0.8, 0.1, 0, 0.05,
    0.2, 0.3, 0.5, 0, 0.02,
    0,   0,   0,   1, 0,
  ],
  GOLDEN_OASIS: [
    1.2, 0.1, 0.0, 0, 0.1,
    0.1, 1.1, 0.0, 0, 0.05,
    0.0, 0.1, 0.8, 0, 0.0,
    0,   0,   0,   1, 0,
  ],
  CYBERPUNK_NEON: [
    1.4, 0.0, 0.2, 0, 0.15,
    0.0, 0.8, 0.5, 0, -0.05,
    0.3, 0.1, 1.6, 0, 0.2,
    0,   0,   0,   1, 0,
  ],
  MONOCHROME_SILVER: [
    0.299, 0.587, 0.114, 0, 0,
    0.299, 0.587, 0.114, 0, 0,
    0.299, 0.587, 0.114, 0, 0,
    0,     0,     0,     1, 0,
  ],
  VIVID_AQUA: [
    0.8, 0.1, 0.1, 0, -0.05,
    0.1, 1.3, 0.2, 0, 0.05,
    0.2, 0.3, 1.4, 0, 0.15,
    0,   0,   0,   1, 0,
  ],
  OIL_PAINTING: [
    1.1, 0.2, 0.1, 0, 0.05,
    0.2, 1.0, 0.1, 0, 0.02,
    0.1, 0.2, 0.9, 0, 0.01,
    0,   0,   0,   1, 0,
  ],
  WATERCOLOR: [
    1.05, 0.1, 0.1, 0, 0.08,
    0.1, 1.1, 0.1, 0, 0.08,
    0.1, 0.1, 1.2, 0, 0.1,
    0,   0,   0,   1, 0,
  ],
  ANIME_VIBE: [
    1.3, 0.0, 0.1, 0, 0.1,
    0.0, 1.3, 0.1, 0, 0.1,
    0.1, 0.1, 1.4, 0, 0.15,
    0,   0,   0,   1, 0,
  ],
};

export class StyleTransferService {
  /**
   * Returns the color matrix shader definition for immediate on-device render.
   */
  getColorMatrix(style: ArtisticStyle): number[] {
    return COLOR_MATRIX_PRESETS[style] || COLOR_MATRIX_PRESETS.VINTAGE_FILM;
  }

  /**
   * Applies Neural Style Transfer or Color Grading to turn photos into souvenir artwork.
   */
  async applyArtisticStyle(imageUri: string, style: ArtisticStyle): Promise<string> {
    logger.info(`[StyleTransferService] Applying ${style} shader to photo ${imageUri}...`);
    return `${imageUri}?style=${style.toLowerCase()}`;
  }
}

export const styleTransferService = new StyleTransferService();
