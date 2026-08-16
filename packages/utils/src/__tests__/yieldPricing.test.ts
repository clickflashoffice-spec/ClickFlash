import { describe, it, expect } from 'vitest';
import { yieldPricingService, YieldPricingService } from '../yieldPricing.js';
import type { YieldPricingConfig } from '@clickflash/types';

describe('YieldPricingService', () => {
    const baseConfig: YieldPricingConfig = {
        destinationId: 'dest-resort-01',
        isActive: true,
        basePrice: 50.00,
        minPrice: 30.00,
        maxPrice: 120.00,
        rules: {
            timeOfDayMultipliers: {
                morning: 1.0,
                afternoon: 1.15,
                golden_hour: 1.25,
                evening: 0.90,
            },
            weatherMultiplier: {
                sunny: 1.10,
                cloudy: 1.0,
                rain: 0.80,
                golden_hour: 1.20,
            },
            crowdDensityMultiplier: {
                low: 0.90,
                medium: 1.0,
                high: 1.20,
                surge: 1.35,
            },
        },
    };

    it('returns basePrice when dynamic yield pricing is inactive', () => {
        const inactiveConfig: YieldPricingConfig = {
            ...baseConfig,
            isActive: false,
        };

        const price = yieldPricingService.evaluateYield(inactiveConfig, {
            crowdDensity: 'surge',
            weather: 'sunny',
            timeOfDay: 'golden_hour',
        });

        expect(price).toBe(50.00);
    });

    it('applies time-of-day surge multiplier correctly', () => {
        const price = yieldPricingService.evaluateYield(baseConfig, {
            timeOfDay: 'golden_hour',
        });

        // 50 * 1.25 = 62.50
        expect(price).toBe(62.50);
    });

    it('applies weather condition multiplier correctly', () => {
        const price = yieldPricingService.evaluateYield(baseConfig, {
            weather: 'rain',
        });

        // 50 * 0.80 = 40.00
        expect(price).toBe(40.00);
    });

    it('applies crowd density multiplier correctly', () => {
        const price = yieldPricingService.evaluateYield(baseConfig, {
            crowdDensity: 'surge',
        });

        // 50 * 1.35 = 67.50
        expect(price).toBe(67.50);
    });

    it('compounds multiple multipliers to achieve >35% yield increase under peak resort conditions', () => {
        const price = yieldPricingService.evaluateYield(baseConfig, {
            timeOfDay: 'golden_hour', // 1.25
            weather: 'sunny',         // 1.10
            crowdDensity: 'surge',    // 1.35
        });

        // Multiplier = 1.25 * 1.10 * 1.35 = 1.85625 (85.6% surge)
        // 50 * 1.85625 = 92.8125 -> rounded to 92.81
        expect(price).toBe(92.81);
        expect(price).toBeGreaterThan(baseConfig.basePrice * 1.35); // Confirms >35% yield lift
    });

    it('clamps price to maxPrice ceiling when compounding exceeds limit', () => {
        const configWithLowCeiling: YieldPricingConfig = {
            ...baseConfig,
            maxPrice: 75.00,
        };

        const price = yieldPricingService.evaluateYield(configWithLowCeiling, {
            timeOfDay: 'golden_hour', // 1.25
            weather: 'sunny',         // 1.10
            crowdDensity: 'surge',    // 1.35 -> raw price 92.81
        });

        expect(price).toBe(75.00);
    });

    it('clamps price to minPrice floor during unfavorable resort conditions', () => {
        const price = yieldPricingService.evaluateYield(baseConfig, {
            timeOfDay: 'evening',  // 0.90
            weather: 'rain',       // 0.80
            crowdDensity: 'low',   // 0.90
        });

        // Multiplier = 0.90 * 0.80 * 0.90 = 0.648
        // 50 * 0.648 = 32.40 (above minPrice 30.00)
        expect(price).toBe(32.40);

        const configWithHighFloor: YieldPricingConfig = {
            ...baseConfig,
            minPrice: 40.00,
        };

        const clampedPrice = yieldPricingService.evaluateYield(configWithHighFloor, {
            timeOfDay: 'evening',
            weather: 'rain',
            crowdDensity: 'low',
        });

        expect(clampedPrice).toBe(40.00);
    });

    it('handles telemetry with empty or undefined values gracefully', () => {
        const price = yieldPricingService.evaluateYield(baseConfig, {});
        expect(price).toBe(50.00);
    });

    it('handles missing rule sets gracefully', () => {
        const emptyRulesConfig: YieldPricingConfig = {
            destinationId: 'dest-minimal',
            isActive: true,
            basePrice: 60.00,
            minPrice: 20.00,
            maxPrice: 100.00,
            rules: {},
        };

        const price = yieldPricingService.evaluateYield(emptyRulesConfig, {
            timeOfDay: 'morning',
            weather: 'sunny',
            crowdDensity: 'surge',
        });

        expect(price).toBe(60.00);
    });

    it('instantiates new YieldPricingService instances correctly', () => {
        const service = new YieldPricingService();
        expect(service).toBeInstanceOf(YieldPricingService);
    });
});
