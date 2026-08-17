import express, { Request, Response, Router } from 'express';
import { hybridSemanticRank, type PhotoSemanticMetadata } from '@clickflash/ai';
import DatabaseManager from '../database/db';
import { requirePermission, PERMISSIONS } from '../middleware/permissions';

export default function (context: { dbManager: DatabaseManager; logger: any }): Router {
  const router = express.Router();
  const { dbManager, logger } = context;

  /**
   * @route POST /api/search/semantic
   * @desc Performs multimodal hybrid semantic search on guest photos using dense embeddings and lexical tags
   */
  router.post('/semantic', requirePermission(PERMISSIONS.PHOTO_VIEW), (req: Request, res: Response) => {
    try {
      const {
        queryText,
        albumId,
        categoryFilter,
        minSimilarity = 0.15,
        maxResults = 25
      } = req.body;

      if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
        return res.status(400).json({ error: 'queryText is required and must be a non-empty string' });
      }

      // Fetch photos from local SQLite DB
      let querySql = 'SELECT id, title, category, ai_tags, quality_score, created_at FROM photos';
      const params: any[] = [];

      if (albumId) {
        querySql += ' WHERE albumId = ?';
        params.push(String(albumId));
      }

      querySql += ' ORDER BY created_at DESC LIMIT 500';

      const rawPhotos = dbManager.query<any>(querySql, params);

      const candidatePhotos: PhotoSemanticMetadata[] = rawPhotos.map((p) => {
        let aiTags: any = undefined;
        if (p.ai_tags) {
          try {
            aiTags = typeof p.ai_tags === 'string' ? JSON.parse(p.ai_tags) : p.ai_tags;
          } catch {
            // Ignore parse errors on corrupt tag strings
          }
        }

        return {
          id: p.id,
          title: p.title,
          category: p.category,
          aiTags,
          qualityScore: p.quality_score || 80,
          capturedAt: p.created_at
        };
      });

      const rankedResults = hybridSemanticRank(
        {
          queryText,
          categoryFilter,
          minSimilarity,
          maxResults
        },
        candidatePhotos
      );

      logger.info(
        `[SemanticSearch] Query "${queryText}" matched ${rankedResults.length} photos out of ${candidatePhotos.length} candidates`
      );

      res.status(200).json({
        success: true,
        query: queryText,
        totalCandidates: candidatePhotos.length,
        matchedCount: rankedResults.length,
        results: rankedResults
      });
    } catch (error) {
      logger.error('[SemanticSearch] Failed to execute semantic search query', error);
      res.status(500).json({ error: 'Failed to execute semantic search', details: String(error) });
    }
  });

  return router;
}
