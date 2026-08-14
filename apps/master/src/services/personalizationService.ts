import { logger } from '../utils/logger';
import { db } from './db';

interface CustomerEngagement {
    customerEmail: string;
    totalEmailsSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    lifetimeValue: number;
    engagementScore: number;
}

/**
 * Personalization Service
 * 
 * Handles dynamic discount code generation, engagement scoring,
 * and template personalization for marketing campaigns.
 */
class PersonalizationService {
    /**
     * Generate a unique discount code for a customer
     * 
     * Format: SAVE{amount}-{hash}
     * Example: SAVE10-A3F8B2C1
     */
    generateDiscountCode(customerEmail: string, discountAmount: number): string {
        const hash = this.hashEmail(customerEmail).slice(0, 8).toUpperCase();
        return `SAVE${discountAmount}-${hash}`;
    }

    /**
     * Calculate engagement score (0-100) for a customer
     * 
     * Scoring:
     * - Open rate: 30 points
     * - Click rate: 30 points
     * - Conversion rate: 40 points
     */
    calculateEngagementScore(engagement: CustomerEngagement): number {
        if (engagement.totalEmailsSent === 0) return 50; // Default score for new customers

        const openRate = engagement.totalOpened / engagement.totalEmailsSent;
        const clickRate = engagement.totalClicked / Math.max(engagement.totalOpened, 1);
        const conversionRate = engagement.totalConverted / engagement.totalEmailsSent;

        const score = Math.round(
            (openRate * 30) +
            (clickRate * 30) +
            (conversionRate * 40)
        );

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Determine customer segment based on engagement
     */
    getCustomerSegment(engagement: CustomerEngagement): string {
        const score = this.calculateEngagementScore(engagement);

        if (engagement.lifetimeValue > 100) return 'High-Value Customer';
        if (score >= 70) return 'Highly Engaged';
        if (score >= 40) return 'Moderately Engaged';
        if (score >= 20) return 'Low Engagement';
        return 'Never Engaged';
    }

    /**
     * Determine optimal discount percentage based on engagement
     */
    getRecommendedDiscount(engagement: CustomerEngagement): number {
        const score = this.calculateEngagementScore(engagement);

        // High-value customers: smaller discount to maintain margins
        if (engagement.lifetimeValue > 200) return 5;

        // Highly engaged: small incentive
        if (score >= 70) return 10;

        // Moderate engagement: standard discount
        if (score >= 40) return 15;

        // Low engagement: higher discount to re-engage
        if (score >= 20) return 20;

        // Never engaged: maximum discount
        return 25;
    }

    /**
     * Get best time to send email based on customer behavior
     * 
     * Returns hour of day (0-23) in customer's timezone
     */
    getOptimalSendTime(customerEmail: string): number {
        // Implement deterministic pseudo-ML send-time optimization
        // Hash the email to distribute send times between 8 AM and 7 PM (19:00)
        const hash = this.hashEmail(customerEmail);
        const hashNum = parseInt(hash.slice(0, 4), 16);
        const minHour = 8;
        const maxHour = 19;
        
        return minHour + (hashNum % (maxHour - minHour + 1));
    }

    /**
     * Personalize template variables with customer-specific data
     */
    personalizeTemplate(
        template: string,
        variables: Record<string, string | number>,
        customerEngagement?: CustomerEngagement
    ): string {
        let personalized = template;

        // Replace standard variables
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{${key}}`, 'g');
            personalized = personalized.replace(regex, String(value));
        });

        // Add dynamic discount code if needed
        if (customerEngagement && template.includes('{discount_code}')) {
            const discountPercent = this.getRecommendedDiscount(customerEngagement);
            const discountCode = this.generateDiscountCode(
                customerEngagement.customerEmail,
                discountPercent
            );
            personalized = personalized.replace(/{discount_code}/g, discountCode);
            personalized = personalized.replace(/{discount_percent}/g, String(discountPercent));
        }

        return personalized;
    }

    /**
     * Track customer engagement event
     */
    async trackEngagement(
        customerEmail: string,
        eventType: 'sent' | 'opened' | 'clicked' | 'converted',
        conversionValue?: number
    ): Promise<void> {
        try {
            // Update database with engagement event via structured logging
            logger.info(`[Personalization] Tracking ${eventType} for ${customerEmail}`, {
                customerEmail,
                eventType,
                conversionValue,
                timestamp: new Date().toISOString()
            });

            // Update engagement score in real-time
            await db.transaction('rw', db.customerEngagements, async () => {
                let engagement = await db.customerEngagements.get(customerEmail);
                if (!engagement) {
                    engagement = {
                        customerEmail,
                        totalEmailsSent: 0,
                        totalOpened: 0,
                        totalClicked: 0,
                        totalConverted: 0,
                        lifetimeValue: 0,
                        engagementScore: 50,
                        lastUpdated: Date.now()
                    };
                }

                if (eventType === 'sent') engagement.totalEmailsSent++;
                else if (eventType === 'opened') engagement.totalOpened++;
                else if (eventType === 'clicked') engagement.totalClicked++;
                else if (eventType === 'converted') {
                    engagement.totalConverted++;
                    if (conversionValue) engagement.lifetimeValue += conversionValue;
                }

                engagement.engagementScore = this.calculateEngagementScore(engagement);
                engagement.lastEvent = eventType;
                engagement.lastUpdated = Date.now();

                await db.customerEngagements.put(engagement);
            });

        } catch (error) {
            logger.error('[Personalization] Failed to track engagement', error);
        }
    }

    /**
     * Get personalized product recommendations based on cart
     */
    getProductRecommendations(cartItems: unknown[]): string[] {
        // Deterministic recommendation based on cart size
        const itemCount = Array.isArray(cartItems) ? cartItems.length : 0;
        
        if (itemCount === 0) {
            return [
                'Digital download package',
                'Photo prints in multiple sizes',
                'Premium photo album'
            ];
        } else if (itemCount > 5) {
            return [
                'Premium photo album',
                'Canvas wall art',
                'Digital download package (Full Collection)'
            ];
        }

        return [
            'Canvas wall art',
            'Photo gift cards',
            'Photo prints in multiple sizes'
        ];
    }

    /**
     * Hash email address for discount code generation
     */
    private hashEmail(email: string): string {
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * A/B test variant assignment (consistent per customer)
     */
    getABTestVariant(customerEmail: string, testName: string): 'A' | 'B' {
        const hash = this.hashEmail(customerEmail + testName);
        const lastChar = hash.slice(-1);
        const num = parseInt(lastChar, 16);
        return num < 8 ? 'A' : 'B';
    }

    /**
     * Calculate customer lifetime value prediction
     */
    predictLifetimeValue(engagement: CustomerEngagement): number {
        const avgOrderValue = engagement.lifetimeValue / Math.max(engagement.totalConverted, 1);
        const conversionRate = engagement.totalConverted / Math.max(engagement.totalEmailsSent, 1);
        const engagementScore = this.calculateEngagementScore(engagement);

        // Simple LTV prediction: current value + projected future orders
        const projectedOrders = (conversionRate * engagementScore / 10);
        return Math.round(engagement.lifetimeValue + (avgOrderValue * projectedOrders));
    }
}

export const personalizationService = new PersonalizationService();
export type { CustomerEngagement };
