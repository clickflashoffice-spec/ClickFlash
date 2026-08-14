/**
 * Referral Tracking Service
 * Manages customer referral program with tracking, rewards, and analytics
 */

import { EventEmitter } from "../utils/EventEmitter";

interface Referral {
  id: string;
  referrerId: string; // Customer who referred
  refereeId: string; // New customer who was referred
  referralCode: string;
  status: "pending" | "completed" | "expired" | "cancelled";
  reward: {
    type: "discount" | "credit" | "cash";
    amount: number;
    currency: string;
    description: string;
  };
  orderValue?: number;
  commission?: number;
  createdAt: Date;
  convertedAt?: Date;
  expiresAt: Date;
}

interface ReferrerProfile {
  customerId: string;
  name: string;
  email: string;
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
  availableCredits: number;
  lifetimeValue: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface ReferralProgramConfig {
  rewardType: "percentage" | "fixed";
  referrerReward: number; // Percentage or fixed amount
  refereeReward: number; // Percentage or fixed amount
  minOrderValue: number;
  expirationDays: number;
  maxReferralsPerPerson: number;
  tiers: Array<{
    name: string;
    minReferrals: number;
    bonusMultiplier: number;
  }>;
}

interface ReferralStats {
  totalReferrals: number;
  conversionRate: number;
  totalRevenue: number;
  totalRewardsGiven: number;
  topReferrers: Array<{ customerId: string; name: string; count: number }>;
}

class ReferralTrackingService extends EventEmitter {
  private referrals: Map<string, Referral> = new Map();
  private referrers: Map<string, ReferrerProfile> = new Map();
  private config: ReferralProgramConfig;

  constructor(config?: Partial<ReferralProgramConfig>) {
    super();
    this.config = {
      rewardType: "percentage",
      referrerReward: 10, // 10% commission
      refereeReward: 15, // 15% discount on first order
      minOrderValue: 50,
      expirationDays: 30,
      maxReferralsPerPerson: 50,
      tiers: [
        { name: "bronze", minReferrals: 0, bonusMultiplier: 1 },
        { name: "silver", minReferrals: 5, bonusMultiplier: 1.25 },
        { name: "gold", minReferrals: 15, bonusMultiplier: 1.5 },
        { name: "platinum", minReferrals: 50, bonusMultiplier: 2 },
      ],
      ...config,
    };
  }

  /**
   * Generate unique referral code for customer
   */
  generateReferralCode(customerId: string, name: string): string {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 8);
    const random = Math.random().toString(36).substring(2, 6);
    return `${sanitized}${random}`;
  }

  /**
   * Register a new referrer
   */
  registerReferrer(
    customerId: string,
    name: string,
    email: string,
  ): ReferrerProfile {
    const existing = this.referrers.get(customerId);
    if (existing) return existing;

    const referralCode = this.generateReferralCode(customerId, name);

    const profile: ReferrerProfile = {
      customerId,
      name,
      email,
      referralCode,
      totalReferrals: 0,
      successfulReferrals: 0,
      pendingReferrals: 0,
      totalRewards: 0,
      availableCredits: 0,
      lifetimeValue: 0,
      tier: "bronze",
    };

    this.referrers.set(customerId, profile);
    this.emit("referrer:registered", profile);

    return profile;
  }

  /**
   * Create a new referral
   */
  createReferral(
    referrerId: string,
    refereeEmail: string,
    orderValue?: number,
  ): { referral: Referral; referralLink: string } | null {
    const referrer = this.referrers.get(referrerId);
    if (!referrer) return null;

    // Check max referrals limit
    if (referrer.totalReferrals >= this.config.maxReferralsPerPerson) {
      return null;
    }

    const referralId = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const referralCode = this.generateReferralCode(referrerId, refereeEmail);

    // Calculate reward based on tier
    const tier = this.getTier(referrer.successfulReferrals);
    const rewardAmount =
      this.config.rewardType === "percentage"
        ? (orderValue || 100) *
          (this.config.referrerReward / 100) *
          tier.bonusMultiplier
        : this.config.referrerReward * tier.bonusMultiplier;

    const referral: Referral = {
      id: referralId,
      referrerId,
      refereeId: "", // Will be set when referee signs up
      referralCode,
      status: "pending",
      reward: {
        type: "credit",
        amount: rewardAmount,
        currency: "USD",
        description: `${this.config.referrerReward}% commission (${tier.name} tier: ${tier.bonusMultiplier}x)`,
      },
      orderValue,
      createdAt: new Date(),
      expiresAt: new Date(
        Date.now() + this.config.expirationDays * 24 * 60 * 60 * 1000,
      ),
    };

    this.referrals.set(referralId, referral);

    // Update referrer stats
    referrer.totalReferrals++;
    referrer.pendingReferrals++;

    this.emit("referral:created", referral, referrer);

    const referralLink = `https://clickflash.com/?ref=${referralCode}`;

    return { referral, referralLink };
  }

  /**
   * Convert a referral when referee makes first purchase
   */
  convertReferral(
    referralCode: string,
    refereeId: string,
    orderValue: number,
  ): Referral | null {
    // Find referral by code
    const referral = Array.from(this.referrals.values()).find(
      (r) => r.referralCode === referralCode && r.status === "pending",
    );

    if (!referral) return null;

    // Check if expired
    if (new Date() > referral.expiresAt) {
      referral.status = "expired";
      this.emit("referral:expired", referral);
      return null;
    }

    // Check minimum order value
    if (orderValue < this.config.minOrderValue) {
      return null;
    }

    // Convert referral
    referral.refereeId = refereeId;
    referral.orderValue = orderValue;
    referral.status = "completed";
    referral.convertedAt = new Date();

    // Calculate commission
    const tier = this.getTier(
      this.referrers.get(referral.referrerId)?.successfulReferrals || 0,
    );
    referral.commission =
      orderValue * (this.config.referrerReward / 100) * tier.bonusMultiplier;

    // Update referrer
    const referrer = this.referrers.get(referral.referrerId);
    if (referrer) {
      referrer.successfulReferrals++;
      referrer.pendingReferrals--;
      referrer.totalRewards += referral.commission;
      referrer.availableCredits += referral.commission;
      referrer.lifetimeValue += orderValue;

      // Update tier
      referrer.tier = this.calculateTier(referrer.successfulReferrals);
    }

    this.emit("referral:converted", referral, referrer);

    return referral;
  }

  /**
   * Apply referral discount for new customer (referee)
   */
  getRefereeDiscount(referralCode: string): {
    valid: boolean;
    discount: number;
    message: string;
  } {
    const referral = Array.from(this.referrals.values()).find(
      (r) => r.referralCode === referralCode && r.status === "pending",
    );

    if (!referral) {
      return { valid: false, discount: 0, message: "Invalid referral code" };
    }

    if (new Date() > referral.expiresAt) {
      return {
        valid: false,
        discount: 0,
        message: "Referral code has expired",
      };
    }

    return {
      valid: true,
      discount: this.config.refereeReward,
      message: `${this.config.refereeReward}% off your first order!`,
    };
  }

  /**
   * Get tier based on referral count
   */
  private getTier(
    successfulReferrals: number,
  ): ReferralProgramConfig["tiers"][0] {
    for (let i = this.config.tiers.length - 1; i >= 0; i--) {
      if (successfulReferrals >= this.config.tiers[i].minReferrals) {
        return this.config.tiers[i];
      }
    }
    return this.config.tiers[0];
  }

  /**
   * Calculate tier name based on referrals
   */
  private calculateTier(successfulReferrals: number): ReferrerProfile["tier"] {
    if (successfulReferrals >= 50) return "platinum";
    if (successfulReferrals >= 15) return "gold";
    if (successfulReferrals >= 5) return "silver";
    return "bronze";
  }

  /**
   * Get referrer profile
   */
  getReferrer(customerId: string): ReferrerProfile | undefined {
    return this.referrers.get(customerId);
  }

  /**
   * Get referrer by code
   */
  getReferrerByCode(code: string): ReferrerProfile | undefined {
    return Array.from(this.referrers.values()).find(
      (r) => r.referralCode === code,
    );
  }

  /**
   * Get all referrers
   */
  getAllReferrers(): ReferrerProfile[] {
    return Array.from(this.referrers.values()).sort(
      (a, b) => b.totalRewards - a.totalRewards,
    );
  }

  /**
   * Get referrals by referrer
   */
  getReferralsByReferrer(referrerId: string): Referral[] {
    return Array.from(this.referrals.values())
      .filter((r) => r.referrerId === referrerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get referral statistics
   */
  getStats(): ReferralStats {
    const referrals = Array.from(this.referrals.values());
    const completed = referrals.filter((r) => r.status === "completed");

    const conversionRate =
      referrals.length > 0 ? (completed.length / referrals.length) * 100 : 0;

    const totalRevenue = completed.reduce(
      (sum, r) => sum + (r.orderValue || 0),
      0,
    );
    const totalRewards = completed.reduce(
      (sum, r) => sum + (r.commission || 0),
      0,
    );

    // Top referrers
    const topReferrers = this.getAllReferrers()
      .slice(0, 10)
      .map((r) => ({
        customerId: r.customerId,
        name: r.name,
        count: r.successfulReferrals,
      }));

    return {
      totalReferrals: referrals.length,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalRevenue,
      totalRewardsGiven: totalRewards,
      topReferrers,
    };
  }

  /**
   * Redeem referrer credits
   */
  redeemCredits(
    customerId: string,
    amount: number,
  ): { success: boolean; message: string } {
    const referrer = this.referrers.get(customerId);
    if (!referrer) {
      return { success: false, message: "Referrer not found" };
    }

    if (referrer.availableCredits < amount) {
      return { success: false, message: "Insufficient credits" };
    }

    referrer.availableCredits -= amount;

    this.emit("credits:redeemed", customerId, amount);

    return {
      success: true,
      message: `${amount} credits redeemed successfully`,
    };
  }

  /**
   * Cancel a pending referral
   */
  cancelReferral(referralId: string): boolean {
    const referral = this.referrals.get(referralId);
    if (!referral || referral.status !== "pending") return false;

    referral.status = "cancelled";

    // Update referrer stats
    const referrer = this.referrers.get(referral.referrerId);
    if (referrer) {
      referrer.pendingReferrals--;
    }

    this.emit("referral:cancelled", referral);
    return true;
  }

  /**
   * Process expired referrals
   */
  processExpiredReferrals(): number {
    const now = new Date();
    let expired = 0;

    for (const referral of this.referrals.values()) {
      if (referral.status === "pending" && now > referral.expiresAt) {
        referral.status = "expired";

        // Update referrer stats
        const referrer = this.referrers.get(referral.referrerId);
        if (referrer) {
          referrer.pendingReferrals--;
        }

        this.emit("referral:expired", referral);
        expired++;
      }
    }

    return expired;
  }

  /**
   * Get referral leaderboard
   */
  getLeaderboard(limit: number = 10): ReferrerProfile[] {
    return this.getAllReferrers()
      .sort((a, b) => {
        // Sort by successful referrals first, then by total rewards
        if (b.successfulReferrals !== a.successfulReferrals) {
          return b.successfulReferrals - a.successfulReferrals;
        }
        return b.totalRewards - a.totalRewards;
      })
      .slice(0, limit);
  }

  /**
   * Update program configuration
   */
  updateConfig(updates: Partial<ReferralProgramConfig>): void {
    Object.assign(this.config, updates);
    this.emit("config:updated", this.config);
  }

  /**
   * Get program configuration
   */
  getConfig(): ReferralProgramConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const referralTrackingService = new ReferralTrackingService();
export type { Referral, ReferrerProfile, ReferralProgramConfig, ReferralStats };
