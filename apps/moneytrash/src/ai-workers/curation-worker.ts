import { logger } from '../utils/logger';

export interface PhotoMetadata {
    id: string;
    galleryId: string;
    url: string;
    width: number;
    height: number;
    // Mock features extracted by AI
    sharpnessScore?: number;
    smileScore?: number;
    eyeContactScore?: number;
    isFullBody?: boolean;
    lightingScore?: number;
}

export interface CurationResult {
    heroPhotoId: string;
    best3DCandidates: string[];
    topGalleryPhotos: string[];
}

export class CurationWorker {
    /**
     * Simulates analyzing a batch of photos using AI to extract feature scores.
     * In a real implementation, this would call Google Gemini Vision or a local tensor model.
     */
    private async extractFeatures(photos: PhotoMetadata[]): Promise<PhotoMetadata[]> {
        logger.info(`[CurationWorker] Extracting AI features for ${photos.length} photos...`);
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return photos.map(photo => ({
            ...photo,
            sharpnessScore: Math.random(),
            smileScore: Math.random(),
            eyeContactScore: Math.random(),
            isFullBody: Math.random() > 0.4, // 60% chance of being full body
            lightingScore: Math.random(),
        }));
    }

    /**
     * Curates a gallery to select the best hero shot and 3D figure candidates.
     */
    public async curateGallery(photos: PhotoMetadata[]): Promise<CurationResult> {
        if (!photos || photos.length === 0) {
            throw new Error("No photos provided for curation.");
        }

        const analyzed = await this.extractFeatures(photos);

        // Score formula: high sharpness + good lighting + smile + eye contact
        const scored = analyzed.map(p => ({
            ...p,
            totalScore: (p.sharpnessScore! * 0.4) + (p.lightingScore! * 0.3) + (p.smileScore! * 0.2) + (p.eyeContactScore! * 0.1)
        })).sort((a, b) => b.totalScore - a.totalScore);

        // Hero photo is the absolute best scoring photo
        const heroPhotoId = scored[0].id;

        // 3D figure candidates must ideally be full-body, sharp, and well-lit
        const best3DCandidates = scored
            .filter(p => p.isFullBody && p.sharpnessScore! > 0.5)
            .map(p => p.id)
            .slice(0, 3); // Top 3 candidates

        // If no full body found, fallback to best photos
        if (best3DCandidates.length === 0) {
            best3DCandidates.push(...scored.slice(0, 3).map(p => p.id));
        }

        const topGalleryPhotos = scored.slice(0, 10).map(p => p.id);

        logger.info(`[CurationWorker] Curation complete. Hero: ${heroPhotoId}, 3D Candidates: ${best3DCandidates.join(', ')}`);

        return {
            heroPhotoId,
            best3DCandidates,
            topGalleryPhotos
        };
    }
}

export const curationWorker = new CurationWorker();
