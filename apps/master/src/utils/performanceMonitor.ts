/**
 * Performance Monitoring Utility
 * Tracks app performance metrics and reports slow operations
 */

interface PerformanceMetrics {
  componentRenderTime: Map<string, number>;
  apiCallTime: Map<string, number>;
  dbQueryTime: Map<string, number>;
}

const metrics: PerformanceMetrics = {
  componentRenderTime: new Map(),
  apiCallTime: new Map(),
  dbQueryTime: new Map(),
};

const SLOW_RENDER_THRESHOLD = 50; // ms
const SLOW_API_THRESHOLD = 1000; // ms
const _SLOW_DB_THRESHOLD = 100; // ms

/**
 * Measure component render time
 */
export function measureRenderTime<T>(
  componentName: string,
  renderFn: () => T
): T {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  const duration = end - start;
  
  metrics.componentRenderTime.set(componentName, duration);
  
  if (duration > SLOW_RENDER_THRESHOLD) {
    console.warn(`[Performance] Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Measure async operation time
 */
export async function measureAsyncTime<T>(
  operationName: string,
  operation: () => Promise<T>,
  threshold: number = SLOW_API_THRESHOLD
): Promise<T> {
  const start = performance.now();
  const result = await operation();
  const end = performance.now();
  const duration = end - start;
  
  metrics.apiCallTime.set(operationName, duration);
  
  if (duration > threshold) {
    console.warn(`[Performance] Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Create a performance marker
 */
export function mark(markerName: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(markerName);
  }
}

/**
 * Measure between two markers
 */
export function measure(measureName: string, startMark: string, endMark: string): void {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(measureName, startMark, endMark);
      const entries = performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        const duration = entries[0].duration;
        if (duration > SLOW_RENDER_THRESHOLD) {
          console.warn(`[Performance] ${measureName}: ${duration.toFixed(2)}ms`);
        }
      }
    } catch (e) {
      // Mark may not exist
    }
  }
}

/**
 * Get all metrics
 */
export function getMetrics(): PerformanceMetrics {
  return {
    componentRenderTime: new Map(metrics.componentRenderTime),
    apiCallTime: new Map(metrics.apiCallTime),
    dbQueryTime: new Map(metrics.dbQueryTime),
  };
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  metrics.componentRenderTime.clear();
  metrics.apiCallTime.clear();
  metrics.dbQueryTime.clear();
}

/**
 * Report Web Vitals to console
 */
export function reportWebVitals(): void {
  if (typeof window === 'undefined') return;
  
  // Largest Contentful Paint
  if ('web-vitals' in window) {
    // @ts-ignore
    const { getLCP, getFID, getFCP, getCLS, getTTFB } = window['web-vitals'];
    if (getLCP) getLCP(console.log);
    if (getFID) getFID(console.log);
    if (getFCP) getFCP(console.log);
    if (getCLS) getCLS(console.log);
    if (getTTFB) getTTFB(console.log);
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize expensive function calls
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
