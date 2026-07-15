import { logger } from "@clickflash/logger";

/**
 * Cache Service for Management Hub
 * Simple in-memory cache with TTL support
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class CacheService<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private options: Required<CacheOptions>;
  private stats: CacheStats;

  constructor(options: CacheOptions = { ttl: 60000 }) {
    this.cache = new Map();
    this.options = {
      ttl: options.ttl,
      maxSize: options.maxSize || 1000,
    };
    this.stats = { hits: 0, misses: 0, size: 0 };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.options.ttl);

    // Evict oldest if at capacity
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, expiresAt });
    this.stats.size = this.cache.size;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return undefined;
    }

    this.stats.hits++;
    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.stats.size = this.cache.size;
    if (cleaned > 0) {
      logger.info(String(`[Cache] Cleaned up ${cleaned} expired entries`));
    }
  }
}

// Pre-configured caches for common use cases
export const caches = {
  // Short-lived cache for frequently changing data (1 minute)
  short: new CacheService({ ttl: 60000, maxSize: 500 }),

  // Medium-lived cache for relatively stable data (5 minutes)
  medium: new CacheService({ ttl: 300000, maxSize: 200 }),

  // Long-lived cache for static data (15 minutes)
  long: new CacheService({ ttl: 900000, maxSize: 100 }),
};

// Helper function for cached function execution
export async function withCache<T>(
  cache: CacheService<T>,
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await fetchFn();
  cache.set(key, value, ttl);
  return value;
}

export default CacheService;