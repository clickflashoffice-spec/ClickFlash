/**
 * ClickFlash Dynamic Yield & Arbitrage Engine
 * Calculates dynamic pricing curves and time-decay discounts for abandoned photo carts.
 */

export interface GuestCart {
  guestId: string;
  guestName: string;
  resortName: string;
  photoCount: number;
  basePrice: number;
  hoursSinceAbandonment: number;
  activityType?: string;
  isVip?: boolean;
}

export interface DynamicOffer {
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  discountCode: string;
  expiresInMinutes: number;
  magicLink: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class YieldArbitrageEngine {
  /**
   * Calculates the optimal dynamic discount based on price elasticity and time decay.
   */
  static calculateOffer(cart: GuestCart): DynamicOffer {
    const { photoCount, basePrice, hoursSinceAbandonment, isVip } = cart;

    // Time decay curve: discount increases as time passes, up to 40%
    let discountPercent = 10;
    let urgencyLevel: DynamicOffer['urgencyLevel'] = 'LOW';

    if (hoursSinceAbandonment >= 48) {
      discountPercent = 35;
      urgencyLevel = 'CRITICAL';
    } else if (hoursSinceAbandonment >= 24) {
      discountPercent = 25;
      urgencyLevel = 'HIGH';
    } else if (hoursSinceAbandonment >= 6) {
      discountPercent = 15;
      urgencyLevel = 'MEDIUM';
    }

    // Volume bonus: larger galleries get an extra nudge
    if (photoCount >= 30) {
      discountPercent += 5;
    }

    // VIP cap to protect brand equity
    if (isVip && discountPercent > 20) {
      discountPercent = 20;
    }

    // Cap maximum discount at 40%
    discountPercent = Math.min(discountPercent, 40);

    const discountedPrice = Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;
    const discountCode = `SAVE${discountPercent}_` + Math.random().toString(36).substring(2, 7).toUpperCase();
    const expiresInMinutes = hoursSinceAbandonment >= 24 ? 120 : 360; // 2 hrs if old, 6 hrs if recent
    const magicLink = `https://gallery.clickflash.io/checkout?guest=${cart.guestId}&code=${discountCode}`;

    return {
      originalPrice: basePrice,
      discountedPrice,
      discountPercent,
      discountCode,
      expiresInMinutes,
      magicLink,
      urgencyLevel
    };
  }

  /**
   * Formats a personalized WhatsApp recovery message.
   */
  static formatWhatsAppPitch(cart: GuestCart, offer: DynamicOffer): string {
    return [
      `🌴 *Hey ${cart.guestName}!* Your vacation memories at *${cart.resortName}* are ready.`,
      '',
      `We captured ${cart.photoCount} high-res photos from your ${cart.activityType || 'resort'} experience!`,
      '',
      `⏳ *Exclusive Offer:* Unlock your entire album for *$${offer.discountedPrice}* (was $${offer.originalPrice}) with code *${offer.discountCode}*.`,
      '',
      `👉 *Instant Download:* ${offer.magicLink}`,
      '',
      `⚠️ _Offer expires in ${offer.expiresInMinutes} minutes!_`
    ].join('\n');
  }
}
