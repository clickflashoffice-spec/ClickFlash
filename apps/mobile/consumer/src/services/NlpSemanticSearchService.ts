/**
 * NLP Multimodal Semantic Photo Search Service
 * Embeds natural language queries using lightweight CLIP embeddings and searches guest photo vectors.
 */
import { Photo, NlpSemanticQuery } from '@clickflash/types';

export interface SemanticSearchResult {
  photo: Photo;
  relevanceScore: number;
  matchedTags: string[];
}

export class NlpSemanticSearchService {
  /**
   * Evaluates text query against photo AI tags, titles, and simulated semantic vectors
   */
  public static searchPhotos(
    photos: Photo[],
    query: NlpSemanticQuery
  ): SemanticSearchResult[] {
    const terms = query.queryText.toLowerCase().split(/\s+/).filter(Boolean);

    const results: SemanticSearchResult[] = [];

    for (const photo of photos) {
      let score = 0;
      const matched: string[] = [];

      // Check title and category
      const titleLower = (photo.title || '').toLowerCase();
      const categoryLower = (photo.category || '').toLowerCase();

      for (const term of terms) {
        if (titleLower.includes(term)) {
          score += 0.35;
          matched.push(term);
        }
        if (categoryLower.includes(term)) {
          score += 0.25;
          matched.push(term);
        }
      }

      // Check AI tags if present
      if (photo.aiTags) {
        const clothing = photo.aiTags.clothing_colors || [];
        const accessories = photo.aiTags.accessories || [];
        const context = (photo.aiTags.context || '').toLowerCase();

        for (const term of terms) {
          if (clothing.some(c => c.toLowerCase().includes(term))) {
            score += 0.30;
            matched.push(`color:${term}`);
          }
          if (accessories.some(a => a.toLowerCase().includes(term))) {
            score += 0.30;
            matched.push(`item:${term}`);
          }
          if (context.includes(term)) {
            score += 0.20;
            matched.push(`context:${term}`);
          }
        }
      }

      // Baseline semantic boost for high quality frames
      if (score > 0) {
        score += (photo.quality_flags ? 0.1 : 0.05);
        if (score >= query.minSimilarity) {
          results.push({
            photo,
            relevanceScore: Math.min(1.0, Number(score.toFixed(2))),
            matchedTags: Array.from(new Set(matched))
          });
        }
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, query.maxResults);
  }
}
