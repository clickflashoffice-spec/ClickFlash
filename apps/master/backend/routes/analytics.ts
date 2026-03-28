// backend/routes/analytics.ts
import express, { Request, Response, Router } from "express";
import DatabaseManager from "../shared/db";
import { Logger } from "../shared/logger";
import { sendError, ERROR_CODES } from "../shared/errorHandler";

interface AnalyticsContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

export default function analyticsRoutes(context: AnalyticsContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  /**
   * GET /api/analytics/summary
   * High-level KPIs for the last 30 days
   */
  router.get("/summary", (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;

      const stats = dbManager.get<{
        totalRevenue: number;
        totalOrders: number;
      }>(
        `
                SELECT 
                    SUM(total) as totalRevenue,
                    COUNT(*) as totalOrders
                FROM orders 
                WHERE status = 'Completed' 
                AND created_at >= date('now', ?)
            `,
        [`-${days} days`],
      );

      const productSplit = dbManager.query(
        `
                SELECT 
                    JSON_EXTRACT(item.value, '$.name') as productName,
                    SUM(JSON_EXTRACT(item.value, '$.price') * JSON_EXTRACT(item.value, '$.quantity')) as revenue
                FROM orders, JSON_EACH(orders.items) as item
                WHERE status = 'Completed'
                AND created_at >= date('now', ?)
                GROUP BY productName
                ORDER BY revenue DESC
            `,
        [`-${days} days`],
      );

      res.json({
        revenue: stats?.totalRevenue || 0,
        orders: stats?.totalOrders || 0,
        productBreakdown: productSplit || [],
      });
    } catch (error: any) {
      logger.error("Failed to get analytics summary", error);
      sendError(
        res,
        500,
        "Analytics Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  /**
   * GET /api/analytics/hourly
   * Revenue trends for the last 24 hours or a specific date
   */
  router.get("/hourly", (req: Request, res: Response) => {
    try {
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];

      const hourlyData = dbManager.query(
        `
                SELECT 
                    strftime('%H:00', created_at) as hour,
                    SUM(total) as revenue,
                    COUNT(*) as count
                FROM orders
                WHERE status = 'Completed'
                AND date(created_at) = ?
                GROUP BY hour
                ORDER BY hour ASC
            `,
        [date],
      );

      res.json(hourlyData);
    } catch (error: any) {
      logger.error("Failed to get hourly analytics", error);
      sendError(
        res,
        500,
        "Analytics Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  /**
   * GET /api/analytics/photographers
   * Performance ranking
   */
  router.get("/photographers", (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;

      const performance = dbManager.query(
        `
                SELECT 
                    u.name,
                    SUM(o.total) as revenue,
                    COUNT(o.id) as orderCount,
                    AVG(o.total) as avgOrderValue
                FROM users u
                JOIN orders o ON u.id = o.photographerId
                WHERE o.status = 'Completed'
                AND o.created_at >= date('now', ?)
                GROUP BY u.id
                ORDER BY revenue DESC
            `,
        [`-${days} days`],
      );

      res.json(performance);
    } catch (error: any) {
      logger.error("Failed to get photographer analytics", error);
      sendError(
        res,
        500,
        "Analytics Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  /**
   * GET /api/analytics/albums/:id
   * Detailed performance for a specific album (Optimized with CTEs)
   */
  router.get("/albums/:id", (req: Request, res: Response) => {
    const albumId = req.params.id;
    try {
      const stats = dbManager.get(
        `
                WITH album_stats AS (
                    SELECT 
                        COALESCE(SUM(viewCount), 0) as totalViews,
                        COALESCE(SUM(selectionCount), 0) as totalSelections,
                        COUNT(*) as photoCount
                    FROM photos
                    WHERE albumId = ?
                ),
                order_stats AS (
                    SELECT 
                        COUNT(*) as totalOrders,
                        COALESCE(SUM(total), 0) as totalRevenue
                    FROM orders
                    WHERE albumId = ? AND status = 'Completed'
                )
                SELECT * FROM album_stats, order_stats;
            `,
        [albumId, albumId],
      );

      const topPhotos = dbManager.query(
        `
                SELECT 
                    id, title, url, viewCount, selectionCount,
                    (SELECT COUNT(*) FROM orders o, json_each(o.items) as item 
                     WHERE o.albumId = ? AND json_extract(item.value, '$.photoId') = photos.id) as salesCount
                FROM photos
                WHERE albumId = ?
                ORDER BY salesCount DESC, selectionCount DESC
                LIMIT 10
            `,
        [albumId, albumId],
      );

      const conversionStats = {
        views: stats?.totalViews || 0,
        selections: stats?.totalSelections || 0,
        orders: stats?.totalOrders || 0,
        conversionRate:
          stats?.totalViews > 0
            ? (stats.totalOrders / stats.totalViews) * 100
            : 0,
      };

      res.json({
        stats,
        topPhotos,
        conversionStats,
      });
    } catch (error: any) {
      logger.error(`Failed to get analytics for album ${albumId}`, error);
      sendError(
        res,
        500,
        "Analytics Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  /**
   * POST /api/analytics/track
   * Report photo engagement (view/selection) from Kiosks
   */
  router.post("/track", (req: Request, res: Response) => {
    const { photoId, type } = req.body;
    if (!photoId || !["view", "selection"].includes(type)) {
      return res.status(400).json({ error: "Invalid tracking data" });
    }

    try {
      const column = type === "view" ? "viewCount" : "selectionCount";
      dbManager.run(
        `UPDATE photos SET ${column} = ${column} + 1, updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), photoId],
      );

      res.json({ success: true });
    } catch (error: any) {
      logger.error(`Failed to track ${type} for photo ${photoId}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/analytics/photos/:id
   * Detailed performance for a specific photo
   */
  router.get("/photos/:id", (req: Request, res: Response) => {
    const photoId = req.params.id;
    try {
      const stats = dbManager.get(
        `
                SELECT 
                    p.id, p.title, p.url, p.viewCount, p.selectionCount,
                    a.title as albumTitle, a.id as albumId,
                    (SELECT COUNT(*) FROM orders o, json_each(o.items) as item 
                     WHERE json_extract(item.value, '$.photoId') = p.id AND o.status = 'Completed') as salesCount
                FROM photos p
                JOIN albums a ON p.albumId = a.id
                WHERE p.id = ?
            `,
        [photoId],
      );

      if (!stats) return res.status(404).json({ error: "Photo not found" });

      res.json(stats);
    } catch (error: any) {
      logger.error(`Failed to get photo analytics for ${photoId}`, error);
      sendError(
        res,
        500,
        "Analytics Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  return router;
}
