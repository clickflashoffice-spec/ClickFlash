import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoffAndJitter } from '../retry';

describe('retryWithBackoffAndJitter', () => {
  it('returns result immediately if initial execution succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await retryWithBackoffAndJitter(fn, {
      maxRetries: 3,
      baseDelayMs: 100,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns successful result', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error 1'))
      .mockRejectedValueOnce(new Error('Network error 2'))
      .mockResolvedValue('eventual success');

    const onRetry = vi.fn();

    const result = await retryWithBackoffAndJitter(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      jitter: false,
      onRetry,
    });

    expect(result).toBe('eventual success');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 10);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 20);
  });

  it('throws final error if maxRetries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Persistent outage'));

    await expect(
      retryWithBackoffAndJitter(fn, {
        maxRetries: 2,
        baseDelayMs: 5,
        jitter: false,
      })
    ).rejects.toThrow('Persistent outage');

    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('respects shouldRetry predicate and aborts early on non-retriable error', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('400 Bad Request'));

    const shouldRetry = (err: unknown) => {
      return err instanceof Error && !err.message.includes('400');
    };

    await expect(
      retryWithBackoffAndJitter(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        shouldRetry,
      })
    ).rejects.toThrow('400 Bad Request');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('applies jitter within expected bounds [0, maxDelay]', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Transient error'))
      .mockResolvedValue('recovered');

    // Deterministic random mock: 0.5
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const onRetry = vi.fn();

    const result = await retryWithBackoffAndJitter(fn, {
      maxRetries: 2,
      baseDelayMs: 100,
      factor: 2,
      jitter: true,
      onRetry,
    });

    expect(result).toBe('recovered');
    // baseDelayMs = 100, factor = 2, attempt 1 => delay = 100 * (2^0) = 100ms. With jitter (0.5) => 50ms
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 50);

    vi.restoreAllMocks();
  });
});
