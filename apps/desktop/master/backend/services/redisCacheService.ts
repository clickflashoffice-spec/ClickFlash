import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheOptions {
  ttlSeconds?: number;
}

/**
 * Enterprise Distributed Cache Service with In-Memory Fallback
 * 
 * Supports multi-kiosk resorts sharing session tokens, telemetry data,
 * and rate limits over Redis. If Redis is down or not configured (isolated resort),
 * seamlessly falls back to an in-memory Map with automatic TTL expiration.
 */
export class RedisCacheService {
  private static instance: RedisCacheService;
  private client: Redis | null = null;
  private memoryCache: Map<string, { value: string; expiresAt: number | null }> = new Map();
  private isRedisConnected = false;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.init();
    // Periodically clean up expired in-memory keys
    this.checkInterval = setInterval(() => this.cleanupMemoryCache(), 60000);
    if (this.checkInterval.unref) {
      this.checkInterval.unref();
    }
  }

  public static getInstance(): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  private init(): void {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
    if (!redisUrl && process.env.NODE_ENV === 'test') {
      // In test environment without explicit REDIS_URL, default straight to memory
      return;
    }

    try {
      const options: RedisOptions = {
        retryStrategy: (times: number) => {
          if (times > 5) {
            if (this.isRedisConnected) {
              logger.warn('[RedisCacheService] Redis connection lost, switching to in-memory fallback.');
              this.isRedisConnected = false;
            }
            return 10000; // Retry every 10s quietly
          }
          return Math.min(times * 500, 3000);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      };

      if (redisUrl && redisUrl.startsWith('redis://')) {
        this.client = new Redis(redisUrl, options);
      } else {
        this.client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          ...options,
        });
      }

      this.client.on('connect', () => {
        logger.info('[RedisCacheService] Connected to distributed Redis cache.');
        this.isRedisConnected = true;
      });

      this.client.on('error', (err) => {
        if (this.isRedisConnected) {
          logger.warn(`[RedisCacheService] Redis error: ${err.message}`);
        }
        this.isRedisConnected = false;
      });

      // Attempt non-blocking connection
      this.client.connect().catch(() => {
        logger.debug('[RedisCacheService] Initial Redis connection failed; using in-memory fallback.');
      });
    } catch (err: any) {
      logger.warn(`[RedisCacheService] Failed to initialize Redis client: ${err.message}`);
      this.isRedisConnected = false;
    }
  }

  /**
   * Get a cached value by key
   */
  public async get<T = string>(key: string): Promise<T | null> {
    if (this.isRedisConnected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw === null) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      } catch (err: any) {
        logger.debug(`[RedisCacheService] Redis get failed for ${key}, falling back to memory: ${err.message}`);
      }
    }

    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  /**
   * Set a cached value with optional TTL (seconds)
   */
  public async set(key: string, value: unknown, options?: CacheOptions): Promise<boolean> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const ttlSeconds = options?.ttlSeconds;

    if (this.isRedisConnected && this.client) {
      try {
        if (ttlSeconds !== undefined && ttlSeconds > 0) {
          await this.client.set(key, serialized, 'EX', ttlSeconds);
        } else if (ttlSeconds !== undefined && ttlSeconds <= 0) {
          await this.client.del(key);
          return true;
        } else {
          await this.client.set(key, serialized);
        }
        return true;
      } catch (err: any) {
        logger.debug(`[RedisCacheService] Redis set failed for ${key}, falling back to memory: ${err.message}`);
      }
    }

    const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value: serialized, expiresAt });
    return true;
  }

  /**
   * Delete a cached value by key
   */
  public async del(key: string): Promise<boolean> {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fallthrough to memory
      }
    }
    return this.memoryCache.delete(key);
  }

  /**
   * Increment an integer key atomically (useful for rate limiting)
   */
  public async incr(key: string, ttlSeconds = 60): Promise<number> {
    if (this.isRedisConnected && this.client) {
      try {
        const val = await this.client.incr(key);
        if (val === 1 && ttlSeconds > 0) {
          await this.client.expire(key, ttlSeconds);
        }
        return val;
      } catch {
        // Fallthrough to memory
      }
    }

    const entry = await this.get<number>(key);
    const newVal = (typeof entry === 'number' ? entry : parseInt(String(entry || 0), 10) || 0) + 1;
    await this.set(key, newVal, { ttlSeconds });
    return newVal;
  }

  /**
   * Check connection status and ping
   */
  public async ping(): Promise<{ connected: boolean; mode: 'redis' | 'memory' }> {
    if (this.isRedisConnected && this.client) {
      try {
        const res = await this.client.ping();
        if (res === 'PONG') {
          return { connected: true, mode: 'redis' };
        }
      } catch {
        this.isRedisConnected = false;
      }
    }
    return { connected: true, mode: 'memory' };
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  public async close(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
      this.client = null;
      this.isRedisConnected = false;
    }
  }
}

export const redisCache = RedisCacheService.getInstance();
