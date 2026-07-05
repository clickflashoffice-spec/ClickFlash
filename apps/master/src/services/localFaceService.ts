/**
 * Local Face Fingerprinting Service
 * 
 * Provides client-side face biometric authentication using TensorFlow.js
 * and face-api.js for local face recognition without server-side processing.
 */

import { logger } from '@/utils/logger';

export interface FaceDescriptor {
    descriptor: Float32Array;
    hash: string;
}

export interface FaceMatchResult {
    matched: boolean;
    userId?: string;
    confidence: number;
    error?: string;
}

export interface LocalFaceServiceConfig {
    modelUrl?: string;
    threshold?: number;
    maxDescriptorAge?: number;
}

const DEFAULT_CONFIG: Required<LocalFaceServiceConfig> = {
    modelUrl: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model',
    threshold: 0.6,
    maxDescriptorAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class LocalFaceService {
    private static instance: LocalFaceService;
    private modelsLoaded = false;
    private loadingPromise: Promise<void> | null = null;
    private faceDescriptors: Map<string, FaceDescriptor> = new Map();
    private config: Required<LocalFaceServiceConfig>;
    private faceapi: typeof import('@vladmandic/face-api') | null = null;

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
     * Load face-api.js models for local face recognition
     */
    public async loadModels(): Promise<void> {
        if (this.modelsLoaded) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                logger.info('[LocalFaceService] Loading face recognition models...');

                // Dynamically import face-api.js
                this.faceapi = await import('@vladmandic/face-api');

                // Set model path
                const modelPath = this.config.modelUrl;

                // Load required models
                await Promise.all([
                    this.faceapi!.nets.ssdMobilenetv1.loadFromUri(modelPath),
                    this.faceapi!.nets.faceLandmark68Net.loadFromUri(modelPath),
                    this.faceapi!.nets.faceRecognitionNet.loadFromUri(modelPath),
                ]);

                this.modelsLoaded = true;
                logger.info('[LocalFaceService] Face recognition models loaded successfully');
            } catch (error) {
                logger.error('[LocalFaceService] Failed to load models', error);
                throw error;
            } finally {
                this.loadingPromise = null;
            }
        })();

        return this.loadingPromise;
    }

    /**
     * Extract face descriptor from an image
     */
    public async getFaceDescriptor(image: HTMLImageElement | HTMLCanvasElement | ImageData): Promise<FaceDescriptor | null> {
        if (!this.faceapi || !this.modelsLoaded) {
            await this.loadModels();
        }

        try {
            if (!image) {
                logger.warn('[LocalFaceService] Image is null or undefined');
                return null;
            }

            if (image instanceof HTMLImageElement && (!image.width || !image.height)) {
                logger.warn('[LocalFaceService] Image not fully loaded');
                return null;
            }

            const detection = await this.faceapi!.detectSingleFace(image as any)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                logger.debug('[LocalFaceService] No face detected in image');
                return null;
            }

            const descriptor = detection.descriptor;
            const hash = this.hashDescriptor(descriptor);

            return { descriptor, hash };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('does not support image input') || message.includes('Cannot read image')) {
                logger.warn('[LocalFaceService] Face detection skipped: model does not support this image type');
            } else {
                logger.error('[LocalFaceService] Failed to extract face descriptor', error);
            }
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
        if (!this.faceapi || !this.modelsLoaded) {
            await this.loadModels();
        }

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

                const distance = (this.faceapi as any).matchFaceDistance(
                    currentDescriptor.descriptor,
                    stored.descriptor
                );

                if (distance < this.config.threshold) {
                    if (!bestMatch || distance < bestMatch.distance) {
                        bestMatch = { userId, distance };
                    }
                }
            }

            if (bestMatch) {
                const confidence = 1 - bestMatch.distance;
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
     * Check if models are loaded
     */
    public isReady(): boolean {
        return this.modelsLoaded;
    }

    /**
     * Hash a face descriptor for quick comparison
     */
    private hashDescriptor(descriptor: Float32Array): string {
        const key = Array.from(descriptor.slice(0, 8)).join(',');
        return btoa(key);
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
                descriptor: Array.from(fd.descriptor),
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
                    descriptor: new Float32Array(item.descriptor),
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

        return this.getFaceDescriptor(video as any);
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
