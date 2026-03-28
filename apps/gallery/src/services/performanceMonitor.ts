/**
 * Performance Monitor Service
 * 
 * Tracks and reports performance metrics for the Gallery App.
 * Implements Core Web Vitals tracking and custom performance markers.
 */

import { logger } from '@/utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface WebVitalsReport {
  lcp?: PerformanceMetric;  // Largest Contentful Paint
  fid?: PerformanceMetric;  // First Input Delay
  cls?: PerformanceMetric;  // Cumulative Layout Shift
  fcp?: PerformanceMetric;  // First Contentful Paint
  ttfb?: PerformanceMetric; // Time to First Byte
  inp?: PerformanceMetric;  // Interaction to Next Paint
}

interface PerformanceObserverEntry {
  entryType: string;
  name: string;
  startTime: number;
  duration?: number;
  value?: number;
  processingStart?: number;
  processingEnd?: number;
}

// ============================================================================
// Constants
// ============================================================================

const RATING_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },      // ms
  fid: { good: 100, poor: 300 },        // ms
  cls: { good: 0.1, poor: 0.25 },       // unitless
  fcp: { good: 1800, poor: 3000 },      // ms
  ttfb: { good: 600, poor: 1800 },      // ms
  inp: { good: 200, poor: 500 },        // ms
} as const;

// ============================================================================
// Performance Monitor Class
// ============================================================================

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private marks: Map<string, number> = new Map();
  private isEnabled: boolean;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.isEnabled = typeof window !== 'undefined' && 'performance' in window;
    
    if (this.isEnabled) {
      this.initializeObservers();
    }
  }

  /**
   * Initialize performance observers for Core Web Vitals
   */
  private initializeObservers(): void {
    if (!this.isEnabled) return;

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entries) => {
          const lastEntry = entries.getEntries().slice(-1)[0] as PerformanceObserverEntry;
          if (lastEntry) {
            this.recordMetric('lcp', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        // LCP not supported
      }
    }

    // First Input Delay (FID) and Interaction to Next Paint (INP)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((entries) => {
          const firstEntry = entries.getEntries()[0] as PerformanceObserverEntry;
          if (firstEntry && firstEntry.processingStart) {
            const value = firstEntry.processingStart - firstEntry.startTime;
            this.recordMetric('fid', value);
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        // FID not supported
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries() as PerformanceObserverEntry[]) {
            if (entry.value) {
              clsValue += entry.value;
            }
          }
          this.recordMetric('cls', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        // CLS not supported
      }
    }

    // First Contentful Paint (FCP) and Time to First Byte (TTFB)
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.measureFCP();
        this.measureTTFB();
      }, 0);
    });
  }

  /**
   * Measure First Contentful Paint
   */
  private measureFCP(): void {
    if (!this.isEnabled) return;

    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(
      (entry) => entry.name === 'first-contentful-paint'
    ) as PerformanceObserverEntry | undefined;

    if (fcpEntry) {
      this.recordMetric('fcp', fcpEntry.startTime);
    }
  }

  /**
   * Measure Time to First Byte
   */
  private measureTTFB(): void {
    if (!this.isEnabled) return;

    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0] as PerformanceObserverEntry;
      const ttfb = navEntry.startTime;
      this.recordMetric('ttfb', ttfb);
    }
  }

  /**
   * Get rating based on metric value and thresholds
   */
  private getRating(
    metricName: keyof typeof RATING_THRESHOLDS,
    value: number
  ): PerformanceMetric['rating'] {
    const thresholds = RATING_THRESHOLDS[metricName];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Record a performance metric
   */
  private recordMetric(name: string, value: number, context?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: this.getRating(name as keyof typeof RATING_THRESHOLDS, value),
      timestamp: Date.now(),
      context,
    };

    this.metrics.set(name, metric);

    // Log poor metrics for investigation
    if (metric.rating === 'poor') {
      logger.warn(`[Performance] Poor ${name.toUpperCase()} detected`, {
        value,
        threshold: RATING_THRESHOLDS[name as keyof typeof RATING_THRESHOLDS],
      });
    }

    // Send to analytics in production
    if (import.meta.env.PROD && (window as any).gtag) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: name,
        value: Math.round(value),
        custom_parameter_1: metric.rating,
      });
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Mark a timestamp for custom timing
   */
  mark(name: string): void {
    if (!this.isEnabled) return;

    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    performance.mark(name);
  }

  /**
   * Measure duration between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    if (!this.isEnabled) return null;

    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();

    if (start && end) {
      const duration = end - start;
      this.recordMetric(name, duration);
      return duration;
    }

    return null;
  }

  /**
   * Measure duration of a function execution
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...context, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...context, status: 'error', error });
      throw error;
    }
  }

  /**
   * Measure sync function execution
   */
  measureSync<T>(name: string, fn: () => T, context?: Record<string, unknown>): T {
    const start = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...context, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...context, status: 'error', error });
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): Map<string, PerformanceMetric> {
    return new Map(this.metrics);
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get Core Web Vitals report
   */
  getWebVitalsReport(): WebVitalsReport {
    const report: WebVitalsReport = {};
    
    const vitals: (keyof WebVitalsReport)[] = ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'inp'];
    vitals.forEach((vital) => {
      const metric = this.metrics.get(vital);
      if (metric) {
        report[vital] = metric;
      }
    });

    return report;
  }

  /**
   * Clear all metrics and marks
   */
  clear(): void {
    this.metrics.clear();
    this.marks.clear();
  }

  /**
   * Disconnect all observers
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.clear();
  }

  /**
   * Check if performance monitoring is available
   */
  isSupported(): boolean {
    return this.isEnabled;
  }

  /**
   * Report metrics to console (for debugging)
   */
  report(): void {
    if (import.meta.env.DEV) {
      console.table(
        Array.from(this.metrics.values()).map((m) => ({
          Metric: m.name.toUpperCase(),
          Value: m.name === 'cls' ? m.value.toFixed(3) : `${Math.round(m.value)}ms`,
          Rating: m.rating,
        }))
      );
    }
  }
}

// ============================================================================
// React Hook
// ============================================================================

import { useEffect, useCallback } from 'react';

/**
 * Hook for measuring component render performance
 */
export function usePerformanceMeasure(componentName: string) {
  useEffect(() => {
    performanceMonitor.mark(`${componentName}_mount_start`);
    
    requestAnimationFrame(() => {
      performanceMonitor.measure(
        `${componentName}_mount`,
        `${componentName}_mount_start`
      );
    });
  }, [componentName]);
}

/**
 * Hook for measuring async operations
 */
export function useAsyncMeasure() {
  return useCallback(
    async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
      return performanceMonitor.measureAsync(name, fn);
    },
    []
  );
}

// ============================================================================
// Singleton Export
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(): void {
  if (import.meta.env.DEV) {
    // Report metrics after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        performanceMonitor.report();
      }, 3000);
    });
  }

  // Log summary in production
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const report = performanceMonitor.getWebVitalsReport();
        const poorMetrics = Object.values(report).filter((m) => m?.rating === 'poor');
        
        if (poorMetrics.length > 0) {
          logger.warn('[Performance] Poor Core Web Vitals detected', {
            metrics: poorMetrics.map((m) => ({
              name: m?.name,
              value: m?.value,
            })),
          });
        }
      }, 5000);
    });
  }
}

export default performanceMonitor;
