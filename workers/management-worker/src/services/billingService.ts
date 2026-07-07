import { logger } from '../utils/logger';
import type { Env } from '../server';

export interface BillingEvent {
  deskId: string;
  eventType: string;
  quantity?: number;
}

export interface IngestionCapResult {
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  plan: string;
  reason?: string;
}

export class BillingService {
  constructor(private env: Env) {}

  async trackEvent(event: BillingEvent) {
    try {
      const quantity = event.quantity || 1;
      await this.env.DB.prepare(
        'INSERT INTO billing_events (desk_id, event_type, quantity) VALUES (?, ?, ?)'
      ).bind(event.deskId, event.eventType, quantity).run();
      logger.info(`Tracked billing event ${event.eventType} for desk ${event.deskId}`);
    } catch (error) {
      logger.error(`Failed to track billing event: ${error}`);
      throw error;
    }
  }

  async getInvoice(deskId: string, periodStart: string, periodEnd: string) {
    try {
      const invoice = await this.env.DB.prepare(
        'SELECT * FROM billing_invoices WHERE desk_id = ? AND period_start >= ? AND period_end <= ? ORDER BY created_at DESC LIMIT 1'
      ).bind(deskId, periodStart, periodEnd).first();
      return invoice;
    } catch (error) {
      logger.error(`Failed to get invoice for desk ${deskId}: ${error}`);
      throw error;
    }
  }

  async getUsage(deskId: string) {
    try {
      const events = await this.env.DB.prepare(
        'SELECT event_type, SUM(quantity) as total FROM billing_events WHERE desk_id = ? GROUP BY event_type'
      ).bind(deskId).all();
      return events.results;
    } catch (error) {
      logger.error(`Failed to get usage for desk ${deskId}: ${error}`);
      throw error;
    }
  }

  async getMonthlyPhotoCount(deskId: string): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      
      const result: any = await this.env.DB.prepare(
        "SELECT SUM(quantity) as total FROM billing_events WHERE desk_id = ? AND event_type = 'photo_ingested' AND created_at >= ?"
      ).bind(deskId, startOfMonth).first();

      return result?.total || 0;
    } catch (error) {
      logger.error(`Failed to get monthly photo count for desk ${deskId}: ${error}`);
      return 0;
    }
  }

  async checkPhotoIngestionCap(deskId: string, incomingPhotos: number = 1): Promise<IngestionCapResult> {
    try {
      const license: any = await this.env.DB.prepare(
        "SELECT plan FROM licenses WHERE desk_id = ? AND status = 'active' LIMIT 1"
      ).bind(deskId).first();

      const plan = license?.plan || 'free';
      const currentUsage = await this.getMonthlyPhotoCount(deskId);

      if (plan === 'free') {
        const limit = 100;
        if (currentUsage + incomingPhotos > limit) {
          return {
            allowed: false,
            currentUsage,
            limit,
            plan,
            reason: `Free Tier monthly photo cap of ${limit} exceeded. Current usage: ${currentUsage}.`
          };
        }
        return { allowed: true, currentUsage, limit, plan };
      }

      return { allowed: true, currentUsage, limit: null, plan };
    } catch (error) {
      logger.error(`Failed to check photo ingestion cap for desk ${deskId}: ${error}`);
      // Default fail-open for paid plans if error occurs, or enforce conservative 100 cap
      return { allowed: true, currentUsage: 0, limit: null, plan: 'pro' };
    }
  }
}
