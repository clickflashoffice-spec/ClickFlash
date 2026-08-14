/**
 * ClickFlash Cloud Backend Worker - Dynamic Yield Pricing Engine
 * Adjusts pricing of galleries and digital products autonomously based on real-time 
 * factors like time-of-day, historical demand, and perceived value.
 */

export interface PricingContext {
    basePrice: number;
    galleryId: string;
    locationId: string;
    timestamp: number;
    footTrafficScore?: number; // 0.0 to 1.0 (requires external integration)
}

export class DynamicPricingEngine {
    
    /**
     * Calculates the dynamic price for a product.
     */
    public calculateDynamicPrice(context: PricingContext): number {
        console.log(`[DynamicPricing] Calculating yield price for gallery ${context.galleryId} at ${new Date(context.timestamp).toISOString()}`);
        
        let multiplier = 1.0;
        const hour = new Date(context.timestamp).getUTCHours();

        // Time-of-day logic (e.g., higher prices during peak evening hours when nostalgia is high)
        if (hour >= 18 && hour <= 22) {
            multiplier += 0.15; // +15% premium during prime time
            console.log(`[DynamicPricing] Applied prime-time multiplier (+15%)`);
        } else if (hour >= 2 && hour <= 8) {
            multiplier -= 0.10; // -10% discount during off-peak night hours
            console.log(`[DynamicPricing] Applied off-peak discount (-10%)`);
        }

        // Foot traffic / demand multiplier (Surge Pricing)
        if (context.footTrafficScore && context.footTrafficScore > 0.8) {
            multiplier += 0.20; // +20% during extreme surge (e.g., immediately after a rollercoaster ride)
            console.log(`[DynamicPricing] Applied extreme surge multiplier (+20%)`);
        } else if (context.footTrafficScore && context.footTrafficScore < 0.3) {
            multiplier -= 0.05; // Small discount during low foot traffic to incentivize purchase
            console.log(`[DynamicPricing] Applied low-demand discount (-5%)`);
        }

        const finalPrice = Math.round((context.basePrice * multiplier) * 100) / 100;
        console.log(`[DynamicPricing] Final computed price: $${finalPrice} (Base: $${context.basePrice})`);

        return finalPrice;
    }
}

export const dynamicPricingEngine = new DynamicPricingEngine();
