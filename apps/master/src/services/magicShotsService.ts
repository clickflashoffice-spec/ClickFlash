import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import logger from '../utils/logger';

export interface OverlayConfig {
    id: string;
    overlayPath: string;
    offsetX: number;
    offsetY: number;
    scale: number;
    blendMode?: sharp.Blend;
}

export class MagicShotsService {
    
    /**
     * Composites an AR overlay (like a pirate parrot) onto a base guest photo
     */
    async applyMagicShot(originalImagePath: string, config: OverlayConfig, outputPath: string): Promise<string> {
        try {
            logger.info(`Applying Magic Shot overlay ${config.id} to ${originalImagePath}`);
            
            // Check if files exist
            await fs.access(originalImagePath);
            await fs.access(config.overlayPath);

            const baseImage = sharp(originalImagePath);
            const metadata = await baseImage.metadata();

            if (!metadata.width || !metadata.height) {
                throw new Error("Could not determine base image dimensions");
            }

            // Calculate exact overlay size
            const overlayWidth = Math.floor(metadata.width * config.scale);
            
            // Resize the overlay and composite it
            const resizedOverlay = await sharp(config.overlayPath)
                .resize({ width: overlayWidth })
                .toBuffer();

            await baseImage
                .composite([
                    {
                        input: resizedOverlay,
                        top: config.offsetY,
                        left: config.offsetX,
                        blend: config.blendMode || 'over'
                    }
                ])
                .toFile(outputPath);

            logger.info(`Successfully generated Magic Shot at ${outputPath}`);
            return outputPath;

        } catch (error) {
            logger.error(`Error generating Magic Shot: ${error instanceof Error ? error.message : 'Unknown'}`);
            throw error;
        }
    }
}

export default new MagicShotsService();
