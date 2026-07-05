import { Router, Request, Response } from "express";
import { ResortAnalyticsService } from "../services/ResortAnalyticsService";
import { Logger } from '../utils/logger';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { customRoutesSchemas } from '../utils/validation';
export function createResortAnalyticsRoutes(
  analyticsService: ResortAnalyticsService,
  logger: Logger,
) {
  const router = Router();

  /**
   * POST /api/resort-analytics/log-meeting
   * Log a photographer meeting outcome
   */
  router.post("/log-meeting", strictRateLimiter, async (req: Request, res: Response) => {
    const parsed = customRoutesSchemas.logMeeting.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Missing or invalid required fields", details: parsed.error.issues });
    }
    const { photographerId, type, date } = parsed.data;

    try {
      analyticsService.logMeetingOutcome(Number(photographerId), type as "taken" | "made" | "noshow" | "late" | "rescheduled", date);
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`[Routes:ResortBI] Failed to log meeting: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/resort-analytics/operational-stats
   * Update daily guests and departures (Local local knowledge)
   */
  router.post("/operational-stats", strictRateLimiter, async (req: Request, res: Response) => {
    const parsed = customRoutesSchemas.operationalStats.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Missing or invalid required fields", details: parsed.error.issues });
    }
    const { date, total_guests, departures } = parsed.data;

    try {
      await analyticsService.updateOperationalStats(
        date,
        Number(total_guests),
        Number(departures),
      );
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`[Routes:ResortBI] Failed to update stats: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/resort-analytics/daily-report
   * Get the consolidated report for the UI or manual sync check
   */
  router.get("/daily-report", async (req: Request, res: Response) => {
    const date = req.query.date as string;
    try {
      const report = await analyticsService.getDailyReport(date);
      res.json(report);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/resort-analytics/log-session
   * Logs a customer interaction duration.
   */
  router.post("/log-session", strictRateLimiter, (req: any, res: any) => {
    const parsed = customRoutesSchemas.logSession.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "photographerId and seconds required or invalid format", details: parsed.error.issues });
    }
    const { photographerId, seconds, date } = parsed.data;

    try {
      analyticsService.logSessionDuration(
        Number(photographerId),
        Number(seconds),
        date,
      );
      res.json({ success: true });
    } catch (e: any) {
      logger.error(
        `[ResortAnalytics Route] Failed to log session: ${e.message}`,
      );
      res.status(500).json({ error: "Failed to log session duration" });
    }
  });

  /**
   * GET /api/resort-analytics/trend
   * Get rolling 30-day income/order trend
   */
  router.get("/trend", async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    try {
      const trend = await analyticsService.getRollingTrend(days);
      res.json(trend);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/resort-analytics/monthly-status
   * Get current month totals
   */
  router.get("/monthly-status", async (req: Request, res: Response) => {
    const month = req.query.month as string;
    try {
      const status = await analyticsService.getMonthlyTotal(month);
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/resort-analytics/comparison
   * Get Simple vs Multiple session comparison
   */
  router.get("/comparison", async (req: Request, res: Response) => {
    const date = req.query.date as string;
    try {
      const comparison = await analyticsService.getSessionTypeComparison(date);
      res.json(comparison);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/resort-analytics/meeting-distribution
   * Get distribution of meeting times
   */
  router.get("/meeting-distribution", async (req: Request, res: Response) => {
    const date = req.query.date as string;
    try {
      const distribution =
        await analyticsService.getMeetingTimeDistribution(date);
      res.json(distribution);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/resort-analytics/average-duration
   * Get average meeting duration per photographer
   */
  router.get("/average-duration", async (req: Request, res: Response) => {
    const date = req.query.date as string;
    try {
      const duration = await analyticsService.getAverageMeetingDuration(date);
      res.json(duration);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/resort-analytics/trigger-auto-calc
   * Manually trigger auto-calculation of meetings from orders
   */
  router.post("/trigger-auto-calc", strictRateLimiter, async (req: Request, res: Response) => {
    const parsed = customRoutesSchemas.triggerAutoCalc.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid format", details: parsed.error.issues });
    }
    const { date } = parsed.data;
    try {
      const results =
        await analyticsService.calculateMeetingsMadeFromOrders(date);
      res.json({ success: true, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
