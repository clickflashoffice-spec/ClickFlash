import { Logger } from "../shared/logger";
import { DatabaseManager } from "../shared/db";
import { EmailService } from "./emailService";
import { randomUUID } from "crypto";

interface CampaignTriggerContext {
  customerEmail: string;
  customerName?: string;
  albumId?: string;
  orderId?: string;
  variables: Record<string, string>;
}

/**
 * Backend Campaign Scheduler Service
 *
 * Monitors SQLite database for trigger events and sends automated email campaigns.
 * Runs in background every 5 minutes.
 */
export class CampaignScheduler {
  private logger: Logger;
  private dbManager: DatabaseManager;
  private emailService: EmailService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pollIntervalMs: number;

  constructor(
    logger: Logger,
    dbManager: DatabaseManager,
    emailService: EmailService,
  ) {
    this.logger = logger;
    this.dbManager = dbManager;
    this.emailService = emailService;
    this.pollIntervalMs = parseInt(
      process.env.CAMPAIGN_POLL_INTERVAL_MS || "300000",
    ); // 5 minutes
  }

  /**
   * Start the campaign scheduler
   */
  start(): void {
    if (this.intervalId) {
      this.logger.warn("[CampaignScheduler] Already running");
      return;
    }

    if (!this.emailService.isConfigured()) {
      this.logger.info(
        "[CampaignScheduler] Email service not configured - scheduler disabled",
      );
      return;
    }

    this.logger.info(
      `[CampaignScheduler] Starting... (poll interval: ${this.pollIntervalMs}ms)`,
    );

    // Run immediately on start
    this.checkCampaigns();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.checkCampaigns();
    }, this.pollIntervalMs);
  }

  /**
   * Stop the campaign scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info("[CampaignScheduler] Stopped");
    }
  }

  /**
   * Main campaign check loop
   */
  private async checkCampaigns(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug(
        "[CampaignScheduler] Previous check still running, skipping",
      );
      return;
    }

    this.isRunning = true;

    try {
      this.logger.debug(
        "[CampaignScheduler] Checking for campaign triggers...",
      );

      await this.checkPostEventCampaigns();
      await this.checkAbandonedCartCampaigns();
      await this.checkReEngagementCampaigns();

      this.logger.debug("[CampaignScheduler] Check complete");
    } catch (error: any) {
      this.logger.error("[CampaignScheduler] Error during check", {
        error: error.message,
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check for post-event campaigns (gallery ready notifications)
   * Triggers 1 hour after album is finalized
   */
  private async checkPostEventCampaigns(): Promise<void> {
    try {
      this.logger.debug("[CampaignScheduler] Checking post-event campaigns");

      // Get active post-event templates
      const templates = this.dbManager.query(
        "SELECT * FROM marketing_campaigns WHERE type = 'post-event' AND is_active = 1",
      );

      if (templates.length === 0) {
        return;
      }

      // Find albums finalized ~1 hour ago (SQLite dates are usually ISO strings)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const windowStart = new Date(
        hourAgo.getTime() - 10 * 60 * 1000,
      ).toISOString();
      const windowEnd = new Date(
        hourAgo.getTime() + 10 * 60 * 1000,
      ).toISOString();

      const albums = this.dbManager.query(
        "SELECT * FROM albums WHERE status = 'Finalized' AND updatedAt >= ? AND updatedAt <= ?",
        [windowStart, windowEnd],
      );

      for (const album of albums) {
        // Check if already sent
        const existingSend = this.dbManager.get(
          "SELECT id FROM campaign_sends WHERE album_id = ?",
          [album.id],
        );

        if (existingSend) continue;

        if (!album.customerEmail) continue;

        const template = templates[0];

        await this.triggerCampaign(template.id, {
          customerEmail: album.customerEmail,
          customerName: album.title?.split(" ")[0] || "Valued Customer",
          albumId: album.id,
          variables: {
            customer_name: album.title?.split(" ")[0] || "Valued Customer",
            event_name: album.title || "Your Event",
            gallery_link: `https://clickflash.com/gallery/${album.id}`,
            photo_count: String(album.photoCount || 0),
          },
        });
      }
    } catch (error: any) {
      this.logger.error(
        "[CampaignScheduler] Error checking post-event campaigns",
        { error: error.message },
      );
    }
  }

  /**
   * Check for abandoned cart campaigns
   * Triggers 1 hour after cart was last updated
   */
  private async checkAbandonedCartCampaigns(): Promise<void> {
    try {
      this.logger.debug(
        "[CampaignScheduler] Checking abandoned cart campaigns",
      );

      const templates = this.dbManager.query(
        "SELECT * FROM marketing_campaigns WHERE type = 'abandoned-cart' AND is_active = 1",
      );

      if (templates.length === 0) return;

      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const windowStart = new Date(
        hourAgo.getTime() - 10 * 60 * 1000,
      ).toISOString();
      const windowEnd = new Date(
        hourAgo.getTime() + 10 * 60 * 1000,
      ).toISOString();

      const orders = this.dbManager.query(
        "SELECT * FROM orders WHERE status = 'Pending' AND updatedAt >= ? AND updatedAt <= ?",
        [windowStart, windowEnd],
      );

      for (const order of orders) {
        const existingSend = this.dbManager.get(
          "SELECT id FROM campaign_sends WHERE order_id = ?",
          [order.id],
        );

        if (existingSend) continue;

        const customerEmail = order.clientEmail || order.email;
        if (!customerEmail) continue;

        const template = templates[0];

        await this.triggerCampaign(template.id, {
          customerEmail,
          customerName: order.clientName?.split(" ")[0] || "Valued Customer",
          orderId: order.id,
          variables: {
            customer_name: order.clientName?.split(" ")[0] || "Valued Customer",
            cart_total: order.total
              ? `$${Number(order.total).toFixed(2)}`
              : "$0.00",
            cart_link: `https://clickflash.com/cart/${order.id}`,
            discount_code: "COMEBACK10",
          },
        });
      }
    } catch (error: any) {
      this.logger.error(
        "[CampaignScheduler] Error checking abandoned cart campaigns",
        { error: error.message },
      );
    }
  }

  /**
   * Check for re-engagement campaigns
   * Triggers 30 days after customer's last order
   */
  private async checkReEngagementCampaigns(): Promise<void> {
    try {
      this.logger.debug("[CampaignScheduler] Checking re-engagement campaigns");

      const templates = this.dbManager.query(
        "SELECT * FROM marketing_campaigns WHERE type = 're-engagement' AND is_active = 1",
      );

      if (templates.length === 0) return;

      // Find customers whose last completed order was ~30 days ago
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const windowStart = new Date(
        thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const windowEnd = new Date(
        thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();

      // SQL to find last order per customer in the window
      const query = `
                SELECT clientEmail as email, clientName as name, MAX(updatedAt) as lastOrderDate 
                FROM orders 
                WHERE status = 'Completed' AND clientEmail IS NOT NULL
                GROUP BY clientEmail 
                HAVING lastOrderDate >= ? AND lastOrderDate <= ?
            `;
      const eligibleCustomers = this.dbManager.query(query, [
        windowStart,
        windowEnd,
      ]);

      for (const customer of eligibleCustomers) {
        // Check if already sent re-engagement
        const existingSend = this.dbManager.get(
          "SELECT id FROM campaign_sends WHERE customer_email = ? AND campaign_id LIKE 're-engagement%'",
          [customer.email],
        );

        if (existingSend) continue;

        const template = templates[0];

        await this.triggerCampaign(template.id, {
          customerEmail: customer.email,
          customerName: customer.name?.split(" ")[0] || "Valued Customer",
          variables: {
            customer_name: customer.name?.split(" ")[0] || "Valued Customer",
            discount_code: "WELCOME_BACK20",
          },
        });
      }
    } catch (error: any) {
      this.logger.error(
        "[CampaignScheduler] Error checking re-engagement campaigns",
        { error: error.message },
      );
    }
  }

  /**
   * Trigger a specific campaign for a customer
   */
  private async triggerCampaign(
    campaignId: string,
    context: CampaignTriggerContext,
  ): Promise<void> {
    try {
      this.logger.info(
        `[CampaignScheduler] Triggering campaign ${campaignId} for ${context.customerEmail}`,
      );

      const template = this.dbManager.get(
        "SELECT * FROM marketing_campaigns WHERE id = ?",
        [campaignId],
      );

      if (!template) {
        this.logger.error(
          `[CampaignScheduler] Template not found: ${campaignId}`,
        );
        return;
      }

      if (!template.is_active) return;

      // Render template
      const subject = this.emailService.renderTemplate(
        template.subject_template || "",
        context.variables,
      );
      const html = this.emailService.renderTemplate(
        template.body_html || "",
        context.variables,
      );
      const text = this.emailService.renderTemplate(
        template.body_text || "",
        context.variables,
      );

      const trackingId = `${campaignId}_${context.customerEmail}_${Date.now()}`;

      const sendId = randomUUID();
      this.dbManager.run(
        "INSERT INTO campaign_sends (id, campaign_id, customer_email, album_id, order_id, sendgrid_message_id) VALUES (?, ?, ?, ?, ?, ?)",
        [
          sendId,
          campaignId,
          context.customerEmail,
          context.albumId || null,
          context.orderId || null,
          trackingId,
        ],
      );

      // Send
      const messageId = await this.emailService.sendCampaignEmail({
        to: context.customerEmail,
        subject,
        html,
        text,
        campaignId,
        customerId: context.customerEmail,
        trackingId,
      });

      if (messageId) {
        this.dbManager.run(
          "UPDATE campaign_sends SET sent_at = ?, sendgrid_message_id = ? WHERE id = ?",
          [new Date().toISOString(), messageId, sendId],
        );
        this.logger.info(
          `[CampaignScheduler] Campaign ${campaignId} sent successfully`,
          { messageId, customerEmail: context.customerEmail },
        );
      } else {
        this.dbManager.run("DELETE FROM campaign_sends WHERE id = ?", [sendId]);
        this.logger.error(
          `[CampaignScheduler] Failed to send campaign ${campaignId}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[CampaignScheduler] Failed to trigger campaign ${campaignId}`,
        { error: error.message },
      );
    }
  }

  /**
   * Create default campaign templates (if not exists)
   */
  public async createDefaultTemplates(): Promise<void> {
    // ... Logic to seed templates if needed ...
    // For simplicity, we assume they are seeded via migrations or added via UI
  }
}
