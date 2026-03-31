/**
 * Local AI Photo Search Service
 * 
 * Provides on-device AI-powered photo search using TensorFlow.js:
 * - Face-based search (find similar faces)
 * - Visual similarity search
 * - Semantic search with labels
 * - Natural language queries
 */

import { logger } from '@/utils/logger';
import { Photo } from '@/types';

export interface SearchResult {
    photo: Photo;
    score: number;
    matchType: 'face' | 'visual' | 'label' | 'text';
    matchReason: string;
}

export interface FaceEmbedding {
    photoId: string;
    embedding: Float32Array;
    faceCount: number;
}

export interface LocalSearchConfig {
    enableFaceSearch: boolean;
    enableVisualSearch: boolean;
    enableLabelSearch: boolean;
    maxResults: number;
    similarityThreshold: number;
}

const DEFAULT_CONFIG: Required<LocalSearchConfig> = {
    enableFaceSearch: true,
    enableVisualSearch: true,
    enableLabelSearch: true,
    maxResults: 50,
    similarityThreshold: 0.7,
};

class LocalAISearchService {
    private static instance: LocalAISearchService;
    private config: Required<LocalSearchConfig>;
    private faceEmbeddings: Map<string, FaceEmbedding> = new Map();
    private visualEmbeddings: Map<string, Float32Array> = new Map();
    private isInitialized = false;
    private modelLoadingPromise: Promise<void> | null = null;

    private constructor(config: Partial<LocalSearchConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(config?: Partial<LocalSearchConfig>): LocalAISearchService {
        if (!LocalAISearchService.instance) {
            LocalAISearchService.instance = new LocalAISearchService(config);
        }
        return LocalAISearchService.instance;
    }

    /**
     * Initialize the search service and load models
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.modelLoadingPromise) return this.modelLoadingPromise;

        this.modelLoadingPromise = (async () => {
            try {
                logger.info('[LocalSearch] Initializing AI search models...');

                // Load face-api.js models
                const faceapi = await import('@vladmandic/face-api');
                
                const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
                
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
                    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
                    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
                    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
                ]);

                // Load MobileNet for visual embeddings
                // Using a pre-trained model for image features
                await this.loadVisualModel();

                this.isInitialized = true;
                logger.info('[LocalSearch] AI search models loaded successfully');
            } catch (error) {
                logger.error('[LocalSearch] Failed to initialize AI models', error);
                throw error;
            }
        })();

        return this.modelLoadingPromise;
    }

    /**
     * Load visual embedding model
     */
    private async loadVisualModel(): Promise<void> {
        // For visual embeddings, we use a simplified approach
        // In production, would load MobileNet or similar
        logger.debug('[LocalSearch] Visual model ready (using histogram-based approach)');
    }

    /**
     * Index a photo for search
     */
    public async indexPhoto(photo: Photo, imageElement?: HTMLImageElement): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Extract face embeddings
            if (this.config.enableFaceSearch && imageElement) {
                await this.extractFaceEmbedding(photo.id, imageElement);
            }

            // Extract visual embedding
            if (this.config.enableVisualSearch && imageElement) {
                await this.extractVisualEmbedding(photo.id, imageElement);
            }
        } catch (error) {
            logger.error(`[LocalSearch] Failed to index photo ${photo.id}`, error);
        }
    }

    /**
     * Extract face embedding from image
     */
    private async extractFaceEmbedding(photoId: string, img: HTMLImageElement): Promise<void> {
        try {
            const faceapi = await import('@vladmandic/face-api');
            
            const detection = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                this.faceEmbeddings.set(photoId, {
                    photoId,
                    embedding: detection.descriptor,
                    faceCount: 1,
                });
            }
        } catch (error) {
            logger.debug(`[LocalSearch] No face found in photo ${photoId}`);
        }
    }

    /**
     * Extract visual embedding using color histogram
     */
    private async extractVisualEmbedding(photoId: string, img: HTMLImageElement): Promise<void> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Use small size for performance
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const embedding = this.computeColorHistogram(imageData);
        
        this.visualEmbeddings.set(photoId, embedding);
    }

    /**
     * Compute color histogram as simplified embedding
     */
    private computeColorHistogram(imageData: ImageData): Float32Array {
        const bins = 32;
        const histogram = new Float32Array(bins * 3); // RGB
        
        const data = imageData.data;
        const binSize = 256 / bins;

        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / binSize);
            const g = Math.floor(data[i + 1] / binSize);
            const b = Math.floor(data[i + 2] / binSize);
            
            histogram[r]++;
            histogram[bins + g]++;
            histogram[bins * 2 + b]++;
        }

        // Normalize
        const total = imageData.width * imageData.height;
        for (let i = 0; i < histogram.length; i++) {
            histogram[i] /= total;
        }

        return histogram;
    }

    /**
     * Search photos by face (find similar faces)
     */
    public async searchByFace(
        queryImage: HTMLImageElement | HTMLCanvasElement,
        photos: Photo[],
        maxResults: number = 20
    ): Promise<SearchResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const faceapi = await import('@vladmandic/face-api');
        
        // Get query face descriptor
        const queryDetection = await faceapi.detectSingleFace(queryImage)
            .withFaceDescriptor();

        if (!queryDetection) {
            logger.debug('[LocalSearch] No face detected in query image');
            return [];
        }

        const results: SearchResult[] = [];

        for (const photo of photos) {
            const stored = this.faceEmbeddings.get(photo.id);
            if (!stored) continue;

            const distance = faceapi.matchFaceDistance(
                queryDetection.descriptor,
                stored.embedding
            );

            if (distance < 1 - this.config.similarityThreshold) {
                results.push({
                    photo,
                    score: 1 - distance,
                    matchType: 'face',
                    matchReason: `Face similarity: ${((1 - distance) * 100).toFixed(1)}%`,
                });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Search photos by visual similarity
     */
    public async searchByVisual(
        queryImage: HTMLImageElement | HTMLCanvasElement,
        photos: Photo[],
        maxResults: number = 20
    ): Promise<SearchResult[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Compute query embedding
        const queryCanvas = document.createElement('canvas');
        const ctx = queryCanvas.getContext('2d')!;
        queryCanvas.width = 64;
        queryCanvas.height = 64;
        ctx.drawImage(queryImage, 0, 0, 64, 64);
        const queryImageData = ctx.getImageData(0, 0, 64, 64);
        const queryEmbedding = this.computeColorHistogram(queryImageData);

        const results: SearchResult[] = [];

        for (const photo of photos) {
            const stored = this.visualEmbeddings.get(photo.id);
            if (!stored) continue;

            const similarity = this.cosineSimilarity(queryEmbedding, stored);
            
            if (similarity > this.config.similarityThreshold) {
                results.push({
                    photo,
                    score: similarity,
                    matchType: 'visual',
                    matchReason: `Visual similarity: ${(similarity * 100).toFixed(1)}%`,
                });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Search by natural language labels
     */
    public searchByLabels(
        query: string,
        photos: Photo[]
    ): SearchResult[] {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const results: SearchResult[] = [];

        for (const photo of photos) {
            const searchableText = [
                photo.filename || '',
                (photo as Record<string, unknown>).tags as string || '',
                (photo as Record<string, unknown>).description as string || '',
                (photo as Record<string, unknown>).albumName as string || '',
            ].join(' ').toLowerCase();

            let matchCount = 0;
            for (const term of queryTerms) {
                if (searchableText.includes(term)) {
                    matchCount++;
                }
            }

            if (matchCount > 0) {
                results.push({
                    photo,
                    score: matchCount / queryTerms.length,
                    matchType: 'label',
                    matchReason: `Matched ${matchCount}/${queryTerms.length} terms`,
                });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, this.config.maxResults);
    }

    /**
     * Combined search across all methods
     */
    public async search(
        query: string | HTMLImageElement,
        photos: Photo[],
        options?: { maxResults?: number; types?: ('face' | 'visual' | 'label')[] }
    ): Promise<SearchResult[]> {
        const maxResults = options?.maxResults || this.config.maxResults;
        const types = options?.types || ['face', 'visual', 'label'];

        const allResults: SearchResult[] = [];

        // Text/Label search
        if (typeof query === 'string' && types.includes('label')) {
            const labelResults = this.searchByLabels(query, photos);
            allResults.push(...labelResults);
        }

        // Visual search
        if (typeof query !== 'string' && types.includes('visual')) {
            const visualResults = await this.searchByVisual(query, photos, maxResults);
            allResults.push(...visualResults);
        }

        // Face search
        if (typeof query !== 'string' && types.includes('face')) {
            const faceResults = await this.searchByFace(query, photos, maxResults);
            allResults.push(...faceResults);
        }

        // Dedupe and sort by score
        const seen = new Set<string>();
        const unique = allResults.filter(r => {
            if (seen.has(r.photo.id)) return false;
            seen.add(r.photo.id);
            return true;
        });

        return unique
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Compute cosine similarity between two embeddings
     */
    private cosineSimilarity(a: Float32Array, b: Float32Array): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Remove photo from index
     */
    public removeFromIndex(photoId: string): void {
        this.faceEmbeddings.delete(photoId);
        this.visualEmbeddings.delete(photoId);
    }

    /**
     * Clear all indices
     */
    public clearIndex(): void {
        this.faceEmbeddings.clear();
        this.visualEmbeddings.clear();
        logger.info('[LocalSearch] Index cleared');
    }

    /**
     * Get index statistics
     */
    public getStats(): { faceCount: number; visualCount: number; isInitialized: boolean } {
        return {
            faceCount: this.faceEmbeddings.size,
            visualCount: this.visualEmbeddings.size,
            isInitialized: this.isInitialized,
        };
    }

    /**
     * Check if service is ready
     */
    public isReady(): boolean {
        return this.isInitialized;
    }
}

export const localAISearchService = LocalAISearchService.getInstance();
export default localAISearchService;
