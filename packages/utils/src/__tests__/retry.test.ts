import { describe, it, expect, vi } from 'vitest';
import { retry, calculateBackoff, delay } from '../retry.js';

describe('retry utils', () => {
  it('calculateBackoff', () => {
    const delay = calculateBackoff(2, 1000, 30000, 0);
    expect(delay).toBe(2000);
  });

  it('retry resolves', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    await expect(retry(fn)).resolves.toBe('success');
  });

  it('retry rejects after maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(retry(fn, { maxAttempts: 2, baseDelay: 1 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
