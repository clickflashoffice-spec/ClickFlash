/**
 * Marketing Automation Service
 * Manages email campaigns, customer retention, and upsell workflows
 */

import { EventEmitter } from "../utils/EventEmitter";

interface EmailCampaign {
  id: string;
  name: string;
  type: "welcome" | "retention" | "upsell" | "recovery" | "announcement";
  subject: string;
  template: string;
  schedule?: {
    type: "immediate" | "delay" | "trigger";
    delay?: number; // hours
    trigger?:
      | "gallery-created"
      | "photos-archived"
      | "order-completed"
      | "no-activity";
  };
  targeting: {
    destinations?: string[];
    customerTypes?: ("new" | "returning" | "vip")[];
    minDaysSinceEvent?: number;
    maxDaysSinceEvent?: number;
  };
  status: "draft" | "scheduled" | "active" | "paused" | "completed";
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
  createdAt: Date;
  sentAt?: Date;
}

interface CustomerSegment {
  id: string;
  name: string;
  criteria: {
    minOrders?: number;
    maxOrders?: number;
    minSpent?: number;
    maxSpent?: number;
    destinations?: string[];
    lastOrderWithin?: number; // days
  };
  customerCount: number;
}

interface MarketingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalEmailsSent: number;
  averageOpenRate: number;
  averageClickRate: number;
  conversionRate: number;
  revenueGenerated: number;
}

class MarketingAutomationService extends EventEmitter {
  private campaigns: Map<string, EmailCampaign> = new Map();
  private segments: Map<string, CustomerSegment> = new Map();
  private scheduledJobs: Map<string, any> = new Map();

  /**
   * Create a new email campaign
   */
  createCampaign(
    campaign: Omit<EmailCampaign, "id" | "metrics" | "createdAt">,
  ): EmailCampaign {
    const id = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newCampaign: EmailCampaign = {
      ...campaign,
      id,
      metrics: {
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
      },
      createdAt: new Date(),
    };

    this.campaigns.set(id, newCampaign);
    this.emit("campaign:created", newCampaign);

    // Auto-schedule if configured
    if (
      campaign.schedule?.type === "immediate" &&
      campaign.status === "active"
    ) {
      this.scheduleCampaign(id);
    }

    return newCampaign;
  }

  /**
   * Schedule a campaign for sending
   */
  scheduleCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    // Clear existing schedule if any
    this.unscheduleCampaign(campaignId);

    if (campaign.schedule?.type === "delay" && campaign.schedule.delay) {
      const delayMs = campaign.schedule.delay * 60 * 60 * 1000;

      const timer = setTimeout(() => {
        this.executeCampaign(campaignId);
      }, delayMs);

      this.scheduledJobs.set(campaignId, timer);
      campaign.status = "scheduled";

      this.emit("campaign:scheduled", campaign);
      return true;
    }

    return false;
  }

  /**
   * Unschedule a campaign
   */
  unscheduleCampaign(campaignId: string): boolean {
    const timer = this.scheduledJobs.get(campaignId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledJobs.delete(campaignId);

      const campaign = this.campaigns.get(campaignId);
      if (campaign) {
        campaign.status = "draft";
      }

      return true;
    }
    return false;
  }

  /**
   * Execute a campaign (send emails)
   */
  async executeCampaign(
    campaignId: string,
  ): Promise<{ success: number; failed: number }> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return { success: 0, failed: 0 };

    campaign.status = "active";
    campaign.sentAt = new Date();

    this.emit("campaign:started", campaign);

    // In a real implementation, this would:
    // 1. Query customers based on targeting criteria
    // 2. Send personalized emails via SMTP/Email service
    // 3. Track delivery status
    // 4. Update metrics

    // Simulated execution
    const targetCount = 100; // Would be actual customer count
    let success = 0;
    let failed = 0;

    // Simulate sending
    for (let i = 0; i < targetCount; i++) {
      try {
        // Simulate API call to email service
        await this.simulateEmailSend(campaign);
        success++;
      } catch (error) {
        failed++;
      }
    }

    if (!campaign.metrics) {
      campaign.metrics = { sent: 0, opened: 0, clicked: 0, converted: 0 };
    }
    campaign.metrics.sent = success;
    campaign.status = failed === 0 ? "completed" : "paused";

    this.emit("campaign:completed", campaign, { success, failed });

    return { success, failed };
  }

  /**
   * Simulate email sending (replace with actual email API)
   */
  private async simulateEmailSend(campaign: EmailCampaign): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error("SMTP Error: Connection timeout");
    }
  }

  /**
   * Create a customer segment
   */
  createSegment(
    name: string,
    criteria: CustomerSegment["criteria"],
  ): CustomerSegment {
    const id = `segment-${Date.now()}`;

    const segment: CustomerSegment = {
      id,
      name,
      criteria,
      customerCount: 0, // Would be calculated from database
    };

    this.segments.set(id, segment);
    this.emit("segment:created", segment);

    return segment;
  }

  /**
   * Trigger automated workflows based on events
   */
  triggerWorkflow(trigger: string, context: any): void {
    // Find campaigns with matching trigger
    const matchingCampaigns = Array.from(this.campaigns.values()).filter(
      (c) => c.schedule?.trigger === trigger && c.status === "active",
    );

    for (const campaign of matchingCampaigns) {
      // Check if context matches targeting criteria
      if (this.matchesTargeting(campaign.targeting, context)) {
        // Schedule or execute immediately
        if (campaign.schedule?.delay) {
          this.scheduleCampaign(campaign.id);
        } else {
          this.executeCampaign(campaign.id);
        }
      }
    }

    this.emit("workflow:triggered", trigger, context);
  }

  /**
   * Check if context matches targeting criteria
   */
  private matchesTargeting(
    targeting: EmailCampaign["targeting"],
    context: any,
  ): boolean {
    // Check destination
    if ((targeting.destinations?.length ?? 0) > 0) {
      if (!targeting.destinations?.includes(context.destinationId)) {
        return false;
      }
    }

    // Check days since event
    if (context.eventDate) {
      const daysSince = Math.floor(
        (Date.now() - new Date(context.eventDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (
        targeting.minDaysSinceEvent &&
        daysSince < targeting.minDaysSinceEvent
      ) {
        return false;
      }
      if (
        targeting.maxDaysSinceEvent &&
        daysSince > targeting.maxDaysSinceEvent
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId: string): EmailCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get all campaigns
   */
  getAllCampaigns(): EmailCampaign[] {
    return Array.from(this.campaigns.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Get campaigns by type
   */
  getCampaignsByType(type: EmailCampaign["type"]): EmailCampaign[] {
    return this.getAllCampaigns().filter((c) => c.type === type);
  }

  /**
   * Update campaign
   */
  updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    Object.assign(campaign, updates);
    this.emit("campaign:updated", campaign);
    return true;
  }

  /**
   * Delete campaign
   */
  deleteCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    this.unscheduleCampaign(campaignId);
    this.campaigns.delete(campaignId);

    this.emit("campaign:deleted", campaign);
    return true;
  }

  /**
   * Pause active campaign
   */
  pauseCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.status !== "active") return false;

    campaign.status = "paused";
    this.emit("campaign:paused", campaign);
    return true;
  }

  /**
   * Resume paused campaign
   */
  resumeCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.status !== "paused") return false;

    campaign.status = "active";
    this.emit("campaign:resumed", campaign);
    return true;
  }

  /**
   * Record email engagement (open, click, conversion)
   */
  recordEngagement(
    campaignId: string,
    type: "open" | "click" | "conversion",
    value?: number,
  ): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    if (!campaign.metrics) {
      campaign.metrics = { sent: 0, opened: 0, clicked: 0, converted: 0 };
    }

    switch (type) {
      case "open":
        campaign.metrics.opened++;
        break;
      case "click":
        campaign.metrics.clicked++;
        break;
      case "conversion":
        campaign.metrics.converted++;
        if (value) {
          // Would track revenue generated
        }
        break;
    }

    this.emit("campaign:engagement", campaign, type);
    return true;
  }

  /**
   * Get marketing statistics
   */
  getStats(): MarketingStats {
    const campaigns = this.getAllCampaigns();
    const active = campaigns.filter((c) => c.status === "active");

    const totalSent = campaigns.reduce(
      (sum, c) => sum + (c.metrics?.sent || 0),
      0,
    );
    const totalOpened = campaigns.reduce(
      (sum, c) => sum + (c.metrics?.opened || 0),
      0,
    );
    const totalClicked = campaigns.reduce(
      (sum, c) => sum + (c.metrics?.clicked || 0),
      0,
    );
    const totalConverted = campaigns.reduce(
      (sum, c) => sum + (c.metrics?.converted || 0),
      0,
    );

    const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const avgClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const conversionRate =
      totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: active.length,
      totalEmailsSent: totalSent,
      averageOpenRate: Math.round(avgOpenRate * 100) / 100,
      averageClickRate: Math.round(avgClickRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      revenueGenerated: 0, // Would be calculated from actual conversion data
    };
  }

  /**
   * Get campaign performance report
   */
  getPerformanceReport(campaignId: string): {
    campaign: EmailCampaign;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  } | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const openRate =
      (campaign.metrics?.sent || 0) > 0
        ? ((campaign.metrics?.opened || 0) / campaign.metrics.sent) * 100
        : 0;
    const clickRate =
      (campaign.metrics?.sent || 0) > 0
        ? ((campaign.metrics?.clicked || 0) / campaign.metrics.sent) * 100
        : 0;
    const conversionRate =
      (campaign.metrics?.sent || 0) > 0
        ? ((campaign.metrics?.converted || 0) / campaign.metrics.sent) * 100
        : 0;

    return {
      campaign,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Cleanup completed/old campaigns
   */
  cleanup(maxAgeDays: number = 90): number {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, campaign] of this.campaigns.entries()) {
      if (
        campaign.status === "completed" &&
        campaign.sentAt &&
        campaign.sentAt < cutoff
      ) {
        this.deleteCampaign(id);
        removed++;
      }
    }

    return removed;
  }
}

// Export singleton instance
export const marketingAutomationService = new MarketingAutomationService();
export type { EmailCampaign, CustomerSegment, MarketingStats };
