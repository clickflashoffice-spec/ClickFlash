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

    describe('Whale Package Yield & Objections', () => {
        it('calculates custom photobook yield correctly with luxury options', () => {
            const result = yieldPricingService.calculatePhotobookYield(80.00, {
                pageCount: 30, // 10 extra pages * $1.50 = $15.00
                coverFinish: 'leather', // +$35.00
                paperType: 'archival_matte', // +$20.00
                layflatBinding: true, // +$25.00
                boxSetIncluded: true, // +$30.00
            });

            // 80 + 15 + 35 + 20 + 25 + 30 = 205.00
            expect(result.price).toBe(205.00);
            expect(result.addOnTotal).toBe(125.00);
            expect(result.specsSummary).toContain('30 pages');
            expect(result.specsSummary).toContain('leather cover');
            expect(result.specsSummary).toContain('Seamless Layflat');
        });

        it('calculates RAW media download pass yield with 4K video and LUT pack', () => {
            const result = yieldPricingService.calculateRawMediaPassYield(60.00, {
                photoCount: 100, // 50 extra RAWs * $0.40 = $20.00
                include4kVideo: true, // +$35.00
                includeLutPresets: true, // +$15.00
                expeditedZipDelivery: true, // +$10.00
            });

            // 60 + 20 + 35 + 15 + 10 = 140.00
            expect(result.price).toBe(140.00);
            expect(result.estimatedDataGb).toBeGreaterThan(5);
            expect(result.specsSummary).toContain('100 Full-Resolution RAW Captures');
            expect(result.specsSummary).toContain('4K 60FPS Video');
        });

        it('calculates VIP family multi-day and dedicated photographer yield', () => {
            const result = yieldPricingService.calculateVipFamilyYield(150.00, {
                guestCount: 8, // 4 extra guests * $15 = $60
                roomCount: 2, // 1 extra room * $25 = $25
                multiDayPassDays: 2, // multiDayMultiplier = 1 + (1 * 0.65) = 1.65
                dedicatedPhotographerHours: 3, // 3 * 65 = 195
                unlimitedDownloads: true, // +40
                priorityFastPassLanes: true, // +30
            });

            // (150 + 60 + 25) * 1.65 + 195 + 40 + 30 = (235 * 1.65) + 265 = 387.75 + 265 = 652.75
            expect(result.price).toBe(652.75);
            expect(result.perPersonPrice).toBe(81.59); // 652.75 / 8 = 81.59375
            expect(result.specsSummary).toContain('8 Guests (2 Rooms)');
            expect(result.specsSummary).toContain('3h Dedicated Photographer');
        });

        it('evaluates complete Whale package yield under resort peak surge conditions', () => {
            const result = yieldPricingService.evaluateWhalePackageYield(
                'custom_photobook',
                100.00,
                { crowdDensity: 'Peak' }, // 1.25 surge
                {
                    photobook: {
                        coverFinish: 'leather', // +35
                        layflatBinding: true, // +25
                    },
                    volumeDiscountApplied: true, // 10% off
                }
            );

            // dynamicPrice = 100 + 35 + 25 = 160.00
            // multiplier = 1.25 * 0.90 = 1.125
            // finalPrice = 160 * 1.125 = 180.00
            expect(result.finalPrice).toBe(180.00);
            expect(result.appliedIncentives).toContain('10% Whale Volume Arbitrage Discount');
            expect(result.breakdown.photobookAddOns).toBe(60.00);
        });
    });

    describe('Intelligent Follow-up Cadence Rules', () => {
        it('calculates 2-hour fresh intent cadence escalation', () => {
            const cadence = yieldPricingService.calculateCadenceEscalation(2, 100.00, false);
            expect(cadence.cadenceStage).toBe('2hr_nudge');
            expect(cadence.discountPercentage).toBe(5);
            expect(cadence.discountCode).toBe('FAST5');
            expect(cadence.urgencyLevel).toBe('low');
            expect(cadence.calculatedPrice).toBe(95.00);
        });

        it('calculates 24-hour golden recovery cadence escalation', () => {
            const cadence = yieldPricingService.calculateCadenceEscalation(24, 100.00, false);
            expect(cadence.cadenceStage).toBe('24hr_golden');
            expect(cadence.discountPercentage).toBe(15);
            expect(cadence.discountCode).toBe('MEMORIES15');
            expect(cadence.urgencyLevel).toBe('medium');
            expect(cadence.calculatedPrice).toBe(85.00);
            expect(cadence.savings).toBe(15.00);
        });

        it('calculates 48-hour high-urgency cadence escalation for Whale leads', () => {
            const cadence = yieldPricingService.calculateCadenceEscalation(48, 200.00, true);
            expect(cadence.cadenceStage).toBe('48hr_whale_urgency');
            expect(cadence.discountPercentage).toBe(25);
            expect(cadence.discountCode).toBe('WHALE25');
            expect(cadence.urgencyLevel).toBe('high');
            expect(cadence.calculatedPrice).toBe(150.00);
            expect(cadence.savings).toBe(50.00);
        });

        it('calculates 7-day cold vault liquidation sweep', () => {
            const cadence = yieldPricingService.calculateCadenceEscalation(170, 100.00, false);
            expect(cadence.cadenceStage).toBe('7day_cold_vault');
            expect(cadence.discountPercentage).toBe(30);
            expect(cadence.discountCode).toBe('VAULT30');
            expect(cadence.urgencyLevel).toBe('high');
            expect(cadence.calculatedPrice).toBe(70.00);
        });

        it('respects margin floor protection on large discounts', () => {
            // Test with strict floor of 80% (0.80)
            const cadence = yieldPricingService.calculateCadenceEscalation(170, 100.00, false, 0.80);
            expect(cadence.calculatedPrice).toBe(80.00); // Clamped to 80.00 instead of 70.00
        });
    });
});
