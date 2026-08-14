/**
 * Local Face Fingerprinting Service
 * 
 * Provides client-side face biometric authentication using the local Python AI worker
 * for face recognition without heavy browser-side ML models.
 */

import { logger } from '@/utils/logger';
import { aiClient } from './aiClient';

export interface FaceDescriptor {
    descriptor: number[];
    hash: string;
}

export interface FaceMatchResult {
    matched: boolean;
    userId?: string;
    confidence: number;
    error?: string;
}

export interface LocalFaceServiceConfig {
    threshold?: number;
    maxDescriptorAge?: number;
}

const DEFAULT_CONFIG: Required<LocalFaceServiceConfig> = {
    threshold: 0.6, // Euclidean distance threshold
    maxDescriptorAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class LocalFaceService {
    private static instance: LocalFaceService;
    private faceDescriptors: Map<string, FaceDescriptor> = new Map();
    private config: Required<LocalFaceServiceConfig>;
    private modelsLoaded = true; // Always true now since we use the Python worker

    private constructor(config: LocalFaceServiceConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(config?: LocalFaceServiceConfig): LocalFaceService {
        if (!LocalFaceService.instance) {
            LocalFaceService.instance = new LocalFaceService(config);
        }
        return LocalFaceService.instance;
    }

    /**
     * Load models (No-op now, kept for backward compatibility)
     */
    public async loadModels(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Extract face descriptor from an image using the local AI worker
     */
    public async getFaceDescriptor(image: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<FaceDescriptor | null> {
        try {
            if (!image) {
                logger.warn('[LocalFaceService] Image is null or undefined');
                return null;
            }

            if (image instanceof HTMLImageElement && (!image.width || !image.height)) {
                logger.warn('[LocalFaceService] Image not fully loaded');
                return null;
            }

            const response = await aiClient.getFaceDescriptor(image);

            if (!response.success || !response.descriptor || !response.hash) {
                logger.debug(`[LocalFaceService] Failed to extract descriptor: ${response.error}`);
                return null;
            }

            return {
                descriptor: response.descriptor,
                hash: response.hash
            };
        } catch (error) {
            logger.error('[LocalFaceService] Failed to extract face descriptor', error);
            return null;
        }
    }

    /**
     * Register a face for a user
     */
    public async registerFace(userId: string, image: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<boolean> {
        const descriptor = await this.getFaceDescriptor(image);

        if (!descriptor) {
            throw new Error('No face detected in the provided image');
        }

        this.faceDescriptors.set(userId, descriptor);
        await this.persistDescriptors();

        logger.info(`[LocalFaceService] Face registered for user ${userId}`);
        return true;
    }

    /**
     * Authenticate a user using face recognition
     */
    public async authenticate(image: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<FaceMatchResult> {
        try {
            const currentDescriptor = await this.getFaceDescriptor(image);

            if (!currentDescriptor) {
                return { matched: false, confidence: 0, error: 'No face detected' };
            }

            // Load persisted descriptors if not already loaded
            if (this.faceDescriptors.size === 0) {
                await this.loadDescriptors();
            }

            let bestMatch: { userId: string; distance: number } | null = null;

            for (const [userId, stored] of this.faceDescriptors) {
                // Check if descriptor is too old
                if (this.isDescriptorExpired(stored)) {
                    this.faceDescriptors.delete(userId);
                    continue;
                }

                const distance = this.euclideanDistance(currentDescriptor.descriptor, stored.descriptor);

                if (distance < this.config.threshold) {
                    if (!bestMatch || distance < bestMatch.distance) {
                        bestMatch = { userId, distance };
                    }
                }
            }

            if (bestMatch) {
                // Confidence can be scaled based on distance (0 distance = 100% confidence)
                const confidence = Math.max(0, 1 - bestMatch.distance);
                logger.info(`[LocalFaceService] Face matched for user ${bestMatch.userId} with confidence ${confidence}`);
                return {
                    matched: true,
                    userId: bestMatch.userId,
                    confidence
                };
            }

            return { matched: false, confidence: 0 };
        } catch (error) {
            logger.error('[LocalFaceService] Face authentication failed', error);
            return { matched: false, confidence: 0, error: 'Authentication failed' };
        }
    }

    /**
     * Remove a registered face
     */
    public removeFace(userId: string): void {
        this.faceDescriptors.delete(userId);
        this.persistDescriptors();
        logger.info(`[LocalFaceService] Face removed for user ${userId}`);
    }

    /**
     * Clear all registered faces
     */
    public clearAllFaces(): void {
        this.faceDescriptors.clear();
        this.persistDescriptors();
        logger.info('[LocalFaceService] All registered faces cleared');
    }

    /**
     * Check if models are loaded (always true for API-based extraction)
     */
    public isReady(): boolean {
        return this.modelsLoaded;
    }

    /**
     * Compute Euclidean distance between two vectors
     */
    private euclideanDistance(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) {
            logger.warn('[LocalFaceService] Vector length mismatch');
            return Infinity;
        }
        let sum = 0;
        for (let i = 0; i < vec1.length; i++) {
            const diff = vec1[i] - vec2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    /**
     * Check if a stored descriptor is expired
     */
    private isDescriptorExpired(_stored: FaceDescriptor): boolean {
        // We track expiration via the hash timestamp in real implementation
        // For now, always return false
        return false;
    }

    /**
     * Persist descriptors to localStorage
     */
    private async persistDescriptors(): Promise<void> {
        try {
            const data = Array.from(this.faceDescriptors.entries()).map(([userId, fd]) => ({
                userId,
                descriptor: fd.descriptor,
                hash: fd.hash,
            }));
            localStorage.setItem('faceDescriptors', JSON.stringify(data));
        } catch (error) {
            logger.error('[LocalFaceService] Failed to persist descriptors', error);
        }
    }

    /**
     * Load descriptors from localStorage
     */
    private async loadDescriptors(): Promise<void> {
        try {
            const data = localStorage.getItem('faceDescriptors');
            if (!data) return;

            const parsed = JSON.parse(data);
            for (const item of parsed) {
                this.faceDescriptors.set(item.userId, {
                    descriptor: item.descriptor,
                    hash: item.hash,
                });
            }
            logger.info(`[LocalFaceService] Loaded ${this.faceDescriptors.size} face descriptors`);
        } catch (error) {
            logger.error('[LocalFaceService] Failed to load descriptors', error);
        }
    }

    /**
     * Capture face from video stream
     */
    public async captureFaceFromVideo(video: HTMLVideoElement): Promise<FaceDescriptor | null> {
        // Ensure video is playing
        if (video.paused || video.ended) {
            throw new Error('Video is not playing');
        }

        const canvas = LocalFaceService.createCanvasFromVideo(video);
        return this.getFaceDescriptor(canvas);
    }

    /**
     * Create a canvas from video frame for face processing
     */
    public static createCanvasFromVideo(video: HTMLVideoElement): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(video, 0, 0);
        return canvas;
    }
}

export const localFaceService = LocalFaceService.getInstance();
export default localFaceService;
