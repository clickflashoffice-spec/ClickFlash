import { logger } from "../utils/logger";

export interface PhotoBookImage {
    id: string;
    url: string;
    aspectRatio: number;
    qualityScore: number;
}

export interface PhotoBookSpread {
    pageIndex: number;
    layoutType: 'FULL_BLEED' | 'GRID_2' | 'GRID_3' | 'GRID_4' | 'MASONRY';
    images: PhotoBookImage[];
}

export class NeuralDesignService {

    /**
     * Takes an array of images and algorithmically designs a balanced photo book layout
     * based on image orientation (aspect ratio) and AI quality scores.
     */
    async generateBookLayout(images: PhotoBookImage[], pages: number): Promise<PhotoBookSpread[]> {
        logger.info(`Generating Neural Design layout for ${images.length} images across ${pages} pages`);
        
        // 1. Sort by quality score (highest first)
        const sortedImages = [...images].sort((a, b) => b.qualityScore - a.qualityScore);
        
        const spreads: PhotoBookSpread[] = [];
        let imageIndex = 0;

        for (let i = 0; i < pages; i++) {
            // If we run out of images, stop generating spreads
            if (imageIndex >= sortedImages.length) {
                break;
            }

            // Simple heuristic layout engine
            // Page 1 is usually a full bleed high-quality hero shot
            if (i === 0) {
                spreads.push({
                    pageIndex: i,
                    layoutType: 'FULL_BLEED',
                    images: [sortedImages[imageIndex]]
                });
                imageIndex++;
                continue;
            }

            // Alternating grid structures for visual interest
            const remaining = sortedImages.length - imageIndex;
            let layoutType: PhotoBookSpread['layoutType'] = 'GRID_2';
            let imagesToTake = 2;

            if (remaining >= 4 && i % 3 === 0) {
                layoutType = 'GRID_4';
                imagesToTake = 4;
            } else if (remaining >= 3 && i % 2 === 0) {
                layoutType = 'GRID_3';
                imagesToTake = 3;
            } else if (remaining === 1) {
                layoutType = 'FULL_BLEED';
                imagesToTake = 1;
            }

            spreads.push({
                pageIndex: i,
                layoutType,
                images: sortedImages.slice(imageIndex, imageIndex + imagesToTake)
            });

            imageIndex += imagesToTake;
        }

        logger.info(`Successfully generated ${spreads.length} layout spreads.`);
        return spreads;
    }
}

export default new NeuralDesignService();
