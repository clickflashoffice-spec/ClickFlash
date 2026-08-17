import { describe, it, expect } from 'vitest';
import {
  generateTextEmbedding,
  cosineSimilarity,
  calculateLexicalScore,
  hybridSemanticRank
} from './semantic-search.js';
import type { PhotoSemanticMetadata } from './types.js';

describe('Multimodal Hybrid NLP Semantic Photo Search', () => {
  describe('generateTextEmbedding & cosineSimilarity', () => {
    it('generates a normalized 512-dim embedding with L2 norm equal to 1', () => {
      const emb = generateTextEmbedding('girl with red hat riding roller coaster');
      expect(emb).toHaveLength(512);

      let sumSq = 0;
      for (const v of emb) {
        sumSq += v * v;
      }
      expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 3);
    });

    it('computes exact cosine similarity between identical and orthogonal vectors', () => {
      const v1 = generateTextEmbedding('roller coaster drop');
      const v2 = generateTextEmbedding('roller coaster drop');
      const sim = cosineSimilarity(v1, v2);
      expect(sim).toBeCloseTo(1.0, 4);

      const zeroVec = new Array(512).fill(0);
      expect(cosineSimilarity(v1, zeroVec)).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('yields higher similarity for semantically aligned text than distant text', () => {
      const query = generateTextEmbedding('family roller coaster fun');
      const related = generateTextEmbedding('family laughing on coaster ride');
      const distant = generateTextEmbedding('deep dark underwater submarine');

      const simRelated = cosineSimilarity(query, related);
      const simDistant = cosineSimilarity(query, distant);

      expect(simRelated).toBeGreaterThan(simDistant);
    });
  });

  describe('calculateLexicalScore', () => {
    const mockPhoto: PhotoSemanticMetadata = {
      id: 'photo_101',
      title: 'Thunder Mountain Splash Peak',
      category: 'WATER_SPLASH',
      aiTags: {
        scene: 'Water flume drop',
        clothing_colors: ['yellow', 'blue'],
        accessories: ['sunglasses', 'raincoat'],
        context: 'screaming with joy at splashdown'
      }
    };

    it('matches color, accessories, and scene keywords', () => {
      const queryTerms = ['yellow', 'sunglasses', 'splash'];
      const result = calculateLexicalScore(queryTerms, mockPhoto);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.matchedTerms).toContain('color:yellow');
      expect(result.matchedTerms).toContain('item:sunglasses');
      expect(result.matchedTerms).toContain('splash');
    });
  });

  describe('hybridSemanticRank', () => {
    const photos: PhotoSemanticMetadata[] = [
      {
        id: 'photo_coaster_hero',
        title: 'Mega Coaster Inversion Loop',
        category: 'COASTER_LOOP',
        aiTags: {
          scene: 'Coaster Loop Apex',
          clothing_colors: ['red', 'black'],
          accessories: ['hat'],
          context: 'arms raised in excitement'
        },
        qualityScore: 95
      },
      {
        id: 'photo_water_splash',
        title: 'Log Flume Splash Down',
        category: 'WATER_SPLASH',
        aiTags: {
          scene: 'Huge wave splash',
          clothing_colors: ['yellow'],
          accessories: ['poncho'],
          context: 'getting soaked with water'
        },
        qualityScore: 90
      },
      {
        id: 'photo_character_meet',
        title: 'Mascot Princess Hug',
        category: 'CHARACTER_MEET',
        aiTags: {
          scene: 'Castle courtyard',
          clothing_colors: ['pink', 'white'],
          accessories: ['tiara'],
          context: 'gentle smiling pose'
        },
        qualityScore: 85
      }
    ];

    it('ranks the coaster photo highest when searching for coaster loop queries', () => {
      const results = hybridSemanticRank(
        {
          queryText: 'arms raised on coaster loop',
          minSimilarity: 0.1,
          maxResults: 10
        },
        photos
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].photoId).toBe('photo_coaster_hero');
      expect(results[0].relevanceScore).toBeGreaterThan(0.4);
    });

    it('respects category filtering', () => {
      const results = hybridSemanticRank(
        {
          queryText: 'splash wave yellow poncho',
          categoryFilter: 'WATER_SPLASH',
          minSimilarity: 0.1,
          maxResults: 10
        },
        photos
      );

      expect(results).toHaveLength(1);
      expect(results[0].photoId).toBe('photo_water_splash');
    });

    it('limits output to maxResults', () => {
      const results = hybridSemanticRank(
        {
          queryText: 'happy resort guest',
          minSimilarity: 0.01,
          maxResults: 2
        },
        photos
      );

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });
});
