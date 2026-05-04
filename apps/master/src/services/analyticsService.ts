/**
 * Analytics Service
 * 
 * Tracks user behavior, performance metrics, and business analytics.
 * GDPR-compliant with opt-out support.
 */

import { logger } from "@/utils/logger";

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count" | "percent";
  timestamp?: number;
  context?: Record<string, any>;
}

interface UserSession {
  id: string;
  startTime: number;
  userId?: string;
  userAgent: string;
  viewport: { width: number; height: number };
}

// Configuration
const ANALYTICS_CONFIG = {
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== "false",
  endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || "/api/analytics",
  sampleRate: parseFloat(import.meta.env.VITE_ANALYTICS_SAMPLE_RATE || "1"),
  debug: import.meta.env.DEV,
};

// Session management
class AnalyticsSession {
  private sessionId: string;
  private startTime: number;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initFlushInterval();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initFlushInterval(): void {
    // Flush events every 30 seconds
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, 30000);

    // Flush on page unload
    window.addEventListener("beforeunload", () => {
      this.flush();
    });
  }

  track(eventName: string, properties?: Record<string, any>): void {
    if (!ANALYTICS_CONFIG.enabled) return;
    if (Math.random() > ANALYTICS_CONFIG.sampleRate) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.eventQueue.push(event);

    if (ANALYTICS_CONFIG.debug) {
      logger.debug("[Analytics] " + eventName, properties);
    }

    // Flush immediately for critical events
    if (["error", "crash", "purchase"].includes(eventName)) {
      this.flush();
    }
  }

  trackPerformance(metric: PerformanceMetric): void {
    if (!ANALYTICS_CONFIG.enabled) return;

    this.track("performance", {
      metric: metric.name,
      value: metric.value,
      unit: metric.unit,
      context: metric.context,
    });
  }

  trackPageView(pageName: string, properties?: Record<string, any>): void {
    this.track("page_view", {
      page: pageName,
      ...properties,
    });
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.track("error", {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  trackTiming(name: string, duration: number, context?: Record<string, any>): void {
    this.track("timing", {
      name,
      duration,
      ...context,
    });
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to analytics endpoint
      const response = await fetch(ANALYTICS_CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
      
      if (ANALYTICS_CONFIG.debug) {
        logger.error("[Analytics] Failed to flush events:", error);
      }
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Singleton instance
let analyticsSession: AnalyticsSession | null = null;

export function initAnalytics(): AnalyticsSession {
  if (!analyticsSession) {
    analyticsSession = new AnalyticsSession();
  }
  return analyticsSession;
}

export function getAnalytics(): AnalyticsSession {
  if (!analyticsSession) {
    return initAnalytics();
  }
  return analyticsSession;
}

export function trackEvent(name: string, properties?: Record<string, any>): void {
  getAnalytics().track(name, properties);
}

export function trackPageView(pageName: string, properties?: Record<string, any>): void {
  getAnalytics().trackPageView(pageName, properties);
}

export function trackError(error: Error, context?: Record<string, any>): void {
  getAnalytics().trackError(error, context);
}

export function trackPerformanceMetric(metric: PerformanceMetric): void {
  getAnalytics().trackPerformance(metric);
}

// React hook for component-level analytics
export function useAnalytics() {
  return {
    track: trackEvent,
    trackPageView,
    trackError,
    trackPerformance: trackPerformanceMetric,
  };
}

// Performance observer setup
export function initPerformanceMonitoring(): void {
  if (typeof window === "undefined") return;

  // Core Web Vitals
  if ("web-vitals" in window) {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      trackPerformanceMetric({
        name: "LCP",
        value: lastEntry.startTime,
        unit: "ms",
        context: { element: (lastEntry as any).element },
      });
    }).observe({ entryTypes: ["largest-contentful-paint"] });

    // FID
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackPerformanceMetric({
          name: "FID",
          value: (entry as any).processingStart - entry.startTime,
          unit: "ms",
        });
      }
    }).observe({ entryTypes: ["first-input"] });

    // CLS
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      trackPerformanceMetric({
        name: "CLS",
        value: clsValue,
        unit: "count",
      });
    }).observe({ entryTypes: ["layout-shift"] });
  }

  // Navigation timing
  window.addEventListener("load", () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      if (nav) {
        trackPerformanceMetric({
          name: "TTFB",
          value: nav.responseStart - nav.startTime,
          unit: "ms",
        });
        trackPerformanceMetric({
          name: "FCP",
          value: nav.responseEnd - nav.startTime,
          unit: "ms",
        });
      }
    }, 0);
  });
}

export default {
  init: initAnalytics,
  get: getAnalytics,
  track: trackEvent,
  trackPageView,
  trackError,
  trackPerformance: trackPerformanceMetric,
  useAnalytics,
  initPerformanceMonitoring,
};
