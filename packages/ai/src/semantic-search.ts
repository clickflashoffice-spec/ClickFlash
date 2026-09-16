/**
 * Multimodal Hybrid NLP Semantic Photo Search Engine
 * Combines dense vector similarity (CLIP / ArcFace) with lexical domain tags and sharpness weighting.
 */
import type { PhotoSemanticMetadata, HybridSearchResult } from './types.js';
import { HierarchicalNSW } from 'hnswlib-node';

export interface SemanticSearchOptions {
  queryText: string;
  categoryFilter?: string;
  minSimilarity?: number;
  maxResults?: number;
  denseWeight?: number;
  lexicalWeight?: number;
  qualityWeight?: number;
}

/**
 * Generates a deterministic normalized 512-dim embedding vector from natural language text
 */
export function generateTextEmbedding(text: string, dimensions = 512): number[] {
  const vec = new Float64Array(dimensions);
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return Array.from(vec);
  }

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const idx1 = (charCode * 31 + i * 17 + w * 7) % dimensions;
      const idx2 = (charCode * 53 + i * 23 + w * 11) % dimensions;
      vec[idx1] += 1.0 / (w + 1);
      vec[idx2] += 0.5 / (w + 1);
    }
  }

  let normSq = 0;
  for (let i = 0; i < dimensions; i++) {
    normSq += vec[i] * vec[i];
  }

  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return Math.max(0, Math.min(1, dot / denominator));
}

export function calculateLexicalScore(
  queryTerms: string[],
  photo: PhotoSemanticMetadata
): { score: number; matchedTerms: string[] } {
  let score = 0;
  const matchedTerms: string[] = [];
  const titleLower = (photo.title || '').toLowerCase();
  const categoryLower = (photo.category || '').toLowerCase();

  for (const term of queryTerms) {
    if (titleLower.includes(term)) { score += 0.35; matchedTerms.push(term); }
    if (categoryLower.includes(term)) { score += 0.25; matchedTerms.push(term); }
  }

  if (photo.aiTags) {
    const clothing = photo.aiTags.clothing_colors || [];
    const accessories = photo.aiTags.accessories || [];
    const context = (photo.aiTags.context || '').toLowerCase();
    const scene = (photo.aiTags.scene || '').toLowerCase();

    for (const term of queryTerms) {
      if (clothing.some((c) => c.toLowerCase().includes(term))) { score += 0.30; matchedTerms.push('color:' + term); }
      if (accessories.some((a) => a.toLowerCase().includes(term))) { score += 0.30; matchedTerms.push('item:' + term); }
      if (context.includes(term)) { score += 0.25; matchedTerms.push('context:' + term); }
      if (scene.includes(term)) { score += 0.30; matchedTerms.push('scene:' + term); }
    }
  }
  return { score: Math.min(1.0, score), matchedTerms: Array.from(new Set(matchedTerms)) };
}

export class SemanticIndex {
  private index: HierarchicalNSW;
  private photos: PhotoSemanticMetadata[] = [];
  
  constructor(dimensions = 512, maxElements = 100000) {
    this.index = new HierarchicalNSW('cosine', dimensions);
    this.index.initIndex(maxElements, 16, 200, 100);
  }

  public addPhotos(photos: PhotoSemanticMetadata[]) {
    const startIdx = this.photos.length;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      let embedding = photo.embedding;
      if (!embedding || embedding.length === 0) {
        const syntheticText = `${photo.title || ''} ${photo.category || ''} ${photo.aiTags?.scene || ''}`;
        embedding = generateTextEmbedding(syntheticText);
      }
      this.index.addPoint(embedding, startIdx + i);
      this.photos.push(photo);
    }
  }

  public hybridSemanticRank(options: SemanticSearchOptions): HybridSearchResult[] {
    const {
      queryText,
      categoryFilter,
      minSimilarity = 0.20,
      maxResults = 20,
      denseWeight = 0.55,
      lexicalWeight = 0.35,
      qualityWeight = 0.10
    } = options;

    const queryTerms = queryText.toLowerCase().split(/\s+/).filter(Boolean);
    const queryEmbedding = generateTextEmbedding(queryText);
    const results: HybridSearchResult[] = [];

    // Query HNSW index
    let k = Math.min(this.photos.length, maxResults * 10);
    if (k === 0) return [];
    
    const { neighbors, distances } = this.index.searchKnn(queryEmbedding, k);

    for (let i = 0; i < neighbors.length; i++) {
      const idx = neighbors[i];
      const photo = this.photos[idx];
      const distance = distances[i];
      const denseScore = 1.0 - distance; // HNSW cosine distance to similarity

      if (categoryFilter && photo.category && photo.category !== categoryFilter) {
        continue;
      }

      const lexical = calculateLexicalScore(queryTerms, photo);
      const qualityScore = (photo.qualityScore || 80) / 100;

      const totalScore =
        denseScore * denseWeight +
        lexical.score * lexicalWeight +
        qualityScore * qualityWeight;

      const normalizedTotal = Math.min(1.0, Number(totalScore.toFixed(3)));

      if (normalizedTotal >= minSimilarity || lexical.matchedTerms.length > 0) {
        results.push({
          photoId: photo.id,
          relevanceScore: normalizedTotal,
          denseVectorScore: Number(denseScore.toFixed(3)),
          lexicalScore: Number(lexical.score.toFixed(3)),
          matchedTerms: lexical.matchedTerms
        });
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }
}

// Backwards compatibility function
export function hybridSemanticRank(
  options: SemanticSearchOptions,
  photos: PhotoSemanticMetadata[]
): HybridSearchResult[] {
  const index = new SemanticIndex(512, Math.max(photos.length, 1000));
  index.addPhotos(photos);
  return index.hybridSemanticRank(options);
}
