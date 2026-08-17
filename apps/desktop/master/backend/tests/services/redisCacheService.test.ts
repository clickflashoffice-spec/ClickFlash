import { describe, it, test, expect, beforeEach, afterEach } from 'vitest';
import { RedisCacheService } from '../../services/redisCacheService';

describe('RedisCacheService', () => {
  let cache: RedisCacheService;

  beforeEach(() => {
    cache = (RedisCacheService as any).instance = new (RedisCacheService as any)();
  });

  afterEach(async () => {
    await cache.close();
  });

  it('should get and set values in memory fallback mode', async () => {
    await cache.set('test-key', { foo: 'bar' });
    const val = await cache.get<{ foo: string }>('test-key');
    expect(val).toEqual({ foo: 'bar' });
  });

  it('should return null for non-existent keys', async () => {
    const val = await cache.get('non-existent');
    expect(val).toBeNull();
  });

  it('should delete keys correctly', async () => {
    await cache.set('del-key', 'hello');
    await cache.del('del-key');
    const val = await cache.get('del-key');
    expect(val).toBeNull();
  });

  it('should increment integer values', async () => {
    const v1 = await cache.incr('counter');
    const v2 = await cache.incr('counter');
    expect(v1).toBe(1);
    expect(v2).toBe(2);
  });

  it('should respect TTL in memory fallback', async () => {
    await cache.set('expired-key', 'data', { ttlSeconds: -1 }); // Already expired
    const val = await cache.get('expired-key');
    expect(val).toBeNull();
  });

  it('should return health check via ping', async () => {
    const health = await cache.ping();
    expect(health.connected).toBe(true);
  });
});
