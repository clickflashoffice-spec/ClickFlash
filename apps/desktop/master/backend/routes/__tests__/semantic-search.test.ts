import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import createSemanticSearchRouter from '../semanticSearch.routes';

describe('Multimodal NLP Semantic Search API Route', () => {
  let app: express.Express;
  let mockDbManager: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware for testing
    app.use((req, _res, next) => {
      (req as any).user = { role: 'Photographer', permissions: ['photo:view'] };
      next();
    });

    const mockPhotos = [
      {
        id: 'photo_roller_01',
        title: 'Hyper Coaster First Drop',
        category: 'COASTER_LOOP',
        ai_tags: JSON.stringify({
          scene: 'Huge drop',
          clothing_colors: ['red', 'white'],
          accessories: ['hat'],
          context: 'screaming with excitement'
        }),
        quality_score: 96,
        created_at: '2026-08-17T12:00:00Z'
      },
      {
        id: 'photo_splash_02',
        title: 'Tidal Wave Splashdown',
        category: 'WATER_SPLASH',
        ai_tags: JSON.stringify({
          scene: 'Water spray',
          clothing_colors: ['yellow'],
          accessories: ['sunglasses'],
          context: 'soaked with water'
        }),
        quality_score: 92,
        created_at: '2026-08-17T12:05:00Z'
      }
    ];

    mockDbManager = {
      query: vi.fn().mockReturnValue(mockPhotos)
    };

    const mockContext = {
      dbManager: mockDbManager,
      logger: { info: () => {}, error: () => {}, warn: () => {} }
    };

    app.use('/api/search', createSemanticSearchRouter(mockContext));
  });

  it('rejects empty queryText with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/search/semantic')
      .send({ queryText: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('queryText is required');
  });

  it('executes hybrid semantic search query and returns ranked photo results', async () => {
    const res = await request(app)
      .post('/api/search/semantic')
      .send({
        queryText: 'roller coaster drop screaming with excitement',
        minSimilarity: 0.1,
        maxResults: 10
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.matchedCount).toBeGreaterThan(0);
    expect(res.body.results[0].photoId).toBe('photo_roller_01');
    expect(res.body.results[0].relevanceScore).toBeGreaterThan(0.3);
  });

  it('respects category filter parameter in semantic search', async () => {
    const res = await request(app)
      .post('/api/search/semantic')
      .send({
        queryText: 'soaked yellow sunglasses water',
        categoryFilter: 'WATER_SPLASH',
        minSimilarity: 0.1,
        maxResults: 5
      });

    expect(res.status).toBe(200);
    expect(res.body.matchedCount).toBe(1);
    expect(res.body.results[0].photoId).toBe('photo_splash_02');
  });
});
