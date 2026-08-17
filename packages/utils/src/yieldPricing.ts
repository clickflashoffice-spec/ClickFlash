import { YieldPricingConfig, CrowdDensity, WeatherCondition, TimeOfDay } from '@clickflash/types';

export class YieldPricingService {
    /**
     * Executes the cloud-side surge pricing algorithm for a given destination.
     * Evaluates weather and occupancy telemetry to calculate the new basePrice multiplier.
     */
    public evaluateYield(
        config: YieldPricingConfig,
        telemetry: { crowdDensity?: CrowdDensity; weather?: WeatherCondition; timeOfDay?: TimeOfDay },
        experimentCohortId?: string
    ): number {
        if (!config.isActive) return config.basePrice;

        let multiplier = 1.0;

        // Apply experiment cohort multiplier if defined
        if (experimentCohortId && config.rules.experimentMultipliers) {
            const mod = config.rules.experimentMultipliers[experimentCohortId];
            if (mod !== undefined) multiplier *= mod;
        }

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

        // 4. Aggressive Surge Synergy (Peak Demand)
        // Maximize yield when the park is packed during prime hours
        if (
            telemetry.crowdDensity === 'Peak' && 
            (telemetry.timeOfDay === 'Afternoon' || telemetry.timeOfDay === 'Evening')
        ) {
            multiplier *= 1.5; // Additional 50% aggressive surge
        } else if (
            telemetry.crowdDensity === 'High' && 
            telemetry.timeOfDay === 'Evening'
        ) {
            multiplier *= 1.25; // Additional 25% surge
        }

        // Calculate final bounded price
        let finalPrice = config.basePrice * multiplier;
        finalPrice = Math.max(config.minPrice, Math.min(config.maxPrice, finalPrice));
        
        return Math.round(finalPrice * 100) / 100;
    }
}

export const yieldPricingService = new YieldPricingService();
