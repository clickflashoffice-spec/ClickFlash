import { logger } from '../utils/logger';
import type { Env } from '../server';

export interface ReferralEvent {
  referrerId: string;
  referredId: string;
  eventType: string;
  amount?: number;
  commissionAmount?: number;
}

export class ReferralService {
  constructor(private env: Env) {}

  async trackEvent(event: ReferralEvent) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO referral_events (referrer_id, referred_id, event_type, amount, commission_amount) VALUES (?, ?, ?, ?, ?)'
      ).bind(event.referrerId, event.referredId, event.eventType, event.amount || 0, event.commissionAmount || 0).run();
      logger.info(`Tracked referral event ${event.eventType} for referrer ${event.referrerId}`);
    } catch (error) {
      logger.error(`Failed to track referral event: ${error}`);
      throw error;
    }
  }

  async getReferralCode(deskId: string) {
    try {
      let code = await this.env.DB.prepare(
        'SELECT referral_code FROM desks WHERE id = ?'
      ).bind(deskId).first('referral_code');

      if (!code) {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        await this.env.DB.prepare(
          'UPDATE desks SET referral_code = ? WHERE id = ?'
        ).bind(code, deskId).run();
      }

      return code;
    } catch (error) {
      logger.error(`Failed to get referral code for desk ${deskId}: ${error}`);
      throw error;
    }
  }

  async getReferralStats(referrerId: string) {
    try {
      const stats = await this.env.DB.prepare(
        'SELECT event_type, COUNT(*) as count, SUM(commission_amount) as total_commission FROM referral_events WHERE referrer_id = ? GROUP BY event_type'
      ).bind(referrerId).all();
      return stats.results;
    } catch (error) {
      logger.error(`Failed to get referral stats for referrer ${referrerId}: ${error}`);
      throw error;
    }
  }
}
