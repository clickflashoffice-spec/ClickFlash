import type { GameTheoreticYieldQuote, PppCurrencyRate } from '@clickflash/types';

export interface GameTheoreticYieldInput {
  sessionId: string;
  guestFamilySize: number;
  parkDwellHours: number;
  totalPhotosCaptured: number;
  rawCartValueUsd: number;
  negotiationRound?: number;
  currencyCode?: string;
}

export class GameTheoreticYieldService {
  /**
   * Standard PPP (Purchasing Power Parity) exchange rates for global resort guest arbitrage.
   */
  private static readonly PPP_RATES: Record<string, PppCurrencyRate> = {
    USD: { id: 'ppp_usd', currencyCode: 'USD', countryName: 'United States', pppMultiplier: 1.0, rawExchangeRateToUsd: 1.0, localizedSymbol: '$', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() },
    EUR: { id: 'ppp_eur', currencyCode: 'EUR', countryName: 'Eurozone', pppMultiplier: 0.95, rawExchangeRateToUsd: 0.92, localizedSymbol: '€', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() },
    GBP: { id: 'ppp_gbp', currencyCode: 'GBP', countryName: 'United Kingdom', pppMultiplier: 0.90, rawExchangeRateToUsd: 0.79, localizedSymbol: '£', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() },
    AED: { id: 'ppp_aed', currencyCode: 'AED', countryName: 'United Arab Emirates', pppMultiplier: 1.15, rawExchangeRateToUsd: 3.67, localizedSymbol: 'AED', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() },
    BRL: { id: 'ppp_brl', currencyCode: 'BRL', countryName: 'Brazil', pppMultiplier: 0.65, rawExchangeRateToUsd: 5.60, localizedSymbol: 'R$', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() },
    JPY: { id: 'ppp_jpy', currencyCode: 'JPY', countryName: 'Japan', pppMultiplier: 0.75, rawExchangeRateToUsd: 155.0, localizedSymbol: '¥', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() }
  };

  /**
   * Computes price elasticity coefficient based on dwell duration and family engagement.
   */
  public static calculateElasticity(familySize: number, dwellHours: number, photoCount: number): number {
    // Higher photo count + longer dwell = lower elasticity (higher willingness to buy)
    // Larger family = higher sensitivity to per-person unit price
    const engagementFactor = Math.min(2.0, (photoCount / 15) * Math.log2(dwellHours + 1));
    const familySensitivity = Math.max(0.8, familySize * 0.18);
    const elasticity = Number(Math.max(0.35, Math.min(2.5, familySensitivity / engagementFactor)).toFixed(2));
    return elasticity;
  }

  /**
   * Generates a game-theoretic Nash equilibrium pricing quote for real-time guest checkout.
   */
  public static generateYieldQuote(input: GameTheoreticYieldInput): GameTheoreticYieldQuote {
    const round = input.negotiationRound || 1;
    const elasticityScore = this.calculateElasticity(
      input.guestFamilySize,
      input.parkDwellHours,
      input.totalPhotosCaptured
    );

    // Multi-round discount concession curve (Round 1: 10-15%, Round 2: 20-25%, Round 3: 30-35%)
    let baseDiscount = 10 + (round - 1) * 10;
    if (elasticityScore > 1.4) {
      baseDiscount += 10; // High price sensitivity requires steeper initial incentive
    } else if (elasticityScore < 0.6) {
      baseDiscount = Math.max(5, baseDiscount - 5); // Inelastic demand retains higher margin
    }

    const recommendedBundleDiscountPercent = Math.min(45, Math.max(5, baseDiscount));
    const discountMultiplier = 1 - recommendedBundleDiscountPercent / 100;
    const optimizedPriceUsd = Number((input.rawCartValueUsd * discountMultiplier).toFixed(2));

    const includedVipPerks: string[] = ['Instant Full-Resolution Digital Downloads'];

    if (input.totalPhotosCaptured >= 20 || round >= 2) {
      includedVipPerks.push('4K AI Narrative Storyboard Film Unlock');
    }
    if (input.guestFamilySize >= 4 || round >= 3) {
      includedVipPerks.push('Interactive 6-DoF 3D Gaussian Splatting Scene');
    }
    if (round >= 3) {
      includedVipPerks.push('Priority VIP Cloud Download Queue');
    }

    // Expiration urgency: Round 1 (1800s / 30m), Round 2 (900s / 15m), Round 3 (300s / 5m)
    const expirationSeconds = Math.max(300, 1800 - (round - 1) * 600);

    return {
      sessionId: input.sessionId,
      guestFamilySize: input.guestFamilySize,
      parkDwellHours: input.parkDwellHours,
      totalPhotosCaptured: input.totalPhotosCaptured,
      rawCartValueUsd: input.rawCartValueUsd,
      elasticityScore,
      recommendedBundleDiscountPercent,
      optimizedPriceUsd,
      includedVipPerks,
      expirationSeconds,
      negotiationRound: round
    };
  }

  /**
   * Retrieves localized PPP multiplier for foreign guests.
   */
  public static getPppRate(currencyCode: string): PppCurrencyRate {
    return this.PPP_RATES[currencyCode.toUpperCase()] || this.PPP_RATES['USD'];
  }
}
