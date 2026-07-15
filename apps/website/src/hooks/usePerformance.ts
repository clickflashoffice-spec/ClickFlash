"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@clickflash/logger";

// ─── Browser API extensions used in this file ────────────────────────────────

/** PerformanceObserver "layout-shift" entries — not yet in the standard lib.dom typings. */
interface LayoutShiftEntry extends PerformanceEntry {
  readonly value: number;
  readonly hadRecentInput: boolean;
}

/** Element Timing API marker — set on elements we want LCP to track. */
interface ElementTimingTarget extends Element {
  elementTiming: string;
}

/** Google Analytics 4 gtag.js global. Present only after GA4 snippet has loaded. */
type GtagFn = (
  command: "event",
  eventName: string,
  params?: Record<string, unknown>,
) => void;
interface GtagWindow {
  gtag?: GtagFn;
}

// Core Web Vitals thresholds based on Google's recommendations
const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },   // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint (ms)
};

type WebVitalName = keyof typeof WEB_VITALS_THRESHOLDS;
type WebVitalRating = "good" | "needs-improvement" | "poor";

interface WebVitalMetric {
  name: WebVitalName;
  value: number;
  rating: WebVitalRating;
  delta?: number;
  id?: string;
  navigationType?: string;
}

interface PerformanceMetrics {
  webVitals: Partial<Record<WebVitalName, WebVitalMetric>>;
  memory?: MemoryInfo;
  resources?: PerformanceResourceTiming[];
  longTasks?: PerformanceEntry[];
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Type augmentation for Navigator
interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
  connection?: NetworkInformation;
}

interface NetworkInformation {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
}

// Type augmentation for Performance
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/**
 * Get rating based on threshold
 */
function getRating(value: number, thresholds: { good: number; poor: number }): WebVitalRating {
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.poor) return "needs-improvement";
  return "poor";
}

/**
 * Hook for tracking Core Web Vitals and performance metrics
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { metrics, observeElement } = usePerformance({
 *     onMetric: (metric) => console.log(metric),
 *     reportToAnalytics: true,
 *   });
 *   
 *   return <div ref={observeElement}>Content</div>;
 * }
 * ```
 */
export function usePerformance(options: {
  onMetric?: (metric: WebVitalMetric) => void;
  reportToAnalytics?: boolean;
  trackMemory?: boolean;
  trackResources?: boolean;
} = {}) {
  const { onMetric, reportToAnalytics, trackMemory, trackResources } = options;
  const [metrics, setMetrics] = useState<PerformanceMetrics>({ webVitals: {} });
  const observedElements = useRef<Set<Element>>(new Set());
  const metricBuffer = useRef<Partial<Record<WebVitalName, WebVitalMetric>>>({});

  /**
   * Report metric to analytics (Google Analytics 4, etc.)
   */
  const reportMetric = useCallback((metric: WebVitalMetric) => {
    if (!reportToAnalytics) return;

    // Google Analytics 4
    const gtagWindow = window as Window & GtagWindow;
    if (typeof window !== "undefined" && gtagWindow.gtag) {
      gtagWindow.gtag("event", `web_vitals_${metric.name.toLowerCase()}`, {
        event_category: "Web Vitals",
        event_label: metric.id,
        value: Math.round(metric.value),
        custom_parameter_1: metric.rating,
      });
    }

    // Send to console in development
    if (process.env.NODE_ENV === "development") {
      logger.info(`[Web Vitals] ${metric.name}:`, { value: metric.value, rating: metric.rating });
    }
  }, [reportToAnalytics]);

  /**
   * Update metric state
   */
  const updateMetric = useCallback((metric: WebVitalMetric) => {
    metricBuffer.current[metric.name] = metric;
    
    setMetrics((prev) => ({
      ...prev,
      webVitals: { ...prev.webVitals, [metric.name]: metric },
    }));

    onMetric?.(metric);
    reportMetric(metric);
  }, [onMetric, reportMetric]);

  /**
   * Measure LCP (Largest Contentful Paint)
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    let lcpValue = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      lcpValue = lastEntry.startTime;

      const metric: WebVitalMetric = {
        name: "LCP",
        value: lcpValue,
        rating: getRating(lcpValue, WEB_VITALS_THRESHOLDS.LCP),
        id: lastEntry.toString(),
      };

      updateMetric(metric);
    });

    try {
      observer.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (_e) {
      // LCP not supported
    }

    // Report final LCP on page hide
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && lcpValue > 0) {
        const metric: WebVitalMetric = {
          name: "LCP",
          value: lcpValue,
          rating: getRating(lcpValue, WEB_VITALS_THRESHOLDS.LCP),
        };
        updateMetric(metric);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [updateMetric]);

  /**
   * Measure CLS (Cumulative Layout Shift)
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    let clsValue = 0;
    const sessionEntries: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        const layoutShift = entry as LayoutShiftEntry;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          sessionEntries.push(entry);
        }
      }

      const metric: WebVitalMetric = {
        name: "CLS",
        value: clsValue,
        rating: getRating(clsValue, WEB_VITALS_THRESHOLDS.CLS),
      };

      updateMetric(metric);
    });

    try {
      observer.observe({ entryTypes: ["layout-shift"] });
    } catch (_e) {
      // CLS not supported
    }

    return () => observer.disconnect();
  }, [updateMetric]);

  /**
   * Measure FCP (First Contentful Paint)
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((e) => e.name === "first-contentful-paint") as PerformanceEntry & { startTime: number };

      if (fcpEntry) {
        const value = fcpEntry.startTime;
        const metric: WebVitalMetric = {
          name: "FCP",
          value,
          rating: getRating(value, WEB_VITALS_THRESHOLDS.FCP),
        };
        updateMetric(metric);
      }
    });

    try {
      observer.observe({ type: "paint", buffered: true } as PerformanceObserverInit);
    } catch (_e) {
      // FCP not supported
    }

    return () => observer.disconnect();
  }, [updateMetric]);

  /**
   * Measure TTFB (Time to First Byte)
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const value = navigation.responseStart;
      const metric: WebVitalMetric = {
        name: "TTFB",
        value,
        rating: getRating(value, WEB_VITALS_THRESHOLDS.TTFB),
      };
      // TTFB is derived from a one-time navigation entry and stored as a metric
      updateMetric(metric);
    }
  }, [updateMetric]);

  /**
   * Measure FID (First Input Delay)
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      if (entries.length > 0) {
        const firstEntry = entries[0] as PerformanceEntry & { processingStart: number; startTime: number };
        const value = firstEntry.processingStart - firstEntry.startTime;
        
        const metric: WebVitalMetric = {
          name: "FID",
          value,
          rating: getRating(value, WEB_VITALS_THRESHOLDS.FID),
        };
        updateMetric(metric);
      }
    });

    try {
      observer.observe({ type: "first-input", buffered: true } as PerformanceObserverInit);
    } catch (_e) {
      // FID not supported
    }

    return () => observer.disconnect();
  }, [updateMetric]);

  /**
   * Measure INP (Interaction to Next Paint) - New metric replacing FID
   */
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    let inpValue = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEntry[];
      
      // Find the worst interaction
      for (const entry of entries) {
        const e = entry as PerformanceEntry & { duration: number };
        if (e.duration > inpValue) {
          inpValue = e.duration;
        }
      }

      const metric: WebVitalMetric = {
        name: "INP",
        value: inpValue,
        rating: getRating(inpValue, WEB_VITALS_THRESHOLDS.INP),
      };
      updateMetric(metric);
    });

    try {
      observer.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    } catch (_e) {
      // INP not supported
    }

    return () => observer.disconnect();
  }, [updateMetric]);

  /**
   * Track memory usage
   */
  useEffect(() => {
    if (!trackMemory || typeof window === "undefined") return;

    const performance = window.performance as PerformanceWithMemory;
    
    if (!performance.memory) return;

    const updateMemory = () => {
      setMetrics((prev) => ({
        ...prev,
        memory: {
          usedJSHeapSize: performance.memory!.usedJSHeapSize,
          totalJSHeapSize: performance.memory!.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory!.jsHeapSizeLimit,
        },
      }));
    };

    updateMemory();
    const interval = setInterval(updateMemory, 5000);

    return () => clearInterval(interval);
  }, [trackMemory]);

  /**
   * Track resource loading
   */
  useEffect(() => {
    if (!trackResources || typeof window === "undefined") return;

    const updateResources = () => {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      
      // Filter to recent entries only
      const recentEntries = entries.filter((e) => {
        const now = performance.now();
        return now - e.startTime < 60000; // Last minute
      });

      setMetrics((prev) => ({
        ...prev,
        resources: recentEntries,
      }));
    };

    updateResources();
    const interval = setInterval(updateResources, 10000);

    return () => clearInterval(interval);
  }, [trackResources]);

  /**
   * Get element to observe for LCP
   */
  const observeElement = useCallback((element: Element | null) => {
    if (!element || observedElements.current.has(element)) return;
    
    observedElements.current.add(element);
    
    // Mark element for LCP tracking via the Element Timing API
    (element as ElementTimingTarget).elementTiming = "lcp-target";
  }, []);

  /**
   * Get performance score (0-100)
   */
  const getPerformanceScore = useCallback(() => {
    const vitals = metricBuffer.current;
    let score = 100;

    // Deduct points based on poor metrics
    if (vitals.LCP?.rating === "poor") score -= 25;
    else if (vitals.LCP?.rating === "needs-improvement") score -= 10;

    if (vitals.CLS?.rating === "poor") score -= 25;
    else if (vitals.CLS?.rating === "needs-improvement") score -= 10;

    if (vitals.FID?.rating === "poor") score -= 15;
    else if (vitals.FID?.rating === "needs-improvement") score -= 5;

    if (vitals.FCP?.rating === "poor") score -= 15;
    else if (vitals.FCP?.rating === "needs-improvement") score -= 5;

    return Math.max(0, score);
  }, []);

  return {
    metrics,
    observeElement,
    getPerformanceScore,
  };
}

/**
 * Hook for lazy loading 3D/heavy components based on device capabilities
 */
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    isMobile: false,
    isLowEndDevice: false,
    hasWebGL: true,
    prefersReducedMotion: false,
    connectionSpeed: "4g" as "slow-2g" | "2g" | "3g" | "4g",
    saveData: false,
    memory: 8,
    cores: 4,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = navigator as NavigatorWithMemory;
    const connection = nav.connection;

    // Check WebGL support
    let hasWebGL = true;
    try {
      const canvas = document.createElement("canvas");
      hasWebGL = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch {
      hasWebGL = false;
    }

    // initial client-only capability probe
    setCapabilities({
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
      isLowEndDevice: (nav.deviceMemory || 8) < 4 || (nav.hardwareConcurrency || 4) < 4,
      hasWebGL,
      prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      connectionSpeed: connection?.effectiveType || "4g",
      saveData: connection?.saveData || false,
      memory: nav.deviceMemory || 8,
      cores: nav.hardwareConcurrency || 4,
    });
  }, []);

  const shouldLoad3D = useCallback(() => {
    return (
      capabilities.hasWebGL &&
      !capabilities.isLowEndDevice &&
      !capabilities.prefersReducedMotion &&
      capabilities.connectionSpeed !== "slow-2g" &&
      capabilities.connectionSpeed !== "2g" &&
      !capabilities.saveData
    );
  }, [capabilities]);

  const shouldLoadHeavyAnimations = useCallback(() => {
    return (
      !capabilities.prefersReducedMotion &&
      !capabilities.isLowEndDevice &&
      capabilities.connectionSpeed !== "slow-2g"
    );
  }, [capabilities]);

  return {
    ...capabilities,
    shouldLoad3D,
    shouldLoadHeavyAnimations,
  };
}

/**
 * Hook for image loading optimization
 */
export function useImageOptimization() {
  const [supportedFormats, setSupportedFormats] = useState({
    webp: true,
    avif: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check WebP support
    const checkWebP = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = "data:image/webp;base64,UklGRi4AAABXRUJQVlA4TCEAAAAvAUAAEB8wAiMwAgSSNtse/cXjxyCCmrYNWPwmHRH9jwMA";
    });

    // Check AVIF support
    const checkAVIF = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
    });

    Promise.all([checkWebP, checkAVIF]).then(([webp, avif]) => {
      setSupportedFormats({ webp, avif });
    });
  }, []);

  const getOptimalFormat = useCallback(() => {
    if (supportedFormats.avif) return "avif";
    if (supportedFormats.webp) return "webp";
    return "jpeg";
  }, [supportedFormats]);

  return {
    ...supportedFormats,
    getOptimalFormat,
  };
}

/**
 * Hook for intersection observer based lazy loading
 */
export function useLazyLoad<T extends HTMLElement>(
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.unobserve(element);
        }
      },
      {
        rootMargin: "50px",
        threshold: 0.01,
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return { ref: elementRef, isVisible, hasLoaded };
}

export default usePerformance;
