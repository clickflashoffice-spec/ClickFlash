import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GeminiClient,
  parseRetryAfter,
  calculateFullJitterDelay,
} from './gemini-client.js';
import type { GeminiConfig } from './types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: GeminiConfig = {
  apiKey: 'test-key-123',
  model: 'gemini-2.0-flash',
  maxTokens: 512,
  temperature: 0.2,
};

function makeOkResponse(text: string, totalTokenCount = 42): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
      usageMetadata: { totalTokenCount },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function makeErrorResponse(status: number, body = 'Error'): Response {
  return new Response(body, { status });
}

// ─── parseRetryAfter ─────────────────────────────────────────────────────────

describe('parseRetryAfter', () => {
  it('returns null for null input', () => {
    expect(parseRetryAfter(null)).toBeNull();
  });

  it('parses integer seconds', () => {
    expect(parseRetryAfter('5', 0)).toBe(5_000);
  });

  it('clamps to MAX_RETRY_DELAY_MS (60 000)', () => {
    expect(parseRetryAfter('9999', 0)).toBe(60_000);
  });

  it('parses a future HTTP-date string', () => {
    const nowMs = 1_000_000;
    const futureMs = nowMs + 30_000;
    const dateStr = new Date(futureMs).toUTCString();
    const result = parseRetryAfter(dateStr, nowMs);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(60_000);
  });

  it('returns null for an unparseable string', () => {
    expect(parseRetryAfter('not-a-date', 0)).toBeNull();
  });
});

// ─── calculateFullJitterDelay ────────────────────────────────────────────────

describe('calculateFullJitterDelay', () => {
  it('returns 0 when random() returns 0', () => {
    expect(calculateFullJitterDelay(0, () => 0)).toBe(0);
  });

  it('stays within exponential cap for each attempt', () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const delay = calculateFullJitterDelay(attempt, () => 0.99);
      const cap = Math.min(60_000, 1_000 * 2 ** attempt);
      expect(delay).toBeLessThanOrEqual(cap);
    }
  });

  it('clamps random values outside [0, 1]', () => {
    // Out-of-range random values should not produce negative delays
    expect(calculateFullJitterDelay(0, () => -5)).toBeGreaterThanOrEqual(0);
    expect(calculateFullJitterDelay(0, () => 99)).toBeGreaterThanOrEqual(0);
  });
});

// ─── GeminiClient.analyzeImage ───────────────────────────────────────────────

describe('GeminiClient.analyzeImage', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let sleepMock: ReturnType<typeof vi.fn>;
  let client: GeminiClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    sleepMock = vi.fn().mockResolvedValue(undefined);
    client = new GeminiClient(DEFAULT_CONFIG, {
      fetch: fetchMock,
      sleep: sleepMock,
      random: () => 0.5,
      now: () => 0,
    });
  });

  it('returns success result on 200', async () => {
    fetchMock.mockResolvedValue(makeOkResponse('{"score": 95}'));
    const result = await client.analyzeImage('base64img', 'rate this photo');
    expect(result.success).toBe(true);
    expect(result.model).toBe('gemini-2.0-flash');
    expect(result.tokensUsed).toBe(42);
    expect(typeof result.durationMs).toBe('number');
  });

  it('sets x-goog-api-key header', async () => {
    fetchMock.mockResolvedValue(makeOkResponse('ok'));
    await client.analyzeImage('img', 'prompt');
    const [, options] = fetchMock.mock.calls[0];
    expect((options.headers as Headers).get('x-goog-api-key')).toBe('test-key-123');
  });

  it('includes JSON schema in request when schema provided', async () => {
    fetchMock.mockResolvedValue(makeOkResponse(JSON.stringify({ score: 80 })));
    const schema = { type: 'object', properties: { score: { type: 'number' } } };
    const result = await client.analyzeImage<{ score: number }>('img', 'prompt', schema);
    expect(result.success).toBe(true);
    expect((result.data as { score: number }).score).toBe(80);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.generationConfig.response_mime_type).toBe('application/json');
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(makeErrorResponse(429, 'rate limited'))
      .mockResolvedValueOnce(makeOkResponse('retry worked'));

    const result = await client.analyzeImage('img', 'prompt');
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(makeErrorResponse(500, 'server error'))
      .mockResolvedValueOnce(makeOkResponse('recovered'));
    const result = await client.analyzeImage('img', 'prompt');
    expect(result.success).toBe(true);
  });

  it('does NOT retry on 400 (non-retryable)', async () => {
    fetchMock.mockResolvedValue(makeErrorResponse(400, 'bad request'));
    const result = await client.analyzeImage('img', 'prompt');
    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns failure after exhausting 4 retries', async () => {
    fetchMock.mockResolvedValue(makeErrorResponse(503, 'unavailable'));
    const result = await client.analyzeImage('img', 'prompt');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('respects Retry-After header', async () => {
    const retryResponse = new Response('rate limited', {
      status: 429,
      headers: { 'Retry-After': '10' },
    });
    fetchMock
      .mockResolvedValueOnce(retryResponse)
      .mockResolvedValueOnce(makeOkResponse('ok'));
    await client.analyzeImage('img', 'prompt');
    expect(sleepMock).toHaveBeenCalledWith(10_000);
  });

  it('returns failure when API returns no text content', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [] } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await client.analyzeImage('img', 'prompt');
    expect(result.success).toBe(false);
    expect(result.error).toContain('No content returned');
  });

  it('propagates network errors as failure (not throw)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await client.analyzeImage('img', 'prompt');
    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });
});

// ─── GeminiClient.chat ───────────────────────────────────────────────────────

describe('GeminiClient.chat', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: GeminiClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    client = new GeminiClient(DEFAULT_CONFIG, {
      fetch: fetchMock,
      sleep: vi.fn().mockResolvedValue(undefined),
      random: () => 0.5,
      now: () => 0,
    });
  });

  it('maps assistant role to model', async () => {
    fetchMock.mockResolvedValue(makeOkResponse('Hello!'));
    await client.chat([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hey' },
    ]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.contents[1].role).toBe('model');
  });

  it('includes systemInstruction when systemPrompt provided', async () => {
    fetchMock.mockResolvedValue(makeOkResponse('response'));
    await client.chat([{ role: 'user', content: 'Hi' }], 'You are a ClickFlash assistant');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.systemInstruction.parts[0].text).toBe('You are a ClickFlash assistant');
  });

  it('returns plain text data (not JSON-parsed)', async () => {
    fetchMock.mockResolvedValue(makeOkResponse('The revenue is €12,345'));
    const result = await client.chat([{ role: 'user', content: 'Revenue?' }]);
    expect(result.success).toBe(true);
    expect(result.data).toBe('The revenue is €12,345');
  });
});

// ─── GeminiClient.batchAnalyze ───────────────────────────────────────────────

describe('GeminiClient.batchAnalyze', () => {
  it('processes all images sequentially and returns array', async () => {
    const responses = ['result1', 'result2', 'result3'];
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      return Promise.resolve(makeOkResponse(responses[callCount++] ?? 'extra'));
    });

    const client = new GeminiClient(DEFAULT_CONFIG, {
      fetch: fetchMock,
      sleep: vi.fn(),
      random: () => 0.5,
      now: () => 0,
    });

    const results = await client.batchAnalyze<string>(['img1', 'img2', 'img3'], 'analyze');
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns partial failures without stopping batch', async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 2) return Promise.resolve(makeErrorResponse(400, 'bad'));
      return Promise.resolve(makeOkResponse('ok'));
    });

    const client = new GeminiClient(DEFAULT_CONFIG, {
      fetch: fetchMock,
      sleep: vi.fn(),
      random: () => 0.5,
      now: () => 0,
    });

    const results = await client.batchAnalyze(['img1', 'img2', 'img3'], 'analyze');
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[2].success).toBe(true);
  });
});
