/**
 * Money Trash Email Marketing Service
 * Manages automated and manual email campaigns for photo recovery
 */

import { EventEmitter } from "../utils/EventEmitter";

interface EmailCampaign {
  id: string;
  name: string;
  type: "automated" | "manual" | "scheduled";
  trigger: "pre-expiry" | "expiry-day" | "post-expiry" | "bulk" | "manual";
  triggerDays: number; // Days before/after expiry
  template: EmailTemplate;
  recipients: string[]; // Customer emails or 'all'
  segment?: CustomerSegment;
  status: "draft" | "scheduled" | "active" | "completed" | "paused";
  schedule?: {
    sendTime: string; // HH:MM format
    timezone: string;
    daysOfWeek?: number[]; // 0-6
  };
  stats: CampaignStats;
  createdAt: Date;
  sentAt?: Date;
  lastSentAt?: Date;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  html: string;
  previewText: string;
  fromName: string;
  fromEmail: string;
  variables: string[]; // Available template variables
}

interface CustomerSegment {
  id: string;
  name: string;
  criteria: {
    minPhotosArchived?: number;
    maxPhotosArchived?: number;
    daysSinceLastPurchase?: number;
    hasPurchasedBefore?: boolean;
    minTotalSpent?: number;
    destinations?: string[];
  };
  customerCount: number;
}

interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  unsubscribed: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

interface EmailLog {
  id: string;
  campaignId: string;
  recipient: string;
  status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  photoId?: string;
  orderId?: string;
}

class MoneyTrashEmailMarketingService extends EventEmitter {
  private campaigns: Map<string, EmailCampaign> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();
  private segments: Map<string, CustomerSegment> = new Map();
  private emailLogs: EmailLog[] = [];
  private autoSendTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // GDPR Compliance Registry
  private unsubscribedEmails: Set<string> = new Set();

  constructor() {
    super();
    this.initializeDefaultTemplates();
    this.initializeDefaultSegments();
  }

  /**
   * Initialize default email templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: "template_pre_expiry",
        name: "Pre-Expiry Warning",
        subject:
          "Your photos expire in {{daysRemaining}} days - Save them now!",
        previewText: "Don't let your memories disappear...",
        body: `Hi {{customerName}},

Your photos from {{eventName}} will be permanently deleted in {{daysRemaining}} days.

📸 {{photoCount}} photos are waiting for you
🔥 Get them now at {{discountPercentage}}% off
💰 Only {{discountedPrice}} per photo

Don't miss this last chance to save your memories!

View Gallery: {{galleryUrl}}
Access Code: {{accessCode}}

Best regards,
{{companyName}}`,
        html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #ff6b6b, #feca57); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { padding: 30px; }
    .urgency { background: #ffe0e0; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; }
    .cta { background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .gallery-preview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
    .gallery-preview img { width: 100%; height: 150px; object-fit: cover; border-radius: 5px; }
    .price { font-size: 24px; color: #ff6b6b; font-weight: bold; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Last Chance!</h1>
      <p style="color: white; font-size: 18px;">Your photos expire in {{daysRemaining}} days</p>
    </div>
    <div class="content">
      <p>Hi {{customerName}},</p>
      <div class="urgency">
        <strong>Don't let your memories disappear!</strong>
        <p>Your photos from {{eventName}} will be permanently deleted soon.</p>
      </div>
      <div style="text-align: center;">
        <p class="price">{{discountPercentage}}% OFF</p>
        <p>Get all {{photoCount}} photos for just {{discountedPrice}} each</p>
        <a href="{{galleryUrl}}" class="cta">Save My Photos Now</a>
      </div>
      <div class="gallery-preview">
        {{photoThumbnails}}
      </div>
      <p><strong>Access Code:</strong> {{accessCode}}</p>
    </div>
    <div class="footer">
      <p>{{companyName}} | {{companyAddress}}</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`,
        fromName: "ClickFlash Photography",
        fromEmail: "noreply@clickflash.com",
        variables: [
          "customerName",
          "eventName",
          "daysRemaining",
          "photoCount",
          "discountPercentage",
          "discountedPrice",
          "galleryUrl",
          "accessCode",
          "companyName",
          "photoThumbnails",
        ],
      },
      {
        id: "template_final_day",
        name: "Final Day Urgency",
        subject: "🚨 FINAL DAY: Your photos will be deleted tomorrow!",
        previewText: "This is your absolute last chance...",
        body: `URGENT - {{customerName}},

Your photos from {{eventName}} will be PERMANENTLY DELETED in less than 24 hours.

This is your ABSOLUTE LAST CHANCE to save them.

📸 {{photoCount}} photos available
🔥 {{discountPercentage}}% discount
⏰ Expires: {{expiryDate}}

Act now or lose them forever!

{{galleryUrl}}`,
        html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #000; }
    .container { max-width: 600px; margin: 0 auto; background: #111; color: white; }
    .header { background: linear-gradient(135deg, #ff0000, #ff6b00); padding: 40px; text-align: center; }
    .urgency-badge { background: #ff0000; color: white; padding: 10px 20px; font-size: 24px; font-weight: bold; display: inline-block; transform: rotate(-5deg); margin: 20px 0; }
    .content { padding: 30px; }
    .countdown { background: #333; padding: 20px; text-align: center; margin: 20px 0; }
    .countdown-number { font-size: 48px; color: #ff6b00; font-weight: bold; }
    .cta { background: linear-gradient(135deg, #ff6b00, #ff0000); color: white; padding: 20px 40px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-size: 20px; font-weight: bold; }
    .footer { background: #222; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 FINAL DAY 🚨</h1>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <div class="urgency-badge">EXPIRES TONIGHT</div>
      </div>
      <p>Hi {{customerName}},</p>
      <p>Your photos from <strong>{{eventName}}</strong> will be <span style="color: #ff0000;">PERMANENTLY DELETED</span> in less than 24 hours.</p>
      <div class="countdown">
        <p>HURRY! Only</p>
        <div class="countdown-number">{{hoursRemaining}}</div>
        <p>hours remaining</p>
      </div>
      <div style="text-align: center;">
        <a href="{{galleryUrl}}" class="cta">SAVE MY PHOTOS NOW ➜</a>
      </div>
      <p style="text-align: center; color: #ff6b00; font-weight: bold;">
        Don't miss out - {{photoCount}} photos at {{discountPercentage}}% off!
      </p>
    </div>
    <div class="footer">
      <p>Access Code: {{accessCode}}</p>
    </div>
  </div>
</body>
</html>`,
        fromName: "ClickFlash Urgent",
        fromEmail: "urgent@clickflash.com",
        variables: [
          "customerName",
          "eventName",
          "hoursRemaining",
          "photoCount",
          "discountPercentage",
          "galleryUrl",
          "accessCode",
          "expiryDate",
        ],
      },
      {
        id: "template_recovery_success",
        name: "Recovery Success",
        subject: "✅ Photos saved! Download your memories",
        previewText: "Your photos have been successfully recovered...",
        body: `Great news {{customerName}}!

You've successfully saved {{photoCount}} photos from being deleted.

💾 Download your photos: {{downloadUrl}}
📧 Access code: {{accessCode}}

Thank you for preserving your memories with us!

Questions? Reply to this email.

Best regards,
{{companyName}}`,
        html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f0fff0; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #00b894, #00cec9); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { padding: 30px; }
    .success-box { background: #d4edda; border-left: 4px solid #00b894; padding: 20px; margin: 20px 0; }
    .cta { background: #00b894; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Photos Saved!</h1>
    </div>
    <div class="content">
      <p>Hi {{customerName}},</p>
      <div class="success-box">
        <strong>Great news!</strong>
        <p>You've successfully saved {{photoCount}} photos from being permanently deleted.</p>
      </div>
      <div style="text-align: center;">
        <a href="{{downloadUrl}}" class="cta">Download Your Photos</a>
      </div>
    </div>
  </div>
</body>
</html>`,
        fromName: "ClickFlash",
        fromEmail: "support@clickflash.com",
        variables: [
          "customerName",
          "photoCount",
          "downloadUrl",
          "accessCode",
          "companyName",
        ],
      },
    ];

    defaultTemplates.forEach((t) => this.templates.set(t.id, t));
  }

  /**
   * Initialize default customer segments
   */
  private initializeDefaultSegments(): void {
    const defaultSegments: CustomerSegment[] = [
      {
        id: "segment_all",
        name: "All Customers with Archived Photos",
        criteria: {},
        customerCount: 0,
      },
      {
        id: "segment_high_value",
        name: "High Value Customers",
        criteria: {
          minTotalSpent: 100,
          hasPurchasedBefore: true,
        },
        customerCount: 0,
      },
      {
        id: "segment_new",
        name: "First-Time Customers",
        criteria: {
          hasPurchasedBefore: false,
        },
        customerCount: 0,
      },
      {
        id: "segment_bulk",
        name: "Bulk Photo Owners (20+ photos)",
        criteria: {
          minPhotosArchived: 20,
        },
        customerCount: 0,
      },
    ];

    defaultSegments.forEach((s) => this.segments.set(s.id, s));
  }

  /**
   * Create email campaign
   */
  createCampaign(
    campaign: Omit<EmailCampaign, "id" | "createdAt" | "stats">,
  ): EmailCampaign {
    const newCampaign: EmailCampaign = {
      ...campaign,
      id: `campaign_${Date.now()}`,
      createdAt: new Date(),
      stats: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        revenue: 0,
        unsubscribed: 0,
        bounced: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
      },
    };

    this.campaigns.set(newCampaign.id, newCampaign);

    if (campaign.type === "automated" && campaign.status === "active") {
      this.scheduleAutomatedCampaign(newCampaign);
    }

    this.emit("campaign:created", newCampaign);
    return newCampaign;
  }

  /**
   * Schedule automated campaign
   */
  private scheduleAutomatedCampaign(campaign: EmailCampaign): void {
    // Check daily for triggers
    const checkInterval = setInterval(
      async () => {
        await this.checkAndSendAutomatedEmails(campaign);
      },
      24 * 60 * 60 * 1000,
    ); // Daily

    this.autoSendTimers.set(campaign.id, checkInterval);
  }

  /**
   * Check and send automated emails
   */
  private async checkAndSendAutomatedEmails(
    campaign: EmailCampaign,
  ): Promise<void> {
    // In real implementation, query database for photos expiring in triggerDays
    const expiringPhotos = await this.getExpiringPhotos(campaign.triggerDays);

    for (const photo of expiringPhotos) {
      // Check if email already sent
      const alreadySent = this.emailLogs.some(
        (log) =>
          log.campaignId === campaign.id &&
          log.recipient === photo.customerEmail &&
          log.status !== "failed",
      );

      if (!alreadySent) {
        await this.sendEmail(campaign, photo);
      }
    }
  }

  /**
   * Get photos expiring in given days
   */
  private async getExpiringPhotos(_days: number): Promise<Record<string, unknown>[]> {
    // Mock implementation - would query database
    return [];
  }

  /**
   * Send single email
   */
  private async sendEmail(
    campaign: EmailCampaign,
    recipientData: Record<string, unknown>,
  ): Promise<boolean> {
    const recipientEmail = String(recipientData.customerEmail ?? "");

    // Privacy Interceptor: Abort if user has opted out (GDPR Compliance)
    if (this.unsubscribedEmails.has(recipientEmail)) {
      console.warn(`[GDPR] Blocked outbound email to unsubscribed user: ${recipientEmail}`);
      return false;
    }

    try {
      // Process template variables
      const _processedHtml = this.processTemplate(campaign.template.html, {
        ...recipientData,
        galleryUrl: `https://clickflash.com/gallery/${String(recipientData.accessCode ?? "")}`,
        companyName: "ClickFlash Photography",
      });

      // Send via email service (SMTP/API)
      // const result = await emailService.send({...});

      // Log the send
      const log: EmailLog = {
        id: `log_${Date.now()}`,
        campaignId: campaign.id,
        recipient: String(recipientData.customerEmail ?? ""),
        status: "sent",
        sentAt: new Date(),
      };
      this.emailLogs.push(log);

      // Update stats
      campaign.stats.sent++;
      campaign.lastSentAt = new Date();

      this.emit("email:sent", log);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  /**
   * Process template with variables
   */
  private processTemplate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      processed = processed.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }
    return processed;
  }

  /**
   * Send bulk campaign
   */
  async sendBulkCampaign(
    campaignId: string,
    recipientList: string[],
  ): Promise<{ sent: number; failed: number }> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    for (const recipient of recipientList) {
      const success = await this.sendEmail(campaign, {
        customerEmail: recipient,
      });
      if (success) sent++;
      else failed++;
    }

    campaign.sentAt = new Date();
    campaign.status = "completed";
    this.emit("campaign:completed", campaign, { sent, failed });

    return { sent, failed };
  }

  /**
   * Track email open
   */
  trackOpen(logId: string): void {
    const log = this.emailLogs.find((l) => l.id === logId);
    if (log && log.status === "delivered") {
      log.status = "opened";
      log.openedAt = new Date();

      const campaign = this.campaigns.get(log.campaignId);
      if (campaign) {
        campaign.stats.opened++;
        campaign.stats.openRate =
          (campaign.stats.opened / campaign.stats.delivered) * 100;
      }

      this.emit("email:opened", log);
    }
  }

  /**
   * Track email click
   */
  trackClick(logId: string, photoId?: string): void {
    const log = this.emailLogs.find((l) => l.id === logId);
    if (log) {
      log.status = "clicked";
      log.clickedAt = new Date();
      log.photoId = photoId;

      const campaign = this.campaigns.get(log.campaignId);
      if (campaign) {
        campaign.stats.clicked++;
        campaign.stats.clickRate =
          (campaign.stats.clicked / campaign.stats.delivered) * 100;
      }

      this.emit("email:clicked", log);
    }
  }

  /**
   * Track conversion (purchase)
   */
  trackConversion(logId: string, orderId: string, revenue: number): void {
    const log = this.emailLogs.find((l) => l.id === logId);
    if (log) {
      log.orderId = orderId;

      const campaign = this.campaigns.get(log.campaignId);
      if (campaign) {
        campaign.stats.converted++;
        campaign.stats.revenue += revenue;
        campaign.stats.conversionRate =
          (campaign.stats.converted / campaign.stats.clicked) * 100;
      }

      this.emit("email:converted", log, revenue);
    }
  }

  /**
   * Get all campaigns
   */
  getCampaigns(): EmailCampaign[] {
    return Array.from(this.campaigns.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Get campaign by ID
   */
  getCampaign(id: string): EmailCampaign | undefined {
    return this.campaigns.get(id);
  }

  /**
   * Get email templates
   */
  getTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get customer segments
   */
  getSegments(): CustomerSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Get campaign analytics
   */
  getAnalytics(campaignId: string): CampaignStats | null {
    const campaign = this.campaigns.get(campaignId);
    return campaign ? campaign.stats : null;
  }

  /**
   * Get global analytics
   */
  getGlobalAnalytics(): {
    totalCampaigns: number;
    totalEmailsSent: number;
    totalRevenue: number;
    avgOpenRate: number;
    avgClickRate: number;
    avgConversionRate: number;
  } {
    const campaigns = this.getCampaigns();
    const totalEmails = campaigns.reduce((sum, c) => sum + c.stats.sent, 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.stats.revenue, 0);

    return {
      totalCampaigns: campaigns.length,
      totalEmailsSent: totalEmails,
      totalRevenue,
      avgOpenRate:
        campaigns.length > 0
          ? campaigns.reduce((sum, c) => sum + c.stats.openRate, 0) /
            campaigns.length
          : 0,
      avgClickRate:
        campaigns.length > 0
          ? campaigns.reduce((sum, c) => sum + c.stats.clickRate, 0) /
            campaigns.length
          : 0,
      avgConversionRate:
        campaigns.length > 0
          ? campaigns.reduce((sum, c) => sum + c.stats.conversionRate, 0) /
            campaigns.length
          : 0,
    };
  }

  /**
   * Pause campaign
   */
  pauseCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    campaign.status = "paused";

    // Clear auto-send timer
    const timer = this.autoSendTimers.get(campaignId);
    if (timer) {
      clearInterval(timer);
      this.autoSendTimers.delete(campaignId);
    }

    this.emit("campaign:paused", campaign);
    return true;
  }

  /**
   * Resume campaign
   */
  resumeCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.status !== "paused") return false;

    campaign.status = "active";

    if (campaign.type === "automated") {
      this.scheduleAutomatedCampaign(campaign);
    }

    this.emit("campaign:resumed", campaign);
    return true;
  }

  /**
   * Delete campaign
   */
  deleteCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    // Clear timer
    const timer = this.autoSendTimers.get(campaignId);
    if (timer) {
      clearInterval(timer);
      this.autoSendTimers.delete(campaignId);
    }

    this.campaigns.delete(campaignId);
    this.emit("campaign:deleted", campaign);
    return true;
  }

  /**
   * GDPR: Register user opt-out and block future communications
   */
  unsubscribeUser(email: string): void {
    if (!email) return;
    this.unsubscribedEmails.add(email);
    this.emit("user:unsubscribed", email);
  }

  /**
   * GDPR Article 17: Right to be Forgotten
   * Erases all PII logs and communication history for the given email
   */
  rightToBeForgotten(email: string): void {
    if (!email) return;
    
    // 1. Block future communications
    this.unsubscribeUser(email);

    // 2. Erase historical tracking PII
    const initialLogCount = this.emailLogs.length;
    this.emailLogs = this.emailLogs.filter((log) => log.recipient !== email);
    
    console.warn(`[GDPR] Right to be Forgotten executed for ${email}. Purged ${initialLogCount - this.emailLogs.length} logs.`);
    this.emit("user:forgotten", email);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    for (const [_id, timer] of this.autoSendTimers) {
      clearInterval(timer);
    }
    this.autoSendTimers.clear();
    this.removeAllListeners();
  }
}

// Export singleton
export const moneyTrashEmailMarketing = new MoneyTrashEmailMarketingService();
export type {
  EmailCampaign,
  EmailTemplate,
  CustomerSegment,
  CampaignStats,
  EmailLog,
};
