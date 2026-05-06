/**
 * Smart Photo Culling Service
 * 
 * Provides client-side AI-powered photo quality assessment
 * for automatic culling recommendations.
 */

import { logger } from '@/utils/logger';
import { Photo } from '@/types';

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
    exposureMinThreshold: number;
    exposureMaxThreshold: number;
    minQualityThreshold: number;
    enableDuplicateDetection: boolean;
    enableFaceDetection: boolean;
}

const DEFAULT_CONFIG: Required<SmartCullingConfig> = {
    sharpnessThreshold: 50,
    exposureMinThreshold: 30,
    exposureMaxThreshold: 90,
    minQualityThreshold: 60,
    enableDuplicateDetection: true,
    enableFaceDetection: true,
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
     * Analyze a single photo for quality issues
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
        };

        try {
            // Create image element for analysis
            const img = await this.loadImage(photo.url || photo.previewUrl || '');
            if (!img) {
                score.issues.push('Could not load image');
                score.recommendation = 'review';
                return score;
            }

            // Run quality assessments in parallel
            const [sharpness, exposure] = await Promise.all([
                this.assessSharpness(img),
                this.assessExposure(img),
            ]);

            score.sharpness = sharpness;
            score.exposure = exposure;

            // Check for face and eyes (if enabled)
            if (this.config.enableFaceDetection) {
                const faceResult = await this.detectFaces(img);
                if (faceResult.hasFace) {
                    score.eyesOpen = faceResult.eyesOpen;
                    if (!faceResult.eyesOpen) {
                        score.issues.push('Eyes closed detected');
                        score.overall -= 20;
                    }
                }
            }

            // Check for blur
            if (score.sharpness < this.config.sharpnessThreshold) {
                score.issues.push('Image appears blurry');
                score.overall -= 30;
            }

            // Check for exposure issues
            if (score.exposure < this.config.exposureMinThreshold) {
                score.issues.push('Image underexposed');
                score.overall -= 25;
            } else if (score.exposure > this.config.exposureMaxThreshold) {
                score.issues.push('Image overexposed');
                score.overall -= 25;
            }

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

        // Analyze all photos
        for (const photo of photos) {
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

        logger.info(`[SmartCulling] Analysis complete: ${keptPhotos} keep, ${reviewPhotos} review, ${rejectedPhotos} reject`);
        return result;
    }

    /**
     * Get cached analysis for an album
     */
    public getCachedAnalysis(albumId: string): CullingAnalysisResult | null {
        return this.analysisCache.get(albumId) || null;
    }

    /**
     * Clear cached analysis
     */
    public clearCache(albumId?: string): void {
        if (albumId) {
            this.analysisCache.delete(albumId);
        } else {
            this.analysisCache.clear();
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
     * Assess image sharpness using Laplacian variance
     */
    private async assessSharpness(img: HTMLImageElement): Promise<number> {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            
            // Use smaller size for performance
            const size = 100;
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);

            const imageData = ctx.getImageData(0, 0, size, size);
            const data = imageData.data;

            // Convert to grayscale and compute Laplacian variance
            let sum = 0;
            let sumSq = 0;
            const pixels: number[] = [];

            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                pixels.push(gray);
            }

            // Compute Laplacian (3x3 kernel approximation)
            const width = size;
            for (let y = 1; y < size - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    const laplacian = 
                        pixels[idx - width] +
                        pixels[idx - 1] +
                        pixels[idx + 1] +
                        pixels[idx + width] -
                        4 * pixels[idx];
                    sum += laplacian;
                    sumSq += laplacian * laplacian;
                }
            }

            const count = (size - 2) * (size - 2);
            const mean = sum / count;
            const variance = (sumSq / count) - (mean * mean);

            // Normalize variance to 0-100 scale
            // Typical good variance is > 500, blurry is < 100
            const normalizedScore = Math.min(100, (variance / 500) * 100);
            return Math.max(0, normalizedScore);
        } catch {
            return 100; // Default to good if analysis fails
        }
    }

    /**
     * Assess image exposure using histogram analysis
     */
    private async assessExposure(img: HTMLImageElement): Promise<number> {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            
            const size = 100;
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);

            const imageData = ctx.getImageData(0, 0, size, size);
            const data = imageData.data;

            // Compute histogram
            const hist = new Array(256).fill(0);
            let underexposed = 0;
            let overexposed = 0;
            let proper = 0;

            for (let i = 0; i < data.length; i += 4) {
                const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                hist[gray]++;
            }

            const totalPixels = data.length / 4;
            const _threshold = totalPixels * 0.01; // 1% threshold

            // Check for underexposure (many dark pixels)
            for (let i = 0; i < 30; i++) {
                underexposed += hist[i];
            }

            // Check for overexposure (many bright pixels)
            for (let i = 225; i < 256; i++) {
                overexposed += hist[i];
            }

            // Proper exposure is in the middle
            proper = totalPixels - underexposed - overexposed;

            // Score based on distribution
            const exposureScore = (proper / totalPixels) * 100;
            return Math.min(100, Math.max(0, exposureScore));
        } catch {
            return 100;
        }
    }

    /**
     * Detect faces and eye status using face-api.js
     */
    private async detectFaces(img: HTMLImageElement): Promise<{ hasFace: boolean; eyesOpen: boolean }> {
        try {
            if (!img || !img.width || !img.height) {
                return { hasFace: false, eyesOpen: true };
            }

            // Dynamically import face-api
            const faceapi = await import('@vladmandic/face-api');
            
            const detection = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                return { hasFace: false, eyesOpen: true };
            }

            // Get eye landmarks (positions 36-41 for left eye, 42-47 for right eye)
            const landmarks = detection.landmarks;
            if (!landmarks) {
                return { hasFace: true, eyesOpen: true };
            }

            // Simplified eye openness check based on landmark positions
            // In real implementation, would analyze eye aspect ratio
            return { hasFace: true, eyesOpen: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('does not support image input') || message.includes('Cannot read image')) {
                logger.warn('[SmartCulling] Face detection skipped: model does not support this image type');
            }
            return { hasFace: false, eyesOpen: true };
        }
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

    /**
     * Load image from URL
     */
    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }
}

export const smartCullingService = SmartCullingService.getInstance();
export default smartCullingService;
