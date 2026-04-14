/**
 * Performance Monitor Service
 * 
 * Tracks Web Vitals and custom performance metrics.
 * Reports to analytics in production.
 * 
 * Aligned with Master App implementation for consistency.
 */

import { logger } from '../utils/logger';

interface PerformanceMetric {
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count';
    timestamp: number;
    context?: Record<string, unknown>;
}

interface WebVitalsReport {
    cls: number;  // Cumulative Layout Shift
    fid: number;  // First Input Delay
    fcp: number;  // First Contentful Paint
    lcp: number;  // Largest Contentful Paint
    ttfb: number; // Time to First Byte
}

interface LayoutShiftEntry extends PerformanceEntry {
    value: number;
    hadRecentInput: boolean;
}

interface FirstInputEntry extends PerformanceEntry {
    processingStart: number;
}

class PerformanceMonitorService {
    private metrics: PerformanceMetric[] = [];
    private isEnabled = !import.meta.env.DEV;
    private observer: PerformanceObserver | null = null;

    constructor() {
        this.initWebVitals();
    }

    /**
     * Initialize Web Vitals tracking
     */
    private initWebVitals(): void {
        if (typeof window === 'undefined') return;

        // CLS (Cumulative Layout Shift)
        if ('PerformanceObserver' in window) {
            try {
                this.observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'layout-shift') {
                            const lsEntry = entry as LayoutShiftEntry;
                            this.recordMetric('CLS', lsEntry.value, 'count', {
                                hadRecentInput: lsEntry.hadRecentInput,
                            });
                        }
                    }
                });
                this.observer.observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
                logger.debug('[PerformanceMonitor] CLS tracking not supported');
            }
        }

        // FCP (First Contentful Paint)
        this.observePaint('first-contentful-paint', 'FCP');

        // LCP (Largest Contentful Paint)
        this.observePaint('largest-contentful-paint', 'LCP');

        // TTFB (Time to First Byte)
        this.measureTTFB();

        // FID (First Input Delay)
        this.measureFID();

        // INP (Interaction to Next Paint) - Modern metric
        this.measureINP();
    }

    /**
     * Observe paint metrics
     */
    private observePaint(entryType: string, metricName: string): void {
        if (typeof window === 'undefined') return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                if (entries.length > 0) {
                    const entry = entries[entries.length - 1];
                    this.recordMetric(metricName, entry.startTime, 'ms');
                }
            });
            observer.observe({ entryTypes: [entryType as 'first-contentful-paint' | 'largest-contentful-paint'] });
        } catch (e) {
            logger.debug(`[PerformanceMonitor] ${metricName} tracking not supported`);
        }
    }

    /**
     * Measure TTFB (Time to First Byte)
     */
    private measureTTFB(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navigation) {
                const ttfb = navigation.responseStart - navigation.startTime;
                this.recordMetric('TTFB', ttfb, 'ms');
            }
        });
    }

    /**
     * Measure FID (First Input Delay)
     */
    private measureFID(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('first-input', (event) => {
            const entry = ((event as any).entries?.[0]) as FirstInputEntry | undefined;
            if (entry) {
                const fid = entry.processingStart - entry.startTime;
                this.recordMetric('FID', fid, 'ms', {
                    eventType: entry.name,
                });
            }
        });
    }

    /**
     * Measure INP (Interaction to Next Paint)
     */
    private measureINP(): void {
        if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries() as PerformanceEventTiming[];
                // INP is typically the longest interaction
                let maxDuration = 0;
                for (const entry of entries) {
                    const duration = entry.processingEnd - entry.startTime;
                    if (duration > maxDuration) {
                        maxDuration = duration;
                    }
                }
                if (maxDuration > 0) {
                    this.recordMetric('INP', maxDuration, 'ms');
                }
            });
            observer.observe({ entryTypes: ['event'] });
        } catch (e) {
            logger.debug('[PerformanceMonitor] INP tracking not supported');
        }
    }

    /**
     * Record a custom performance metric
     */
    recordMetric(
        name: string,
        value: number,
        unit: 'ms' | 'bytes' | 'count' = 'ms',
        context?: Record<string, unknown>
    ): void {
        const metric: PerformanceMetric = {
            name,
            value,
            unit,
            timestamp: Date.now(),
            context,
        };

        this.metrics.push(metric);

        // Log in development
        if (import.meta.env.DEV) {
            logger.debug(`[Performance] ${name}: ${value}${unit}`, context);
        }

        // Send to analytics in production
        if (this.isEnabled && window.gtag) {
            window.gtag('event', 'performance_metric', {
                event_category: 'Performance',
                event_label: name,
                value: Math.round(value),
                custom_parameter_1: unit,
                ...context,
            });
        }

        // Trim old metrics
        if (this.metrics.length > 100) {
            this.metrics = this.metrics.slice(-50);
        }
    }

    /**
     * Measure function execution time
     */
    async measure<T>(
        name: string,
        fn: () => Promise<T>,
        context?: Record<string, unknown>
    ): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.recordMetric(name, duration, 'ms', { ...context, success: true });
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(name, duration, 'ms', { ...context, success: false, error: String(error) });
            throw error;
        }
    }

    /**
     * Measure sync function execution time
     */
    measureSync<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
        const start = performance.now();
        try {
            const result = fn();
            const duration = performance.now() - start;
            this.recordMetric(name, duration, 'ms', { ...context, success: true });
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(name, duration, 'ms', { ...context, success: false, error: String(error) });
            throw error;
        }
    }

    /**
     * Measure React component render time
     */
    measureRender(componentName: string, renderFn: () => void): void {
        const start = performance.now();
        renderFn();
        const duration = performance.now() - start;
        this.recordMetric(`render_${componentName}`, duration, 'ms');
    }

    /**
     * Measure API call performance
     */
    async measureApiCall<T>(
        endpoint: string,
        fn: () => Promise<T>
    ): Promise<T> {
        return this.measure(`api_${endpoint}`, fn, { endpoint });
    }

    /**
     * Measure image loading performance
     */
    measureImageLoad(imageUrl: string, element?: HTMLImageElement): void {
        if (!element) return;
        
        const start = performance.now();
        
        const onLoad = () => {
            const duration = performance.now() - start;
            this.recordMetric('image_load', duration, 'ms', { 
                url: imageUrl.substring(0, 100), // Truncate for privacy
                naturalWidth: element.naturalWidth,
                naturalHeight: element.naturalHeight,
            });
            element.removeEventListener('load', onLoad);
        };

        const onError = () => {
            const duration = performance.now() - start;
            this.recordMetric('image_load_error', duration, 'ms', { 
                url: imageUrl.substring(0, 100),
            });
            element.removeEventListener('error', onError);
        };

        element.addEventListener('load', onLoad);
        element.addEventListener('error', onError);
    }

    /**
     * Get all recorded metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    /**
     * Get metrics summary
     */
    getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
        const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};

        for (const metric of this.metrics) {
            if (!summary[metric.name]) {
                summary[metric.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
            }

            const s = summary[metric.name];
            s.count++;
            s.min = Math.min(s.min, metric.value);
            s.max = Math.max(s.max, metric.value);
            s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
        }

        return summary;
    }

    /**
     * Get Web Vitals report
     */
    getWebVitalsReport(): Partial<WebVitalsReport> {
        const report: Partial<WebVitalsReport> = {};

        const webVitals = this.metrics.filter(m => ['CLS', 'FCP', 'LCP', 'FID', 'TTFB', 'INP'].includes(m.name));

        for (const metric of webVitals) {
            report[metric.name.toLowerCase() as keyof WebVitalsReport] = metric.value;
        }

        return report;
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics = [];
    }

    /**
     * Mark a performance milestone
     */
    mark(name: string): void {
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark(name);
        }
        this.recordMetric(`mark_${name}`, performance.now(), 'ms');
    }

    /**
     * Measure between two marks
     */
    measureBetween(name: string, startMark: string, endMark: string): void {
        if (typeof performance !== 'undefined' && performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
                const entries = performance.getEntriesByName(name);
                if (entries.length > 0) {
                    this.recordMetric(name, entries[0].duration, 'ms');
                }
            } catch (e) {
                logger.debug(`[PerformanceMonitor] Failed to measure ${name}`, e);
            }
        }
    }

    /**
     * Report metrics to console (for debugging)
     */
    reportToConsole(): void {
        const summary = this.getSummary();
        const webVitals = this.getWebVitalsReport();
        
        console.group('[PerformanceMonitor] Report');
        console.table(summary);
        console.log('Web Vitals:', webVitals);
        console.groupEnd();
    }
}

export const performanceMonitor = new PerformanceMonitorService();

/**
 * React hook for measuring component render performance
 */
export function usePerformanceMeasure(componentName: string) {
    return {
        markRender: () => performanceMonitor.mark(`${componentName}_render`),
        markMount: () => performanceMonitor.mark(`${componentName}_mount`),
        markUpdate: () => performanceMonitor.mark(`${componentName}_update`),
    };
}

export default performanceMonitor;
