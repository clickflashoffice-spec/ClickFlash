/**
 * Offline Analytics Service
 * 
 * Tracks analytics events that work offline and sync when connection is restored.
 * 
 * Features:
 * - Offline event queuing
 * - Automatic batch sync
 * - Session tracking
 * - Performance metrics
 * - Error tracking
 */

import { db } from './db';
import { logger } from '../utils/logger';

export interface AnalyticsEvent {
    id: string;
    type: 'pageview' | 'interaction' | 'error' | 'performance' | 'business';
    name: string;
    properties: Record<string, any>;
    timestamp: number;
    sessionId: string;
    synced: boolean;
}

export interface Session {
    id: string;
    startTime: number;
    endTime?: number;
    kioskId: string;
    orders: string[];
    interactions: number;
}

interface PerformanceMetric {
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count';
}

const ANALYTICS_TABLE = 'analyticsEvents';
const SESSION_TABLE = 'analyticsSessions';
const MAX_EVENTS = 1000; // Keep last 1000 events

class OfflineAnalyticsService {
    private sessionId: string;
    private kioskId: string = '';
    private isOnline = navigator.onLine;
    private syncInProgress = false;

    constructor() {
        this.sessionId = this.generateSessionId();
        this.init();
    }

    private init() {
        // Track online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            logger.info('[Analytics] Connection restored, will sync events');
            this.syncEvents();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            logger.info('[Analytics] Connection lost, buffering events');
        });

        // Start session
        this.startSession();

        // Track page visibility for session time
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('interaction', 'background', { timestamp: Date.now() });
            } else {
                this.trackEvent('interaction', 'foreground', { timestamp: Date.now() });
            }
        });

        // Auto-sync every 5 minutes if online
        setInterval(() => {
            if (this.isOnline) {
                this.syncEvents();
            }
        }, 5 * 60 * 1000);
    }

    private generateSessionId(): string {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    setKioskId(kioskId: string) {
        this.kioskId = kioskId;
    }

    /**
     * Track an analytics event
     */
    async trackEvent(
        type: AnalyticsEvent['type'],
        name: string,
        properties: Record<string, any> = {}
    ): Promise<void> {
        try {
            const event: AnalyticsEvent = {
                id: crypto.randomUUID(),
                type,
                name,
                properties: {
                    ...properties,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    language: navigator.language
                },
                timestamp: Date.now(),
                sessionId: this.sessionId,
                synced: false
            };

            await db.table<AnalyticsEvent>(ANALYTICS_TABLE).add(event);
            
            // Trim old events if needed
            await this.trimOldEvents();

            // Try to sync immediately if online
            if (this.isOnline && !this.syncInProgress) {
                this.syncEvents();
            }
        } catch (error) {
            // Silent fail for analytics
            logger.debug('[Analytics] Failed to track event', error);
        }
    }

    /**
     * Track page view
     */
    trackPageView(pageName: string, properties: Record<string, any> = {}): void {
        this.trackEvent('pageview', pageName, properties).catch(() => {});
    }

    /**
     * Track user interaction
     */
    trackInteraction(action: string, element: string, properties: Record<string, any> = {}): void {
        this.trackEvent('interaction', action, { element, ...properties }).catch(() => {});
    }

    /**
     * Track business event (order, payment, etc)
     */
    trackBusiness(event: string, value: number, properties: Record<string, any> = {}): void {
        this.trackEvent('business', event, { value, ...properties }).catch(() => {});
    }

    /**
     * Track error
     */
    trackError(error: Error, context: Record<string, any> = {}): void {
        this.trackEvent('error', error.name, {
            message: error.message,
            stack: error.stack,
            ...context
        }).catch(() => {});
    }

    /**
     * Track performance metric
     */
    trackPerformance(metric: PerformanceMetric): void {
        this.trackEvent('performance', metric.name, {
            value: metric.value,
            unit: metric.unit
        }).catch(() => {});
    }

    /**
     * Measure and track function execution time
     */
    async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.trackPerformance({ name, value: duration, unit: 'ms' });
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.trackPerformance({ name, value: duration, unit: 'ms' });
            throw error;
        }
    }

    /**
     * Start a new session
     */
    private async startSession(): Promise<void> {
        try {
            const session: Session = {
                id: this.sessionId,
                startTime: Date.now(),
                kioskId: this.kioskId,
                orders: [],
                interactions: 0
            };

            await db.table<Session>(SESSION_TABLE).add(session);
        } catch (error) {
            logger.debug('[Analytics] Failed to start session', error);
        }
    }

    /**
     * End current session
     */
    async endSession(): Promise<void> {
        try {
            await db.table<Session>(SESSION_TABLE).update(this.sessionId, {
                endTime: Date.now()
            });
        } catch (error) {
            logger.debug('[Analytics] Failed to end session', error);
        }
    }

    /**
     * Record order in session
     */
    async recordOrder(orderId: string, total: number): Promise<void> {
        try {
            const session = await db.table<Session>(SESSION_TABLE).get(this.sessionId);
            if (session) {
                session.orders.push(orderId);
                await db.table<Session>(SESSION_TABLE).put(session);
            }
            
            void this.trackBusiness('order_completed', total, { orderId });
        } catch (error) {
            logger.debug('[Analytics] Failed to record order', error);
        }
    }

    /**
     * Trim old events to stay under limit
     */
    private async trimOldEvents(): Promise<void> {
        try {
            const count = await db.table<AnalyticsEvent>(ANALYTICS_TABLE).count();
            if (count > MAX_EVENTS) {
                const toDelete = count - MAX_EVENTS;
                const oldEvents = await db.table<AnalyticsEvent>(ANALYTICS_TABLE)
                    .orderBy('timestamp')
                    .limit(toDelete)
                    .toArray();
                
                await db.table<AnalyticsEvent>(ANALYTICS_TABLE)
                    .bulkDelete(oldEvents.map(e => e.id));
                
                logger.info(`[Analytics] Trimmed ${oldEvents.length} old events`);
            }
        } catch (error) {
            logger.debug('[Analytics] Failed to trim events', error);
        }
    }

    /**
     * Sync unsynced events to server
     */
    async syncEvents(): Promise<void> {
        if (this.syncInProgress || !navigator.onLine) return;
        
        this.syncInProgress = true;
        
        try {
            const unsynced = await db.table<AnalyticsEvent>(ANALYTICS_TABLE)
                .where('synced')
                .equals(0 as unknown as number)
                .limit(100) // Batch size
                .toArray();

            if (unsynced.length === 0) {
                this.syncInProgress = false;
                return;
            }

            // Send to analytics endpoint
            const response = await fetch('/api/analytics/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: unsynced }),
                signal: AbortSignal.timeout(30000)
            });

            if (response.ok) {
                // Mark as synced
                for (const event of unsynced) {
                    await db.table<AnalyticsEvent>(ANALYTICS_TABLE)
                        .update(event.id, { synced: true });
                }
                
                logger.info(`[Analytics] Synced ${unsynced.length} events`);
            }
        } catch (error) {
            // Silent fail, will retry later
            logger.debug('[Analytics] Sync failed', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Get analytics stats
     */
    async getStats(): Promise<{
        totalEvents: number;
        unsyncedEvents: number;
        sessions: number;
    }> {
        try {
            const [totalEvents, unsyncedEvents, sessions] = await Promise.all([
                db.table<AnalyticsEvent>(ANALYTICS_TABLE).count(),
                db.table<AnalyticsEvent>(ANALYTICS_TABLE).where('synced').equals(0 as unknown as number).count(),
                db.table<Session>(SESSION_TABLE).count()
            ]);

            return { totalEvents, unsyncedEvents, sessions };
        } catch (error) {
            return { totalEvents: 0, unsyncedEvents: 0, sessions: 0 };
        }
    }

    /**
     * Get events for export/debugging
     */
    async getEvents(
        type?: AnalyticsEvent['type'],
        limit: number = 100
    ): Promise<AnalyticsEvent[]> {
        try {
            let query = db.table<AnalyticsEvent>(ANALYTICS_TABLE).orderBy('timestamp').reverse();
            if (type) {
                query = query.filter(e => e.type === type) as typeof query;
            }
            return query.limit(limit).toArray();
        } catch (error) {
            return [];
        }
    }

    /**
     * Clear all analytics data
     */
    async clear(): Promise<void> {
        try {
            await db.table<AnalyticsEvent>(ANALYTICS_TABLE).clear();
            await db.table<Session>(SESSION_TABLE).clear();
            logger.info('[Analytics] All data cleared');
        } catch (error) {
            logger.debug('[Analytics] Failed to clear data', error);
        }
    }
}

// Ensure tables exist
try {
    if (!db.tables.some(t => t.name === ANALYTICS_TABLE)) {
        db.version(3).stores({
            [ANALYTICS_TABLE]: 'id, type, name, timestamp, sessionId, synced',
            [SESSION_TABLE]: 'id, startTime, kioskId'
        });
    }
} catch (error) {
    logger.debug('[Analytics] Could not upgrade db', error);
}

export const offlineAnalytics = new OfflineAnalyticsService();
