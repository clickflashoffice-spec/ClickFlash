import { logger } from '../utils/logger';
import type { EnhancementRequest, EnhanceJob, EnhanceLevel } from '@clickflash/types';

export interface EnhancementProfile {
    exposureAdjustment: number;
    contrastMultiplier: number;
    saturationBoost: number;
    skinSmoothingRadius: number;
    clarityLevel: number;
    arOverlaysApplied: string[];
    lutApplied?: string;
}

export class EnhancementWorker {
    /**
     * Calculates the deterministic enhancement parameters for a given level and destination theme.
     */
    public computeEnhancementProfile(level: EnhanceLevel, arElements: string[] = [], theme = 'resort'): EnhancementProfile {
        switch (level) {
            case 'auto-correct':
                return {
                    exposureAdjustment: +0.25,
                    contrastMultiplier: 1.12,
                    saturationBoost: 1.15,
                    skinSmoothingRadius: 0,
                    clarityLevel: 1.10,
                    arOverlaysApplied: []
                };
            case 'pro-retouch':
                return {
                    exposureAdjustment: +0.35,
                    contrastMultiplier: 1.18,
                    saturationBoost: 1.20,
                    skinSmoothingRadius: 4.5,
                    clarityLevel: 1.25,
                    arOverlaysApplied: [],
                    lutApplied: 'cinematic_warm_skin_v2'
                };
            case 'magic-shot':
                return {
                    exposureAdjustment: +0.30,
                    contrastMultiplier: 1.15,
                    saturationBoost: 1.25,
                    skinSmoothingRadius: 3.0,
                    clarityLevel: 1.20,
                    arOverlaysApplied: arElements.length > 0 ? arElements : [`${theme}_magic_sparkles`, `${theme}_character_composite`],
                    lutApplied: 'disney_magic_glow'
                };
            case 'cinematic-hdr':
                return {
                    exposureAdjustment: +0.40,
                    contrastMultiplier: 1.30,
                    saturationBoost: 1.28,
                    skinSmoothingRadius: 2.0,
                    clarityLevel: 1.40,
                    arOverlaysApplied: [],
                    lutApplied: 'golden_hour_resort_hdr'
                };
        }
    }

    /**
     * Executes AI enhancement pipeline on the photo asset.
     */
    public async processImage(req: EnhancementRequest): Promise<EnhanceJob> {
        const jobId = `enh-${req.photoId}-${Date.now()}`;
        logger.info(`[EnhancementWorker] Starting AI enhancement [${jobId}] for ${req.photoId}`);
        logger.info(`[EnhancementWorker] Requested Level: ${req.level}`);

        const profile = this.computeEnhancementProfile(req.level, req.arElements, req.destinationTheme);
        const mockEnhancedUrl = `${req.originalUrl}?enhanced=${req.level}&j=${jobId}`;

        logger.info(`[EnhancementWorker] Finished processing ${req.photoId}. Profile applied: ${JSON.stringify(profile)}`);

        return {
            id: jobId,
            photoId: req.photoId,
            level: req.level,
            status: 'completed',
            enhancedUrl: mockEnhancedUrl,
            metadata: {
                ...profile,
                processingTimeMs: req.level === 'auto-correct' ? 150 : req.level === 'pro-retouch' ? 450 : 800
            }
        };
    }
}

export const enhancementWorker = new EnhancementWorker();
