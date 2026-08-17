import { GameTheoreticYieldQuote } from '@clickflash/types';

export interface WhaleGuestProfile {
  sessionId: string;
  guestFamilySize: number;
  parkDwellHours: number;
  totalPhotosCaptured: number;
  baseCartValueUsd: number;
  negotiationRound?: number;
  preferredPerkType?: '3D_SPLATS' | 'MATRIX_VIDEO' | 'NEURAL_HD' | 'ALL_INCLUSIVE';
}

export class WhaleNegotiatorService {
  /**
   * Computes game-theoretic dynamic bundle yield for high-value guests,
   * maximizing basket size and checkout completion through automated micro-concessions.
   */
  public generateYieldQuote(profile: WhaleGuestProfile): GameTheoreticYieldQuote {
    const familySize = Math.max(1, profile.guestFamilySize);
    const dwellHours = Math.max(0.5, profile.parkDwellHours);
    const photoCount = Math.max(1, profile.totalPhotosCaptured);
    const rawCart = Math.max(10, profile.baseCartValueUsd);
    const round = profile.negotiationRound || 1;

    // Elasticity Index: Family groups staying > 4 hours with > 15 photos have high intent
    // but higher price sensitivity to raw single-photo downloads.
    const intentRatio = Math.min(1.0, (photoCount / 20) * 0.5 + (dwellHours / 6) * 0.5);
    const familyMultiplier = Math.min(1.5, 1.0 + (familySize - 1) * 0.12);
    const elasticityScore = Number((intentRatio * familyMultiplier).toFixed(2));

    // Base discount increases with negotiation round up to round 3 (capped at 35%)
    let discountPercent = Math.min(35, Math.floor(10 + elasticityScore * 10 + (round - 1) * 7));
    if (familySize >= 4) {
      discountPercent = Math.min(40, discountPercent + 5);
    }

    const discountedPrice = Number((rawCart * (1 - discountPercent / 100)).toFixed(2));

    // Dynamic VIP perks unlocked based on tier
    const perks: string[] = [
      'ALL_DIGITAL_FULL_RES_DOWNLOADS',
      'UNLIMITED_WATERMARK_FREE_EXPORTS'
    ];

    if (photoCount >= 10 || familySize >= 3) {
      perks.push('3D_GAUSSIAN_SPLAT_SCENE_INCLUDED');
    }
    if (dwellHours >= 3) {
      perks.push('4K_MATRIX_BULLET_TIME_VIDEO_PASS');
    }
    if (discountPercent >= 25) {
      perks.push('VIP_EXPRESS_AI_NEURAL_RELIGHTING');
    }

    return {
      sessionId: profile.sessionId,
      guestFamilySize: familySize,
      parkDwellHours: dwellHours,
      totalPhotosCaptured: photoCount,
      rawCartValueUsd: rawCart,
      elasticityScore,
      recommendedBundleDiscountPercent: discountPercent,
      optimizedPriceUsd: discountedPrice,
      includedVipPerks: perks,
      expirationSeconds: Math.max(300, 900 - (round - 1) * 240), // 15 mins down to 7 mins
      negotiationRound: round
    };
  }
}

export const whaleNegotiatorService = new WhaleNegotiatorService();
