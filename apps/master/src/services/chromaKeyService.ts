import logger from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';

export class ChromaKeyService {
    
    /**
     * Replaces the background of an image using AI segmentation, completely negating
     * the need for a physical green screen (unlike legacy DEI setups).
     */
    async replaceBackground(originalImagePath: string, backgroundAssetId: string): Promise<string> {
        logger.info(`[ChromaKey] Starting AI background replacement on ${originalImagePath}`);
        
        const outputPath = path.join(
            path.dirname(originalImagePath),
            `chroma_${path.basename(originalImagePath)}`
        );

        try {
            logger.info(`[ChromaKey] Segmenting foreground using AI model...`);
            
            // Generate transparent foreground
            const foregroundBlob = await removeBackground(originalImagePath);
            const foregroundBuffer = Buffer.from(await foregroundBlob.arrayBuffer());

            logger.info(`[ChromaKey] Compositing with background asset ${backgroundAssetId}...`);
            
            // Check if background asset exists
            let backgroundExists = false;
            try {
                await fs.access(backgroundAssetId);
                backgroundExists = true;
            } catch {
                // If it's just an ID and not an absolute path, we might need to resolve it 
                // against a backgrounds directory. For now, assuming it's a path or fallback.
                backgroundExists = false;
            }

            const imageInfo = await sharp(originalImagePath).metadata();
            const width = imageInfo.width || 1920;
            const height = imageInfo.height || 1080;

            if (backgroundExists) {
                // Composite over the background image
                const resizedBackground = await sharp(backgroundAssetId)
                    .resize(width, height)
                    .toBuffer();

                await sharp(resizedBackground)
                    .composite([{ input: foregroundBuffer }])
                    .toFile(outputPath);
            } else {
                logger.warn(`[ChromaKey] Background asset ${backgroundAssetId} not found. Compositing over transparent/solid background.`);
                // Composite over a default background (e.g. green or transparent)
                await sharp({
                    create: {
                        width,
                        height,
                        channels: 4,
                        background: { r: 0, g: 255, b: 0, alpha: 1 } // Green screen fallback
                    }
                })
                .composite([{ input: foregroundBuffer }])
                .toFile(outputPath);
            }
            
            logger.info(`[ChromaKey] Background successfully replaced: ${outputPath}`);
            return outputPath;
        } catch (error) {
            logger.error(`[ChromaKey] Failed to replace background:`, error);
            throw error;
        }
    }
}

export default new ChromaKeyService();
