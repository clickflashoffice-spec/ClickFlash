import DatabaseManager from "../db.js";
import EmailRelayService from "./emailRelayService.js";
import Logger from "../logger.js";

/**
 * Marketing Automation Service
 * Handles scheduled campaigns like MoneyTrash (nurturing customers with unsold photos).
 */
export class MarketingAutomationService {
  private db: DatabaseManager;
  private emailService: EmailRelayService;
  private logger: Logger;

  constructor(db: DatabaseManager, emailService: EmailRelayService) {
    this.db = db;
    this.emailService = emailService;
    this.logger = new Logger("MarketingAutomationService");
  }

  /**
   * Process daily MoneyTrash campaigns.
   * Scans for customers who viewed photos but didn't buy them within the last 24-48 hours.
   */
  async processDailyCampaigns(): Promise<void> {
    this.logger.info("Starting daily MoneyTrash campaign processing...");

    try {
      // 1. Identify customers with 'archived' photos who haven't purchased
      // We look for orders where status is 'Pending' or no order exists for that email/album combination
      // but the photos are marked as 'archived' (MoneyTrash candidate).

      const cutoffStart = new Date(
        Date.now() - 48 * 60 * 60 * 1000,
      ).toISOString();
      const cutoffEnd = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();

      const candidates = await this.db.query(
        `
        SELECT DISTINCT o.id as order_id, o.email, o.clientName, o.albumId, o.desk_id, COUNT(p.id) as photo_count
        FROM orders o
        JOIN photos p ON o.albumId = p.albumId
        WHERE p.status = 'archived'
          AND o.status = 'Pending'
          AND o.created_at BETWEEN ? AND ?
          AND o.email IS NOT NULL
          AND (o.marketing_emails_sent IS NULL OR o.marketing_emails_sent = 0)
        GROUP BY o.email, o.albumId
      `,
        [cutoffStart, cutoffEnd],
      );

      this.logger.info(
        `Found ${candidates.length} potential MoneyTrash targets.`,
      );

      await Promise.all(candidates.map(candidate => this.sendNurtureEmail(candidate)));

      this.logger.info("MoneyTrash campaign processing complete.");
    } catch (error: any) {
      this.logger.error("Failed to process daily campaigns", {
        error: error.message,
      });
    }
  }

  private async sendNurtureEmail(target: any): Promise<void> {
    const { email, clientName, albumId, photo_count } = target;

    // Check if we already sent a nurture email for this album to avoid spamming
    // In a real system, we'd have a 'campaign_logs' table.

    this.logger.info(`Sending nurture email to ${email} for album ${albumId}`);

    const galleryUrl = `https://www.clicketflash.com/gallery/${albumId}`;
    const discountCode = "FLASH50"; // Automated 50% discount for MoneyTrash

    const subject = "Don't lose your memories! 📸 50% Off your photos";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #06b6d4;">Hello ${clientName || "there"},</h2>
        <p>We noticed you haven't unlocked your ${photo_count} beautiful photos from your recent session.</p>
        <p style="background: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4;">
          <strong>Special Offer:</strong> Use code <span style="color: #06b6d4; font-size: 1.2em;">${discountCode}</span> 
          to get <strong>50% OFF</strong> your entire gallery!
        </p>
        <p>This offer expires in 24 hours as these photos are scheduled for permanent deletion from our active servers soon.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${galleryUrl}" style="background: #06b6d4; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View My Photos</a>
        </div>
        <p style="font-size: 0.8em; color: #64748b;">If you've already purchased your photos, please ignore this email.</p>
      </div>
    `;

    const sent = await this.emailService.sendEmail({
      to: email,
      from: "offers@clicketflash.com", // Professional Marketing Alias
      fromName: "ClickFlash Offers",
      subject: subject,
      html: html,
      text: `Hello! Use code ${discountCode} for 50% off your ${photo_count} photos at ${galleryUrl}`,
    });

    if (sent && target.order_id) {
      await this.db.run(
        "UPDATE orders SET marketing_emails_sent = COALESCE(marketing_emails_sent, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [target.order_id],
      );
    }
  }
}

export default MarketingAutomationService;
