
import { pb } from '../pb';
import { logger } from '../../utils/logger';

export interface Campaign {
    id: string;
    name: string;
    type: 'post-event' | 'abandoned-cart' | 're-engagement' | 'retention';
    triggerEvent: string;
    delayMinutes: number;
    subjectTemplate: string;
    bodyTemplate?: string;
    isActive: boolean;
    totalSent?: number;
    openRate?: number;
    clickRate?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CampaignAnalytics {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    avgOpenRate: number;
    avgClickRate: number;
    campaigns: Campaign[];
}

export interface CampaignTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: Campaign['type'];
}

const API_BASE = `${pb.baseUrlValue}/api`;

/**
 * Marketing Service API
 * 
 * Manages automated email campaigns for customer engagement
 */
export const marketingService = {
    /**
     * Get all campaigns
     */
    async getCampaigns(): Promise<Campaign[]> {
        try {
            // Try to fetch from backend
            const response = await fetch(`${API_BASE}/marketing/campaigns`, {
                headers: { 'Authorization': `Bearer ${pb.authStore.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const campaigns = data.campaigns || [];
                // Validate and sanitize campaigns
                return campaigns.map((c: Partial<Campaign>) => ({
                    ...c,
                    bodyTemplate: typeof c.bodyTemplate === 'string' ? c.bodyTemplate : '',
                    subjectTemplate: typeof c.subjectTemplate === 'string' ? c.subjectTemplate : '',
                    name: typeof c.name === 'string' ? c.name : 'Untitled Campaign'
                }));
            }

            // Fallback: Return default campaigns
            return getDefaultCampaigns();
        } catch (e) {
            logger.error('Failed to fetch campaigns', e instanceof Error ? e : undefined);
            return getDefaultCampaigns();
        }
    },

    /**
     * Get campaign analytics
     */
    async getAnalytics(): Promise<CampaignAnalytics> {
        try {
            const response = await fetch(`${API_BASE}/marketing/analytics`, {
                headers: { 'Authorization': `Bearer ${pb.authStore.token}` }
            });

            if (response.ok) {
                return await response.json();
            }

            // Fallback: Calculate from campaigns
            const campaigns = await this.getCampaigns();
            return calculateAnalytics(campaigns);
        } catch (e) {
            logger.error('Failed to fetch analytics', e instanceof Error ? e : undefined);
            const campaigns = await this.getCampaigns();
            return calculateAnalytics(campaigns);
        }
    },

    /**
     * Create new campaign
     */
    async createCampaign(campaign: Omit<Campaign, 'id'>): Promise<Campaign> {
        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`${API_BASE}/marketing/campaigns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify(campaign)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create campaign');
        }

        return response.json();
    },

    /**
     * Update campaign
     */
    async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`${API_BASE}/marketing/campaigns/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to update campaign');
        }

        return response.json();
    },

    /**
     * Toggle campaign status
     */
    async toggleCampaignStatus(id: string, isActive: boolean): Promise<void> {
        await this.updateCampaign(id, { isActive });
    },

    /**
     * Delete campaign
     */
    async deleteCampaign(id: string): Promise<void> {
        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`${API_BASE}/marketing/campaigns/${id}`, {
            method: 'DELETE',
            headers: {
                ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to delete campaign');
        }
    },

    /**
     * Send test email
     */
    async sendTestEmail(campaignId: string, toEmail: string): Promise<void> {
        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`${API_BASE}/marketing/test-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify({ campaignId, to: toEmail })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to send test email');
        }
    },

    /**
     * Get campaign templates
     */
    getTemplates(): CampaignTemplate[] {
        return [
            {
                id: 'gallery-ready',
                name: 'Gallery Ready',
                type: 'post-event',
                subject: 'Your photos are ready! 🎉',
                body: 'Hi {{clientName}},\n\nYour photos from {{albumTitle}} are now available in your private gallery.\n\nView Gallery: {{galleryUrl}}\n\nBest regards,\n{{studioName}}'
            },
            {
                id: 'abandoned-cart',
                name: 'Abandoned Cart Reminder',
                type: 'abandoned-cart',
                subject: 'Complete your order - items still in cart',
                body: 'Hi {{clientName}},\n\nYou left some items in your cart. Complete your purchase now!\n\nView Cart: {{cartUrl}}\n\nBest regards,\n{{studioName}}'
            },
            {
                id: 'retention-offer',
                name: 'Photo Retention Offer',
                type: 'retention',
                subject: 'Last chance! Your photos expire soon',
                body: 'Hi {{clientName}},\n\nYour photos from {{albumTitle}} will be archived soon. Purchase them now at {{price}} each.\n\nView Photos: {{galleryUrl}}\n\nBest regards,\n{{studioName}}'
            },
            {
                id: 're-engagement',
                name: 'Re-engagement',
                type: 're-engagement',
                subject: 'We miss you! Special offer inside',
                body: 'Hi {{clientName}},\n\nIt\'s been a while! Book your next session with 20% off.\n\nBook Now: {{bookingUrl}}\n\nBest regards,\n{{studioName}}'
            }
        ];
    }
};

// Helper functions
function getDefaultCampaigns(): Campaign[] {
    return [
        {
            id: 'post-event-1h',
            name: 'Gallery Ready - 1 Hour',
            type: 'post-event',
            triggerEvent: 'album_published',
            delayMinutes: 60,
            subjectTemplate: 'Your photos are ready! 🎉',
            isActive: true,
            totalSent: 0,
            openRate: 0,
            clickRate: 0
        },
        {
            id: 'post-event-24h',
            name: 'Gallery Reminder - 24 Hours',
            type: 'post-event',
            triggerEvent: 'album_published',
            delayMinutes: 1440,
            subjectTemplate: 'Don\'t forget - 20% off expires in 3 days!',
            isActive: true,
            totalSent: 0,
            openRate: 0,
            clickRate: 0
        },
        {
            id: 'abandoned-cart-1h',
            name: 'Abandoned Cart - 1 Hour',
            type: 'abandoned-cart',
            triggerEvent: 'cart_abandoned',
            delayMinutes: 60,
            subjectTemplate: 'Complete your order - items still in cart',
            isActive: true,
            totalSent: 0,
            openRate: 0,
            clickRate: 0
        },
        {
            id: 'retention-15d',
            name: 'Retention Offer - 15 Days',
            type: 'retention',
            triggerEvent: 'photo_expiring',
            delayMinutes: 21600, // 15 days
            subjectTemplate: 'Last chance! Your photos expire in {{days}} days',
            isActive: false,
            totalSent: 0,
            openRate: 0,
            clickRate: 0
        }
    ];
}

function calculateAnalytics(campaigns: Campaign[]): CampaignAnalytics {
    const activeCampaigns = campaigns.filter(c => c.isActive).length;
    const totalSent = campaigns.reduce((sum, c) => sum + (c.totalSent || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + ((c.totalSent || 0) * (c.openRate || 0) / 100), 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + ((c.totalSent || 0) * (c.clickRate || 0) / 100), 0);

    const avgOpenRate = campaigns.length > 0
        ? Math.round(campaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / campaigns.length)
        : 0;
    const avgClickRate = campaigns.length > 0
        ? Math.round(campaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) / campaigns.length)
        : 0;

    return {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalSent,
        totalOpened: Math.round(totalOpened),
        totalClicked: Math.round(totalClicked),
        avgOpenRate,
        avgClickRate,
        campaigns
    };
}

export default marketingService;
