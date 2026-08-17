import { YieldPricingConfig, CrowdDensity, WeatherCondition, TimeOfDay } from '@clickflash/types';

export type WhalePackageType =
    | 'custom_photobook'
    | 'raw_media_download'
    | 'vip_family_package'
    | 'all_inclusive_pass'
    | 'extended_resort_archive';

export interface PhotobookYieldOptions {
    pageCount?: number;          // Default: 20
    coverFinish?: 'hardcover' | 'leather' | 'linen' | 'acrylic_glass';
    paperType?: 'archival_matte' | 'pearl_lustre' | 'silk_gloss';
    layflatBinding?: boolean;
    boxSetIncluded?: boolean;
    rushProduction?: boolean;
}

export interface RawMediaYieldOptions {
    photoCount?: number;         // Total RAW frames
    include4kVideo?: boolean;
    includeLutPresets?: boolean;
    expeditedZipDelivery?: boolean;
    commercialLicense?: boolean;
}

export interface VipFamilyYieldOptions {
    guestCount?: number;         // e.g. 4 to 20 guests
    roomCount?: number;          // e.g. 1 to 5 rooms
    multiDayPassDays?: number;   // e.g. 1 to 7 days
    dedicatedPhotographerHours?: number;
    unlimitedDownloads?: boolean;
    priorityFastPassLanes?: boolean;
}

export type CadenceStage = '2hr_nudge' | '24hr_golden' | '48hr_whale_urgency' | '7day_cold_vault';

export interface CadenceEscalationResult {
    cadenceStage: CadenceStage;
    discountPercentage: number;
    discountCode: string;
    incentiveType: 'gift_retouch' | 'print_credit' | 'raw_unlock' | 'vault_liquidation';
    urgencyLevel: 'low' | 'medium' | 'high';
    expiresInHours: number;
    calculatedPrice: number;
    savings: number;
    suggestedAction: string;
    incentiveDescription: string;
}

export interface WhaleYieldResult {
    finalPrice: number;
    basePrice: number;
    multiplier: number;
    breakdown: Record<string, number>;
    appliedIncentives: string[];
    specsSummary: string;
}

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

    /**
     * Calculates dynamic add-on yield pricing for bespoke custom photobooks.
     */
    public calculatePhotobookYield(
        basePrice: number,
        options: PhotobookYieldOptions = {}
    ): { price: number; addOnTotal: number; specsSummary: string } {
        const pageCount = options.pageCount ?? 20;
        const extraPages = Math.max(0, pageCount - 20);
        const extraPagesCost = extraPages * 1.50; // $1.50 per additional page

        let coverCost = 0;
        switch (options.coverFinish) {
            case 'leather': coverCost = 35.00; break;
            case 'acrylic_glass': coverCost = 50.00; break;
            case 'linen': coverCost = 15.00; break;
            case 'hardcover':
            default: coverCost = 0; break;
        }

        let paperCost = 0;
        switch (options.paperType) {
            case 'archival_matte': paperCost = 20.00; break;
            case 'pearl_lustre': paperCost = 12.00; break;
            case 'silk_gloss':
            default: paperCost = 0; break;
        }

        const layflatCost = options.layflatBinding ? 25.00 : 0;
        const boxSetCost = options.boxSetIncluded ? 30.00 : 0;
        const rushCost = options.rushProduction ? 25.00 : 0;

        const addOnTotal = extraPagesCost + coverCost + paperCost + layflatCost + boxSetCost + rushCost;
        const finalPrice = Math.round((basePrice + addOnTotal) * 100) / 100;

        const specs = [
            `${pageCount} pages`,
            options.coverFinish ? `${options.coverFinish} cover` : 'Hardcover',
            options.paperType ? `${options.paperType} paper` : 'Standard Gloss',
            options.layflatBinding ? 'Seamless Layflat' : null,
            options.boxSetIncluded ? 'Keepsake Box Set' : null,
            options.rushProduction ? 'Priority Express Production' : null
        ].filter(Boolean).join(' | ');

        return { price: finalPrice, addOnTotal: Math.round(addOnTotal * 100) / 100, specsSummary: specs };
    }

    /**
     * Calculates dynamic yield pricing for uncompressed RAW master passes.
     */
    public calculateRawMediaPassYield(
        basePrice: number,
        options: RawMediaYieldOptions = {}
    ): { price: number; estimatedDataGb: number; specsSummary: string } {
        const photoCount = options.photoCount ?? 50;
        const extraPhotos = Math.max(0, photoCount - 50);
        const extraPhotosCost = extraPhotos * 0.40; // $0.40 per additional uncompressed RAW frame

        const videoCost = options.include4kVideo ? 35.00 : 0;
        const lutCost = options.includeLutPresets ? 15.00 : 0;
        const zipCost = options.expeditedZipDelivery ? 10.00 : 0;
        const licenseCost = options.commercialLicense ? 75.00 : 0;

        const addOnTotal = extraPhotosCost + videoCost + lutCost + zipCost + licenseCost;
        const finalPrice = Math.round((basePrice + addOnTotal) * 100) / 100;

        // Approx 35MB per uncompressed RAW frame + 2GB per 4K video clip
        const rawGb = (photoCount * 35) / 1024;
        const videoGb = options.include4kVideo ? 4.0 : 0;
        const estimatedDataGb = Math.round((rawGb + videoGb) * 10) / 10;

        const specs = [
            `${photoCount} Full-Resolution RAW Captures (DNG/CR3)`,
            options.include4kVideo ? '4K 60FPS Video Included' : null,
            options.includeLutPresets ? 'Pro Lightroom LUTs Pack' : null,
            options.expeditedZipDelivery ? 'High-Speed Cloud ZIP' : null,
            options.commercialLicense ? 'Commercial License Included' : 'Personal Archival License'
        ].filter(Boolean).join(' | ');

        return { price: finalPrice, estimatedDataGb, specsSummary: specs };
    }

    /**
     * Calculates dynamic yield pricing for VIP Family & multi-generational resort packages.
     */
    public calculateVipFamilyYield(
        basePrice: number,
        options: VipFamilyYieldOptions = {}
    ): { price: number; perPersonPrice: number; specsSummary: string } {
        const guestCount = Math.max(1, options.guestCount ?? 4);
        const roomCount = Math.max(1, options.roomCount ?? 1);
        const passDays = Math.max(1, options.multiDayPassDays ?? 1);
        const photographerHours = options.dedicatedPhotographerHours ?? 0;

        // Base price covers up to 4 guests and 1 room for 1 day
        const extraGuests = Math.max(0, guestCount - 4);
        const extraGuestsCost = extraGuests * 15.00;

        const extraRooms = Math.max(0, roomCount - 1);
        const extraRoomsCost = extraRooms * 25.00;

        // Multi-day discount: subsequent days discounted at 35% off daily rate
        const multiDayMultiplier = 1 + ((passDays - 1) * 0.65);

        const dedicatedPhotographerCost = photographerHours * 65.00;
        const unlimitedDownloadsCost = options.unlimitedDownloads ? 40.00 : 0;
        const fastPassCost = options.priorityFastPassLanes ? 30.00 : 0;

        const rawTotal = (basePrice + extraGuestsCost + extraRoomsCost) * multiDayMultiplier 
            + dedicatedPhotographerCost + unlimitedDownloadsCost + fastPassCost;

        const finalPrice = Math.round(rawTotal * 100) / 100;
        const perPersonPrice = Math.round((finalPrice / guestCount) * 100) / 100;

        const specs = [
            `${guestCount} Guests (${roomCount} Rooms)`,
            `${passDays}-Day All-Access Pass`,
            photographerHours > 0 ? `${photographerHours}h Dedicated Photographer` : null,
            options.unlimitedDownloads ? 'Unlimited Digital Downloads' : null,
            options.priorityFastPassLanes ? 'Priority Fast-Pass Lanes' : null
        ].filter(Boolean).join(' | ');

        return { price: finalPrice, perPersonPrice, specsSummary: specs };
    }

    /**
     * Evaluates comprehensive dynamic yield for Whale packages combining telemetry and package specifics.
     */
    public evaluateWhalePackageYield(
        packageType: WhalePackageType,
        basePrice: number,
        telemetry: { crowdDensity?: CrowdDensity | string; weather?: WeatherCondition | string; timeOfDay?: TimeOfDay | string } = {},
        options: {
            photobook?: PhotobookYieldOptions;
            rawMedia?: RawMediaYieldOptions;
            vipFamily?: VipFamilyYieldOptions;
            minMarginRatio?: number;
            volumeDiscountApplied?: boolean;
        } = {}
    ): WhaleYieldResult {
        let dynamicPrice = basePrice;
        let specsSummary = '';
        const breakdown: Record<string, number> = { basePrice };
        const appliedIncentives: string[] = [];

        // 1. Calculate Package-Specific Yield Add-ons
        switch (packageType) {
            case 'custom_photobook': {
                const bookRes = this.calculatePhotobookYield(basePrice, options.photobook);
                dynamicPrice = bookRes.price;
                specsSummary = bookRes.specsSummary;
                breakdown.photobookAddOns = bookRes.addOnTotal;
                break;
            }
            case 'raw_media_download': {
                const rawRes = this.calculateRawMediaPassYield(basePrice, options.rawMedia);
                dynamicPrice = rawRes.price;
                specsSummary = rawRes.specsSummary;
                breakdown.rawMediaAddOns = Math.round((rawRes.price - basePrice) * 100) / 100;
                break;
            }
            case 'vip_family_package': {
                const vipRes = this.calculateVipFamilyYield(basePrice, options.vipFamily);
                dynamicPrice = vipRes.price;
                specsSummary = vipRes.specsSummary;
                breakdown.vipPackageAddOns = Math.round((vipRes.price - basePrice) * 100) / 100;
                break;
            }
            case 'all_inclusive_pass':
            case 'extended_resort_archive':
            default: {
                specsSummary = `${packageType.replace(/_/g, ' ').toUpperCase()} Full Access`;
                break;
            }
        }

        // 2. Telemetry Multiplier
        let telemetryMultiplier = 1.0;
        if (telemetry.crowdDensity === 'Peak' || telemetry.crowdDensity === 'surge') {
            telemetryMultiplier *= 1.25;
            breakdown.surgeModifier = 1.25;
        } else if (telemetry.crowdDensity === 'High') {
            telemetryMultiplier *= 1.15;
            breakdown.surgeModifier = 1.15;
        }

        if (telemetry.weather === 'Extreme' || telemetry.weather === 'Rain') {
            telemetryMultiplier *= 0.90; // Gentle weather relief
            breakdown.weatherModifier = 0.90;
        }

        // 3. Volume Arbitrage / Incentive
        if (options.volumeDiscountApplied) {
            telemetryMultiplier *= 0.90; // 10% volume incentive for bundled whale purchases
            appliedIncentives.push('10% Whale Volume Arbitrage Discount');
            breakdown.volumeDiscount = -0.10;
        }

        let calculatedPrice = dynamicPrice * telemetryMultiplier;

        // 4. Floor Margin Protection (default min 60% of basePrice + add-ons)
        const minMargin = (options.minMarginRatio ?? 0.60) * dynamicPrice;
        calculatedPrice = Math.max(minMargin, calculatedPrice);

        const finalPrice = Math.round(calculatedPrice * 100) / 100;
        const totalMultiplier = Math.round((finalPrice / basePrice) * 100) / 100;

        return {
            finalPrice,
            basePrice,
            multiplier: totalMultiplier,
            breakdown,
            appliedIncentives,
            specsSummary
        };
    }

    /**
     * Calculates intelligent follow-up cadence rules (2hr, 24hr, 48hr, 7day) 
     * to maximize abandoned cart recovery with bounded margin protection.
     */
    public calculateCadenceEscalation(
        hoursInactive: number,
        basePrice: number,
        isWhale: boolean,
        customFloorRatio: number = 0.65
    ): CadenceEscalationResult {
        let cadenceStage: CadenceStage;
        let discountPercentage: number;
        let discountCode: string;
        let incentiveType: 'gift_retouch' | 'print_credit' | 'raw_unlock' | 'vault_liquidation';
        let urgencyLevel: 'low' | 'medium' | 'high';
        let expiresInHours: number;
        let suggestedAction: string;
        let incentiveDescription: string;

        if (hoursInactive < 6) {
            // T+2 Hours: Fresh Intent / Abandonment Alert
            cadenceStage = '2hr_nudge';
            discountPercentage = isWhale ? 10 : 5;
            discountCode = isWhale ? 'WHALE5' : 'FAST5';
            incentiveType = 'gift_retouch';
            urgencyLevel = 'low';
            expiresInHours = 24;
            suggestedAction = 'Send friendly preview reminder with complimentary AI retouch gift';
            incentiveDescription = 'Complimentary ClickFlash AI Portrait Retouching + Free 5% Welcome Credit';
        } else if (hoursInactive < 36) {
            // T+24 Hours: Golden Recovery Window
            cadenceStage = '24hr_golden';
            discountPercentage = 15;
            discountCode = isWhale ? 'WHALE15' : 'MEMORIES15';
            incentiveType = 'print_credit';
            urgencyLevel = 'medium';
            expiresInHours = 12;
            suggestedAction = 'Send personalized 15% discount + complimentary 8x10 print or photobook upgrade voucher';
            incentiveDescription = '15% OFF entire album + $15 Print Keepsake Voucher';
        } else if (hoursInactive < 96) {
            // T+48 Hours: Whale Urgency & Concession Escalation
            cadenceStage = '48hr_whale_urgency';
            discountPercentage = isWhale ? 25 : 20;
            discountCode = isWhale ? 'WHALE25' : 'FLASH20';
            incentiveType = 'raw_unlock';
            urgencyLevel = 'high';
            expiresInHours = 6;
            suggestedAction = 'Send high-urgency recovery hook with 25% discount & free RAW sensor download unlock';
            incentiveDescription = isWhale 
                ? '25% OFF VIP Bundle + Complimentary RAW Master Uncompressed Downloads'
                : '20% OFF Entire Order (Expiring in 6 Hours)';
        } else {
            // T+72h to 7+ Days: Cold Vault Liquidation Sweep
            cadenceStage = '7day_cold_vault';
            discountPercentage = 30;
            discountCode = 'VAULT30';
            incentiveType = 'vault_liquidation';
            urgencyLevel = 'high';
            expiresInHours = 2;
            suggestedAction = 'Send final 30% vault liquidation offer before cold storage archive';
            incentiveDescription = '30% Final Clearance Vault Discount before gallery cold archive';
        }

        // Calculate bounded final price
        const rawDiscount = (basePrice * discountPercentage) / 100;
        let calculatedPrice = basePrice - rawDiscount;

        // Margin Floor Protection
        const floorPrice = basePrice * customFloorRatio;
        if (calculatedPrice < floorPrice) {
            calculatedPrice = floorPrice;
        }

        calculatedPrice = Math.round(calculatedPrice * 100) / 100;
        const savings = Math.round((basePrice - calculatedPrice) * 100) / 100;

        return {
            cadenceStage,
            discountPercentage,
            discountCode,
            incentiveType,
            urgencyLevel,
            expiresInHours,
            calculatedPrice,
            savings,
            suggestedAction,
            incentiveDescription
        };
    }
}

export const yieldPricingService = new YieldPricingService();
