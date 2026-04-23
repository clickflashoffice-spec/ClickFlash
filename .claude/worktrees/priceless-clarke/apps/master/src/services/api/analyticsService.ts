/**
 * Analytics Service
 * 
 * Handles aggregation of business intelligence data from the backend
 */

import { pb } from '../pb';
import { logger } from '../../utils/logger';

export interface AnalyticsSummary {
    revenue: number;
    orders: number;
    productBreakdown: Array<{ productName: string, revenue: number }>;
}

export interface HourlyStat {
    hour: string;
    revenue: number;
    count: number;
}

export interface PhotographerStat {
    name: string;
    revenue: number;
    orderCount: number;
    avgOrderValue: number;
}

export const analyticsService = {
    /**
     * Get high-level summary KPIs
     */
    async getSummary(days: number = 30): Promise<AnalyticsSummary> {
        try {
            const response = await fetch(`/api/analytics/summary?days=${days}`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            logger.error('Failed to fetch analytics summary', error instanceof Error ? error : undefined);
            return { revenue: 0, orders: 0, productBreakdown: [] };
        }
    },

    /**
     * Get hourly revenue trends
     */
    async getHourly(date?: string): Promise<HourlyStat[]> {
        try {
            const query = date ? `?date=${date}` : '';
            const response = await fetch(`/api/analytics/hourly${query}`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            logger.error('Failed to fetch hourly analytics', error instanceof Error ? error : undefined);
            return [];
        }
    },

    /**
     * Get photographer performance ranking
     */
    async getPhotographers(days: number = 30): Promise<PhotographerStat[]> {
        try {
            const response = await fetch(`/api/analytics/photographers?days=${days}`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            logger.error('Failed to fetch photographer analytics', error instanceof Error ? error : undefined);
            return [];
        }
    },

    /**
     * Get detailed analytics for a specific album (Phase 32)
     */
    async getAlbumAnalytics(albumId: string): Promise<Record<string, unknown> | null> {
        try {
            const response = await fetch(`/api/analytics/albums/${albumId}`);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            logger.error('Failed to fetch album analytics', error instanceof Error ? error : undefined);
            return null;
        }
    },

    /**
     * Track photo engagement (Phase 32)
     */
    async trackEngagement(photoId: string, type: 'view' | 'selection'): Promise<boolean> {
        try {
            const csrfToken = await pb.getCsrfToken();
            const response = await fetch('/api/analytics/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                },
                body: JSON.stringify({ photoId, type })
            });
            return response.ok;
        } catch (error) {
            logger.error('Failed to track engagement', error instanceof Error ? error : undefined);
            return false;
        }
    }
};
