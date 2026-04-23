/**
 * Server-Side AI Photo Search Service
 * 
 * Provides cloud-based AI photo search for the Gallery:
 * - Semantic search with OpenAI CLIP
 * - Face-based search with FaceNet
 * - Visual similarity with ResNet embeddings
 * - Multi-modal search combining text and image
 */

import { pb } from './pb';
import { Photo } from '../types';
import { logger } from '../utils/logger';

export interface SearchResult {
    photo: Photo;
    score: number;
    matchType: 'semantic' | 'face' | 'visual' | 'exact';
    highlights?: string[];
}

export interface SemanticEmbedding {
    id: string;
    textEmbedding?: Float32Array;
    imageEmbedding?: Float32Array;
    labels: string[];
    createdAt: string;
}

export interface AIGallerySearchConfig {
    enableSemantic: boolean;
    enableFaceSearch: boolean;
    enableSimilarity: boolean;
    maxResults: number;
    similarityThreshold: number;
}

const DEFAULT_CONFIG: Required<AIGallerySearchConfig> = {
    enableSemantic: true,
    enableFaceSearch: true,
    enableSimilarity: true,
    maxResults: 50,
    similarityThreshold: 0.7,
};

class AIGallerySearchService {
    private static instance: AIGallerySearchService;
    private config: Required<AIGallerySearchConfig>;
    private embeddingsCache: Map<string, SemanticEmbedding> = new Map();

    private constructor(config: Partial<AIGallerySearchConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(config?: Partial<AIGallerySearchConfig>): AIGallerySearchService {
        if (!AIGallerySearchService.instance) {
            AIGallerySearchService.instance = new AIGallerySearchService(config);
        }
        return AIGallerySearchService.instance;
    }

    /**
     * Search photos with AI-powered relevance
     */
    public async search(
        albumId: string,
        query: string,
        options?: {
            maxResults?: number;
            types?: ('semantic' | 'face' | 'visual')[];
            filters?: {
                minWidth?: number;
                minHeight?: number;
                dateFrom?: string;
                dateTo?: string;
            };
        }
    ): Promise<SearchResult[]> {
        const maxResults = options?.maxResults || this.config.maxResults;
        const types = options?.types || ['semantic', 'face', 'visual'];

        try {
            // Use the backend AI search endpoint
            const response = await pb.request(`/api/ai/search/${albumId}`, {
                method: 'POST',
                body: JSON.stringify({
                    query,
                    types,
                    maxResults,
                    filters: options?.filters,
                }),
            });

            if (!response.ok) {
                throw new Error('AI search request failed');
            }

            const results = await response.json();
            return results as SearchResult[];
        } catch (error) {
            logger.error('[AIGallerySearch] Search failed', error);
            
            // Fallback to basic text search
            return this.basicTextSearch(albumId, query, maxResults);
        }
    }

    /**
     * Basic text search fallback
     */
    private async basicTextSearch(
        albumId: string,
        query: string,
        maxResults: number
    ): Promise<SearchResult[]> {
        try {
            const photos = await pb.collection('photos').getFullList({
                filter: `albumId = "${albumId}" && (filename ~ "${query}" || tags ~ "${query}")`,
                limit: maxResults,
            });

            return photos.map((photo: Photo) => ({
                photo,
                score: 0.5,
                matchType: 'exact' as const,
            }));
        } catch (error) {
            logger.error('[AIGallerySearch] Basic search failed', error);
            return [];
        }
    }

    /**
     * Search by image similarity
     */
    public async searchByImage(
        albumId: string,
        imageData: Blob,
        options?: {
            maxResults?: number;
            similarityThreshold?: number;
        }
    ): Promise<SearchResult[]> {
        const maxResults = options?.maxResults || this.config.maxResults;
        const threshold = options?.similarityThreshold || this.config.similarityThreshold;

        try {
            const formData = new FormData();
            formData.append('image', imageData, 'query.jpg');

            const response = await pb.request(`/api/ai/search/${albumId}/visual`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Visual search request failed');
            }

            const results = await response.json();
            return (results as SearchResult[]).filter(r => r.score >= threshold);
        } catch (error) {
            logger.error('[AIGallerySearch] Visual search failed', error);
            return [];
        }
    }

    /**
     * Search for photos with similar faces
     */
    public async searchByFace(
        albumId: string,
        referenceImage: Blob,
        options?: {
            maxResults?: number;
        }
    ): Promise<SearchResult[]> {
        const maxResults = options?.maxResults || this.config.maxResults;

        try {
            const formData = new FormData();
            formData.append('image', referenceImage, 'face.jpg');

            const response = await pb.request(`/api/ai/search/${albumId}/faces`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Face search request failed');
            }

            const results = await response.json();
            return results as SearchResult[];
        } catch (error) {
            logger.error('[AIGallerySearch] Face search failed', error);
            return [];
        }
    }

    /**
     * Semantic search with natural language
     */
    public async semanticSearch(
        albumId: string,
        naturalQuery: string,
        options?: {
            maxResults?: number;
        }
    ): Promise<SearchResult[]> {
        const maxResults = options?.maxResults || this.config.maxResults;

        try {
            const response = await pb.request(`/api/ai/search/${albumId}/semantic`, {
                method: 'POST',
                body: JSON.stringify({
                    query: naturalQuery,
                    maxResults,
                }),
            });

            if (!response.ok) {
                throw new Error('Semantic search request failed');
            }

            const results = await response.json();
            return results as SearchResult[];
        } catch (error) {
            logger.error('[AIGallerySearch] Semantic search failed', error);
            return this.basicTextSearch(albumId, naturalQuery, maxResults);
        }
    }

    /**
     * Generate and store embeddings for album photos
     */
    public async indexAlbum(albumId: string): Promise<{ indexed: number; failed: number }> {
        try {
            const response = await pb.request(`/api/ai/search/${albumId}/index`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Indexing request failed');
            }

            const result = await response.json();
            return result as { indexed: number; failed: number };
        } catch (error) {
            logger.error('[AIGallerySearch] Album indexing failed', error);
            return { indexed: 0, failed: 0 };
        }
    }

    /**
     * Get search suggestions based on query prefix
     */
    public async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
        try {
            const response = await pb.request('/api/ai/search/suggestions', {
                method: 'GET',
            });

            if (!response.ok) {
                return [];
            }

            const suggestions = await response.json();
            return (suggestions as string[])
                .filter(s => s.toLowerCase().includes(query.toLowerCase()))
                .slice(0, limit);
        } catch (error) {
            return [];
        }
    }

    /**
     * Combined multi-modal search
     */
    public async multiModalSearch(
        albumId: string,
        params: {
            text?: string;
            image?: Blob;
            filters?: Record<string, unknown>;
        },
        options?: {
            maxResults?: number;
            weights?: { semantic?: number; visual?: number; face?: number };
        }
    ): Promise<SearchResult[]> {
        const maxResults = options?.maxResults || this.config.maxResults;
        const weights = options?.weights || { semantic: 0.4, visual: 0.3, face: 0.3 };

        try {
            const formData = new FormData();
            if (params.text) {
                formData.append('text', params.text);
            }
            if (params.image) {
                formData.append('image', params.image, 'query.jpg');
            }
            formData.append('maxResults', maxResults.toString());
            formData.append('weights', JSON.stringify(weights));

            const response = await pb.request(`/api/ai/search/${albumId}/multimodal`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Multi-modal search failed');
            }

            const results = await response.json();
            return results as SearchResult[];
        } catch (error) {
            logger.error('[AIGallerySearch] Multi-modal search failed', error);
            
            // Fallback
            if (params.text) {
                return this.basicTextSearch(albumId, params.text, maxResults);
            }
            return [];
        }
    }

    /**
     * Get cached embeddings for a photo
     */
    public getCachedEmbedding(photoId: string): SemanticEmbedding | undefined {
        return this_embeddingsCache.get(photoId);
    }

    /**
     * Clear embeddings cache
     */
    public clearCache(): void {
        this.embeddingsCache.clear();
    }
}

export const aiGallerySearchService = AIGallerySearchService.getInstance();
export default aiGallerySearchService;
