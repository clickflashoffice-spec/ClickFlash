import { describe, expect, it, vi } from 'vitest';

import {
  calculateFullJitterDelay,
  GeminiClient,
  parseRetryAfter,
} from './gemini-client.js';

const config = {
  apiKey: 'test-api-key',
  model: 'gemini-2.0-flash' as const,
};

describe('Gemini retry policy', () => {
  it('parses delta seconds and HTTP dates with a bounded delay', () => {
    const now = Date.parse('2026-08-11T10:00:00Z');

    expect(parseRetryAfter('2.5', now)).toBe(2_500);
    expect(parseRetryAfter('Mon, 11 Aug 2026 10:00:05 GMT', now)).toBe(5_000);
    expect(parseRetryAfter('invalid', now)).toBeNull();
    expect(parseRetryAfter('3600', now)).toBe(60_000);
  });

  it('uses full jitter inside the exponential cap', () => {
    expect(calculateFullJitterDelay(0, () => 0)).toBe(0);
    expect(calculateFullJitterDelay(2, () => 0.5)).toBe(2_000);
    expect(calculateFullJitterDelay(20, () => 1)).toBe(60_000);
  });

  it('retries 5xx responses, honors Retry-After, and authenticates by header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('busy', {
          status: 503,
          headers: { 'Retry-After': '2' },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        }),
      );
    const delays: number[] = [];
    const client = new GeminiClient(config, {
      fetch: fetchMock,
      sleep: async (delayMs) => {
        delays.push(delayMs);
      },
      now: () => 0,
      random: () => 0.5,
    });

    const result = await client.chat([{ role: 'user', content: 'hello' }]);

    expect(result).toMatchObject({ success: true, data: 'ok' });
    expect(delays).toEqual([2_000]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get('x-goog-api-key')).toBe('test-api-key');
  });

  it('does not retry non-retryable client errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));
    const sleep = vi.fn(async () => undefined);
    const client = new GeminiClient(config, { fetch: fetchMock, sleep });

    const result = await client.chat([{ role: 'user', content: 'hello' }]);

    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
