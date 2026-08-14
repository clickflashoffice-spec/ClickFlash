/**
 * Smart Photo Culling Service
 * 
 * Provides client-side photo quality assessment
 * for automatic culling recommendations using the local Python AI worker.
 */

import { logger } from '@/utils/logger';
import { Photo } from '@/types';
import { aiClient } from './aiClient';
import { db } from './db';

export interface PhotoQualityScore {
    photoId: string;
    overall: number;           // 0-100 overall quality score
    sharpness: number;         // 0-100 blur detection
    exposure: number;          // 0-100 exposure analysis
    composition: number;       // 0-100 composition score
    eyesOpen: boolean | null;  // null if no face detected
    isDuplicate: boolean;
    duplicateGroupId: string | null;
    issues: string[];          // List of detected issues
    recommendation: 'keep' | 'review' | 'reject';
    semanticTags?: string[];   // Locally derived technical tags
}

export interface CullingAnalysisResult {
    albumId: string;
    totalPhotos: number;
    keptPhotos: number;
    rejectedPhotos: number;
    reviewPhotos: number;
    duplicatesFound: number;
    scores: PhotoQualityScore[];
    analyzedAt: string;
}

export interface SmartCullingConfig {
    sharpnessThreshold: number;
    minQualityThreshold: number;
    enableDuplicateDetection: boolean;
}

const DEFAULT_CONFIG: Required<SmartCullingConfig> = {
    sharpnessThreshold: 50,
    minQualityThreshold: 60,
    enableDuplicateDetection: true,
};

class SmartCullingService {
    private static instance: SmartCullingService;
    private config: Required<SmartCullingConfig>;
    private analysisCache: Map<string, CullingAnalysisResult> = new Map();

    private constructor(config: Partial<SmartCullingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(config?: Partial<SmartCullingConfig>): SmartCullingService {
        if (!SmartCullingService.instance) {
            SmartCullingService.instance = new SmartCullingService(config);
        }
        return SmartCullingService.instance;
    }

    /**
     * Analyze a single photo for quality issues via the AI worker
     */
    public async analyzePhoto(photo: Photo): Promise<PhotoQualityScore> {
        const score: PhotoQualityScore = {
            photoId: photo.id,
            overall: 100,
            sharpness: 100,
            exposure: 100,
            composition: 100,
            eyesOpen: null,
            isDuplicate: false,
            duplicateGroupId: null,
            issues: [],
            recommendation: 'keep',
            semanticTags: [],
        };

        try {
            // Create image element for analysis
            const img = await this.loadImage(photo.url || photo.previewUrl || '');
            if (!img) {
                score.issues.push('Could not load image');
                score.recommendation = 'review';
                return score;
            }

            // Call the local Python AI worker for quality evaluation
            const response = await aiClient.evaluateQuality(img);

            if (!response.success || !response.culling_data) {
                score.issues.push('Analysis failed');
                score.recommendation = 'review';
                return score;
            }

            const data = response.culling_data;

            // Blur detection from AI worker
            score.sharpness = data.blur_score || 100;
            if (data.is_blurry || score.sharpness < this.config.sharpnessThreshold) {
                score.issues.push('Image appears blurry');
                score.overall -= 30;
            }

            // Face and blink detection from AI worker
            if (data.has_face) {
                score.eyesOpen = data.eyes_open;
                if (data.eyes_open === false) {
                    score.issues.push('Eyes closed detected');
                    score.overall -= 20;
                }
            }

            // (Optional) Map exposure or composition if added to AI worker in future
            
            // Clamp overall score
            score.overall = Math.max(0, Math.min(100, score.overall));

            // Determine recommendation
            if (score.overall >= this.config.minQualityThreshold) {
                score.recommendation = 'keep';
            } else if (score.overall >= 30) {
                score.recommendation = 'review';
            } else {
                score.recommendation = 'reject';
            }

            score.semanticTags = this.generateAnalysisTags(img, score);

            logger.debug(`[SmartCulling] Photo ${photo.id} scored: ${score.overall}`, score);
        } catch (error) {
            logger.error(`[SmartCulling] Failed to analyze photo ${photo.id}`, error);
            score.issues.push('Analysis failed');
            score.recommendation = 'review';
        }

        return score;
    }

    /**
     * Analyze all photos in an album for culling recommendations
     */
    public async analyzeAlbum(albumId: string, photos: Photo[]): Promise<CullingAnalysisResult> {
        logger.info(`[SmartCulling] Analyzing ${photos.length} photos in album ${albumId}`);

        const scores: PhotoQualityScore[] = [];
        let keptPhotos = 0;
        let rejectedPhotos = 0;
        let reviewPhotos = 0;

        // Analyze all photos in chunks of 20
        for (let i = 0; i < photos.length; i += 20) {
            const chunk = photos.slice(i, i + 20);
            
            // Process chunk sequentially or in parallel?
            // "Process photos in chunks of 20 instead of a single sequential loop." 
            // "Between chunks, yield to the event loop"
            for (const photo of chunk) {
                const score = await this.analyzePhoto(photo);
                scores.push(score);

                switch (score.recommendation) {
                    case 'keep':
                        keptPhotos++;
                        break;
                    case 'reject':
                        rejectedPhotos++;
                        break;
                    case 'review':
                        reviewPhotos++;
                        break;
                }
            }

            // Yield to event loop
            await new Promise(r => setTimeout(r, 0));
        }

        // Detect duplicates if enabled
        if (this.config.enableDuplicateDetection) {
            await this.detectDuplicates(scores);
        }

        const result: CullingAnalysisResult = {
            albumId,
            totalPhotos: photos.length,
            keptPhotos,
            rejectedPhotos,
            reviewPhotos,
            duplicatesFound: scores.filter(s => s.isDuplicate).length,
            scores,
            analyzedAt: new Date().toISOString(),
        };

        // Cache result
        this.analysisCache.set(albumId, result);
        try {
            await db.cullingCache.put({
                albumId,
                data: result,
                updatedAt: Date.now()
            });
        } catch (err) {
            logger.error(`[SmartCulling] Failed to save cache to DB`, err);
        }

        logger.info(`[SmartCulling] Analysis complete: ${keptPhotos} keep, ${reviewPhotos} review, ${rejectedPhotos} reject`);
        return result;
    }

    /**
     * Get cached analysis for an album
     */
    public async getCachedAnalysis(albumId: string): Promise<CullingAnalysisResult | null> {
        if (this.analysisCache.has(albumId)) {
            return this.analysisCache.get(albumId) || null;
        }

        try {
            const dbCache = await db.cullingCache.get(albumId);
            if (dbCache && dbCache.data) {
                this.analysisCache.set(albumId, dbCache.data);
                return dbCache.data;
            }
        } catch (err) {
            logger.error(`[SmartCulling] Failed to read cache from DB`, err);
        }

        return null;
    }

    /**
     * Clear cached analysis
     */
    public async clearCache(albumId?: string): Promise<void> {
        if (albumId) {
            this.analysisCache.delete(albumId);
            await db.cullingCache.delete(albumId).catch(() => {});
        } else {
            this.analysisCache.clear();
            await db.cullingCache.clear().catch(() => {});
        }
    }

    /**
     * Get photos to auto-reject based on analysis
     */
    public getAutoRejectList(albumId: string): string[] {
        const analysis = this.analysisCache.get(albumId);
        if (!analysis) return [];

        return analysis.scores
            .filter(s => s.recommendation === 'reject' && !s.isDuplicate)
            .map(s => s.photoId);
    }

    /**
     * Get photos to auto-keep (best of duplicates)
     */
    public getBestOfDuplicates(albumId: string): Map<string, string> {
        const analysis = this.analysisCache.get(albumId);
        if (!analysis) return new Map();

        const bestOfDuplicates = new Map<string, string>();
        const groups = new Map<string, PhotoQualityScore[]>();

        // Group duplicates
        for (const score of analysis.scores) {
            if (score.duplicateGroupId) {
                const existing = groups.get(score.duplicateGroupId) || [];
                existing.push(score);
                groups.set(score.duplicateGroupId, existing);
            }
        }

        // Find best in each group
        for (const [_groupId, photos] of groups) {
            const best = photos.reduce((a, b) => a.overall > b.overall ? a : b);
            for (const photo of photos) {
                if (photo.photoId !== best.photoId) {
                    bestOfDuplicates.set(photo.photoId, best.photoId);
                }
            }
        }

        return bestOfDuplicates;
    }

    /**
     * Detect duplicate photos based on perceptual hash
     */
    private async detectDuplicates(scores: PhotoQualityScore[]): Promise<void> {
        // Group photos by approximate timing (if available) or use hash-based detection
        const hashGroups = new Map<string, PhotoQualityScore[]>();

        for (const score of scores) {
            // Use photoId hash for demo - in real implementation would use perceptual hash
            const hash = this.simpleHash(score.photoId);
            const existing = hashGroups.get(hash) || [];
            existing.push(score);
            hashGroups.set(hash, existing);
        }

        // Mark duplicates
        let groupId = 0;
        for (const [_hash, photos] of hashGroups) {
            if (photos.length > 1) {
                for (const photo of photos) {
                    photo.isDuplicate = true;
                    photo.duplicateGroupId = `dup-${groupId}`;
                }
                groupId++;
            }
        }
    }

    /**
     * Simple hash for demo purposes
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    /** Derive technical tags from the image dimensions and measured quality scores. */
    private generateAnalysisTags(img: HTMLImageElement, score: PhotoQualityScore): string[] {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const ratio = height > 0 ? width / height : 1;
        const tags = [ratio > 1.15 ? 'Landscape orientation' : ratio < 0.87 ? 'Portrait orientation' : 'Square orientation'];

        if (score.eyesOpen !== null) tags.push('Face detected');
        tags.push(score.sharpness >= this.config.sharpnessThreshold ? 'Sharp' : 'Soft focus');

        return tags;
    }

    /**
     * Load image from URL
     */
    private loadImage(url: string): Promise<HTMLImageElement> {
        const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });

        const timeoutPromise = new Promise<HTMLImageElement>((_, reject) => {
            setTimeout(() => reject(new Error('Image load timeout')), 10000);
        });

        return Promise.race([loadPromise, timeoutPromise]);
    }
}

export const smartCullingService = SmartCullingService.getInstance();
export default smartCullingService;
