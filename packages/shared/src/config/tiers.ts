export type VenueTier = 'Free' | 'Starter' | 'Growth' | 'Pro' | 'Business';
export type PhotographerTier = 'Free' | 'Basic' | 'Plus' | 'Pro' | 'Ultimate';

export interface TierConfig {
    name: VenueTier | PhotographerTier;
    monthlyFee: number;
    commissionPercent: number;
    orderFee: number;
    features: string[];
    thresholdVolume?: number; // Sales volume to trigger auto-upgrade
}

export const VENUE_TIERS: Record<VenueTier, TierConfig> = {
    Free: {
        name: 'Free',
        monthlyFee: 0,
        commissionPercent: 12,
        orderFee: 2.00,
        features: ['Basic Kiosk', 'Web Gallery'],
        thresholdVolume: 1000 // Upgrade to Starter at 1000/mo
    },
    Starter: {
        name: 'Starter',
        monthlyFee: 15,
        commissionPercent: 10,
        orderFee: 1.50,
        features: ['Basic Kiosk', 'Web Gallery', 'Custom Branding'],
        thresholdVolume: 5000 // Upgrade to Growth at 5000/mo
    },
    Growth: {
        name: 'Growth',
        monthlyFee: 29,
        commissionPercent: 8,
        orderFee: 1.00,
        features: ['Advanced Kiosk', 'Web Gallery', 'Custom Branding', 'Magic Shots'],
        thresholdVolume: 15000 // Upgrade to Pro at 15000/mo
    },
    Pro: {
        name: 'Pro',
        monthlyFee: 59,
        commissionPercent: 6,
        orderFee: 0.75,
        features: ['Advanced Kiosk', 'Web Gallery', 'Custom Branding', 'Magic Shots', 'Live Streaming'],
        thresholdVolume: 50000 // Upgrade to Business at 50000/mo
    },
    Business: {
        name: 'Business',
        monthlyFee: 119,
        commissionPercent: 5,
        orderFee: 0.50,
        features: ['Advanced Kiosk', 'Web Gallery', 'Custom Branding', 'Magic Shots', 'Live Streaming', 'Dedicated Account Manager'],
    }
};

export const PHOTOGRAPHER_TIERS: Record<PhotographerTier, TierConfig> = {
    Free: {
        name: 'Free',
        monthlyFee: 0,
        commissionPercent: 15,
        orderFee: 0,
        features: ['3GB Storage', 'Watermarked Previews'],
        thresholdVolume: 500
    },
    Basic: {
        name: 'Basic',
        monthlyFee: 15,
        commissionPercent: 0,
        orderFee: 0,
        features: ['10GB Storage', 'Custom Logos', 'No Commission'],
        thresholdVolume: 2000
    },
    Plus: {
        name: 'Plus',
        monthlyFee: 25,
        commissionPercent: 0,
        orderFee: 0,
        features: ['100GB Storage', 'Custom Logos', 'AI Studio', 'Custom Domain'],
        thresholdVolume: 5000
    },
    Pro: {
        name: 'Pro',
        monthlyFee: 49,
        commissionPercent: 0,
        orderFee: 0,
        features: ['1TB Storage', 'Custom Logos', 'AI Studio', 'Custom Domain', 'Face Recognition', 'AI Reels'],
        thresholdVolume: 10000
    },
    Ultimate: {
        name: 'Ultimate',
        monthlyFee: 79,
        commissionPercent: 0,
        orderFee: 0,
        features: ['Unlimited Storage', 'Custom Logos', 'AI Studio', 'Custom Domain', 'Face Recognition', 'AI Reels', 'ClickFlash Agent', 'Multi-user seats']
    }
};

export const getTier = (type: 'Venue' | 'Photographer', tierName: VenueTier | PhotographerTier): TierConfig => {
    if (type === 'Venue') {
        return VENUE_TIERS[tierName as VenueTier];
    }
    return PHOTOGRAPHER_TIERS[tierName as PhotographerTier];
};
