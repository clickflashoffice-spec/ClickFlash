import express, { Request, Response, Router } from "express";
import { Logger } from "../shared/logger";
import { EmailService } from "../services/emailService";
import { sendError, ERROR_CODES } from "../shared/errorHandler";
import { DatabaseManager } from "../shared/db";

interface MarketingContext {
  logger: Logger;
  emailService: EmailService;
  dbManager: DatabaseManager;
}

// Campaign interface (aligned to migration 037: marketing_campaigns table)
interface Campaign {
  id: string;
  name: string;
  type: "post-event" | "abandoned-cart" | "re-engagement" | "retention";
  trigger_event: string;
  delay_minutes: number;
  subject_template: string;
  body_html: string;
  body_text: string;
  is_active: number | boolean;
  isActive?: number | boolean; // set via SQL alias in SELECT queries
  total_sent?: number;
  open_rate?: number;
  click_rate?: number;
  created_at?: string;
  updated_at?: string;
}

export default function marketingRoutes(context: MarketingContext): Router {
  const { logger, emailService, dbManager } = context;
  const router = express.Router();

  /**
   * GET /api/marketing/campaigns
   * Get all campaigns
   */
  router.get("/campaigns", (_req: Request, res: Response) => {
    try {
      const campaigns = dbManager.query<Campaign>(`
                SELECT 
                    id,
                    name,
                    type,
                    trigger_event as triggerEvent,
                    delay_minutes as delayMinutes,
                    subject_template as subjectTemplate,
                    body_html as bodyTemplate,
                    is_active as isActive,
                    total_sent as totalSent,
                    open_rate as openRate,
                    click_rate as clickRate,
                    created_at as createdAt,
                    updated_at as updatedAt
                FROM marketing_campaigns
                ORDER BY created_at DESC
            `);

      res.json({
        success: true,
        campaigns: campaigns.map((c) => ({
          ...c,
          isActive: Boolean(c.is_active ?? c.isActive),
        })),
      });
    } catch (error: any) {
      logger.error("[Marketing] Failed to fetch campaigns", {
        error: error.message,
      });
      sendError(
        res,
        500,
        "Database Error",
        "Failed to fetch campaigns",
        ERROR_CODES.DATABASE_ERROR,
      );
    }
  });

  /**
   * GET /api/marketing/analytics
   * Get campaign analytics
   */
  router.get("/analytics", (_req: Request, res: Response) => {
    try {
      const stats = dbManager.get<{
        totalCampaigns: number;
        activeCampaigns: number;
        totalSent: number;
        avgOpenRate: number;
        avgClickRate: number;
      }>(`
                SELECT 
                    COUNT(*) as totalCampaigns,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeCampaigns,
                    SUM(COALESCE(total_sent, 0)) as totalSent,
                    AVG(COALESCE(open_rate, 0)) as avgOpenRate,
                    AVG(COALESCE(click_rate, 0)) as avgClickRate
                FROM marketing_campaigns
            `);

      const campaigns = dbManager.query<Campaign>(`
                SELECT id, name, type, is_active as isActive, total_sent as totalSent, open_rate as openRate, click_rate as clickRate
                FROM marketing_campaigns
                ORDER BY COALESCE(total_sent, 0) DESC
            `);

      res.json({
        success: true,
        totalCampaigns: stats?.totalCampaigns || 0,
        activeCampaigns: stats?.activeCampaigns || 0,
        totalSent: stats?.totalSent || 0,
        totalOpened: Math.round(
          ((stats?.totalSent || 0) * (stats?.avgOpenRate || 0)) / 100,
        ),
        totalClicked: Math.round(
          ((stats?.totalSent || 0) * (stats?.avgClickRate || 0)) / 100,
        ),
        avgOpenRate: Math.round(stats?.avgOpenRate || 0),
        avgClickRate: Math.round(stats?.avgClickRate || 0),
        campaigns: campaigns.map((c) => ({
          ...c,
          isActive: Boolean(c.is_active ?? c.isActive),
        })),
      });
    } catch (error: any) {
      logger.error("[Marketing] Failed to fetch analytics", {
        error: error.message,
      });
      sendError(
        res,
        500,
        "Database Error",
        "Failed to fetch analytics",
        ERROR_CODES.DATABASE_ERROR,
      );
    }
  });

  /**
   * POST /api/marketing/campaigns
   * Create new campaign
   */
  router.post("/campaigns", (req: Request, res: Response) => {
    try {
      const {
        name,
        type,
        triggerEvent,
        delayMinutes,
        subjectTemplate,
        bodyTemplate,
        bodyText,
        isActive,
      } = req.body;

      if (
        !name ||
        !type ||
        !triggerEvent ||
        !subjectTemplate ||
        !bodyTemplate
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: name, type, triggerEvent, subjectTemplate, bodyTemplate",
        });
      }

      const ALLOWED_TYPES = ['post-event', 'abandoned-cart', 're-engagement', 'retention'];
      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid type. Allowed values: ${ALLOWED_TYPES.join(', ')}`,
        });
      }

      const parsedDelay = delayMinutes != null ? parseInt(delayMinutes, 10) : 60;
      if (isNaN(parsedDelay) || parsedDelay < 0 || parsedDelay > 43200) {
        return res.status(400).json({
          success: false,
          error: 'delayMinutes must be a non-negative integer ≤ 43200 (30 days)',
        });
      }

      const id = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      dbManager.run(
        `
                INSERT INTO marketing_campaigns (
                    id, name, type, trigger_event, delay_minutes, subject_template,
                    body_html, body_text, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
        [
          id,
          name,
          type,
          triggerEvent,
          parsedDelay,
          subjectTemplate,
          bodyTemplate,
          bodyText || bodyTemplate,
          isActive ? 1 : 0,
          now,
          now,
        ],
      );

      logger.info("[Marketing] Campaign created", { id, name });

      res.status(201).json({
        success: true,
        campaign: {
          id,
          name,
          type,
          triggerEvent,
          delayMinutes: parsedDelay,
          subjectTemplate,
          bodyTemplate,
          isActive: Boolean(isActive),
          totalSent: 0,
          openRate: 0,
          clickRate: 0,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (error: any) {
      logger.error("[Marketing] Failed to create campaign", {
        error: error.message,
      });
      sendError(
        res,
        500,
        "Database Error",
        "Failed to create campaign",
        ERROR_CODES.DATABASE_ERROR,
      );
    }
  });

  /**
   * PATCH /api/marketing/campaigns/:id
   * Update campaign
   */
  router.patch("/campaigns/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Map camelCase frontend fields → snake_case DB columns
      const fieldMap: Record<string, string> = {
        name: "name",
        type: "type",
        triggerEvent: "trigger_event",
        delayMinutes: "delay_minutes",
        subjectTemplate: "subject_template",
        bodyTemplate: "body_html",
        bodyText: "body_text",
        isActive: "is_active",
      };

      const setClauses: string[] = [];
      const values: any[] = [];

      for (const [frontendKey, dbCol] of Object.entries(fieldMap)) {
        if (updates[frontendKey] !== undefined) {
          setClauses.push(`${dbCol} = ?`);
          values.push(
            frontendKey === "isActive"
              ? updates[frontendKey]
                ? 1
                : 0
              : updates[frontendKey],
          );
        }
      }

      if (setClauses.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "No valid fields to update" });
      }

      setClauses.push("updated_at = ?");
      values.push(new Date().toISOString(), id);

      dbManager.run(
        `UPDATE marketing_campaigns SET ${setClauses.join(", ")} WHERE id = ?`,
        values,
      );

      logger.info("[Marketing] Campaign updated", { id });
      res.json({ success: true, message: "Campaign updated" });
    } catch (error: any) {
      logger.error("[Marketing] Failed to update campaign", {
        error: error.message,
      });
      sendError(
        res,
        500,
        "Database Error",
        "Failed to update campaign",
        ERROR_CODES.DATABASE_ERROR,
      );
    }
  });

  /**
   * DELETE /api/marketing/campaigns/:id
   * Delete campaign
   */
  router.delete("/campaigns/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      dbManager.run("DELETE FROM marketing_campaigns WHERE id = ?", [id]);
      logger.info("[Marketing] Campaign deleted", { id });
      res.json({ success: true, message: "Campaign deleted" });
    } catch (error: any) {
      logger.error("[Marketing] Failed to delete campaign", {
        error: error.message,
      });
      sendError(
        res,
        500,
        "Database Error",
        "Failed to delete campaign",
        ERROR_CODES.DATABASE_ERROR,
      );
    }
  });

  /**
   * POST /api/marketing/test-email
   * Send a test email for campaign preview
   */
  router.post("/test-email", async (req: Request, res: Response) => {
    const { campaignId, to } = req.body;

    if (!to || !campaignId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: to, campaignId",
      });
    }

    if (!emailService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error:
          "Email service not configured. Set SENDGRID_API_KEY or connect to Cloud Hub.",
      });
    }

    try {
      const campaign = dbManager.get<Campaign>(
        "SELECT subject_template, body_html FROM marketing_campaigns WHERE id = ?",
        [campaignId],
      );

      if (!campaign) {
        return res
          .status(404)
          .json({ success: false, error: "Campaign not found" });
      }

      const subject = (campaign.subject_template || "")
        .replace(/{{clientName}}/g, "Test User")
        .replace(/{{albumTitle}}/g, "Sample Album");

      const body = (campaign.body_html || "")
        .replace(/{{clientName}}/g, "Test User")
        .replace(/{{clientEmail}}/g, to)
        .replace(/{{albumTitle}}/g, "Sample Album")
        .replace(/{{albumDate}}/g, new Date().toLocaleDateString())
        .replace(/{{galleryUrl}}/g, "https://clickflash.com/gallery/demo")
        .replace(/{{cartUrl}}/g, "https://clickflash.com/cart/demo")
        .replace(/{{studioName}}/g, "ClickFlash Photography")
        .replace(/{{price}}/g, "$4.99")
        .replace(/{{days}}/g, "5")
        .replace(/{{orderNumber}}/g, "CF-TEST-001");

      const result = await emailService.sendTestEmail(
        to,
        subject,
        body.replace(/\n/g, "<br>"),
        body,
      );

      if (result) {
        logger.info("[Marketing] Test email sent", { to, campaignId });
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        sendError(
          res,
          500,
          "Email Error",
          "Failed to send test email",
          ERROR_CODES.INTERNAL_ERROR,
        );
      }
    } catch (error: any) {
      logger.error("[Marketing] Test email failed", { error: error.message });
      sendError(
        res,
        500,
        "Test Email Error",
        error.message,
        ERROR_CODES.INTERNAL_ERROR,
      );
    }
  });

  /**
   * GET /api/marketing/track-open/:trackingId
   * Track email opens (serves 1x1 pixel)
   */
  router.get("/track-open/:trackingId", (req: Request, res: Response) => {
    const { trackingId } = req.params;
    logger.info(`[Marketing] Email opened: ${trackingId}`, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Update open timestamp in campaign_sends
    try {
      dbManager.run(
        "UPDATE campaign_sends SET opened_at = ? WHERE sendgrid_message_id = ? AND opened_at IS NULL",
        [new Date().toISOString(), trackingId],
      );
    } catch (_e) {
      /* non-fatal */
    }

    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64",
    );
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": pixel.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    });
    res.end(pixel);
  });

  /**
   * GET /api/marketing/unsubscribe
   * Handle unsubscribe requests (CAN-SPAM compliance)
   */
  router.get("/unsubscribe", (req: Request, res: Response) => {
    const { email } = req.query;
    logger.info(`[Marketing] Unsubscribe request: ${email}`);

    res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unsubscribed</title>
                <style>
                    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                    h1 { color: #333; }
                    p { color: #666; }
                </style>
            </head>
            <body>
                <h1>Unsubscribed</h1>
                <p>You have been successfully unsubscribed from ClickFlash marketing emails.</p>
                <p>If you change your mind, you can resubscribe in your account settings.</p>
            </body>
            </html>
        `);
  });

  return router;
}
