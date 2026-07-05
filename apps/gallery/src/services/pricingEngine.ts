export interface PricingContext {
    basePrice: number;
    conversionRate: number; // e.g. 0.15 for 15%
    daysSinceCapture: number;
    userLoyaltyScore?: number; // 0-100
    demandIndex?: number; // 0.0 to 2.0 (1.0 is normal)
}

/**
 * AI Dynamic Pricing Engine
 * Adjusts package prices based on conversion velocity and demand to maximize yield.
 */
export class PricingEngine {
    private static readonly MIN_DISCOUNT = 0.5; // Max 50% discount
    private static readonly MAX_SURCHARGE = 1.5; // Max 50% surcharge

    /**
     * Calculates the dynamically adjusted price for a photo package.
     */
    public static calculateDynamicPrice(context: PricingContext): number {
        let multiplier = 1.0;

        // 1. Conversion Rate Adjustment
        // If conversion is > 20%, demand is high, increase price.
        // If conversion is < 5%, demand is low, discount to incentivize.
        if (context.conversionRate > 0.20) {
            multiplier += 0.15; // +15%
        } else if (context.conversionRate > 0.10) {
            multiplier += 0.05; // +5%
        } else if (context.conversionRate < 0.05) {
            multiplier -= 0.15; // -15%
        } else if (context.conversionRate < 0.02) {
            multiplier -= 0.25; // -25%
        }

        // 2. Time Decay (Days Since Capture)
        // Prices drop slightly after 7 days, and heavily after 30 days
        if (context.daysSinceCapture > 30) {
            multiplier -= 0.20;
        } else if (context.daysSinceCapture > 7) {
            multiplier -= 0.05;
        }

        // 3. Demand Index (e.g. holiday weekends)
        if (context.demandIndex !== undefined) {
            // Apply half of the demand index deviation to smooth the curve
            multiplier *= (1 + (context.demandIndex - 1.0) * 0.5);
        }

        // Clamp the multiplier to prevent extreme prices
        multiplier = Math.max(this.MIN_DISCOUNT, Math.min(this.MAX_SURCHARGE, multiplier));

        const finalPrice = context.basePrice * multiplier;

        // Return rounded to nearest 0.99 for retail psychology
        return Math.floor(finalPrice) + 0.99;
    }
}
