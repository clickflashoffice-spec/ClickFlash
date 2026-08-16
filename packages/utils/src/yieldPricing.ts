import { YieldPricingConfig, CrowdDensity, WeatherCondition, TimeOfDay } from '@clickflash/types';

export class YieldPricingService {
    /**
     * Executes the cloud-side surge pricing algorithm for a given destination.
     * Evaluates weather and occupancy telemetry to calculate the new basePrice multiplier.
     */
    public evaluateYield(
        config: YieldPricingConfig,
        telemetry: { crowdDensity?: CrowdDensity; weather?: WeatherCondition; timeOfDay?: TimeOfDay }
    ): number {
        if (!config.isActive) return config.basePrice;

        let multiplier = 1.0;

        // 1. Time-of-day surge
        if (config.rules.timeOfDayMultipliers && telemetry.timeOfDay) {
            const mod = config.rules.timeOfDayMultipliers[telemetry.timeOfDay];
            if (mod !== undefined) multiplier *= mod;
        }

        // 2. Weather modifier
        if (config.rules.weatherMultiplier && telemetry.weather) {
            const mod = config.rules.weatherMultiplier[telemetry.weather];
            if (mod !== undefined) multiplier *= mod;
        }

        // 3. Occupancy surge (Crowd Density)
        if (config.rules.crowdDensityMultiplier && telemetry.crowdDensity) {
            const mod = config.rules.crowdDensityMultiplier[telemetry.crowdDensity];
            if (mod !== undefined) multiplier *= mod;
        }

        // Calculate final bounded price
        let finalPrice = config.basePrice * multiplier;
        finalPrice = Math.max(config.minPrice, Math.min(config.maxPrice, finalPrice));
        
        return Math.round(finalPrice * 100) / 100;
    }
}

export const yieldPricingService = new YieldPricingService();
