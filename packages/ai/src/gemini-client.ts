import type { AIOperationResult, GeminiConfig } from './types.js';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 60_000;

type JsonSchema = Record<string, unknown>;
type FetchLike = (url: string, options: RequestInit) => Promise<Response>;

interface GeminiClientDependencies {
  fetch: FetchLike;
  sleep: (delayMs: number) => Promise<void>;
  random: () => number;
  now: () => number;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
  };
}

export function parseRetryAfter(
  value: string | null,
  nowMs: number = Date.now(),
): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, MAX_RETRY_DELAY_MS);
  }

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.min(Math.max(0, retryAt - nowMs), MAX_RETRY_DELAY_MS);
}

export function calculateFullJitterDelay(
  attempt: number,
  random: () => number = Math.random,
): number {
  const exponentialCap = Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** attempt,
  );
  return Math.floor(Math.max(0, Math.min(1, random())) * exponentialCap);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export class GeminiClient {
  private readonly config: GeminiConfig;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly dependencies: GeminiClientDependencies;

  constructor(
    config: GeminiConfig,
    dependencies: Partial<GeminiClientDependencies> = {},
  ) {
    this.config = config;
    this.dependencies = {
      fetch: dependencies.fetch ?? ((url, options) => fetch(url, options)),
      sleep:
        dependencies.sleep ??
        ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs))),
      random: dependencies.random ?? Math.random,
      now: dependencies.now ?? Date.now,
    };
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempts = 4,
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    if (this.config.apiKey && !headers.has('x-goog-api-key')) {
      headers.set('x-goog-api-key', this.config.apiKey);
    }
    const requestOptions: RequestInit = { ...options, headers };
    let lastNetworkError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      let response: Response;
      try {
        response = await this.dependencies.fetch(url, requestOptions);
      } catch (error: unknown) {
        lastNetworkError = error;
        if (isAbortError(error) || attempt === attempts - 1) {
          throw error;
        }
        await this.dependencies.sleep(
          calculateFullJitterDelay(attempt, this.dependencies.random),
        );
        continue;
      }

      if (response.ok) return response;

      const responseText = await response
        .text()
        .catch(() => `HTTP ${response.status}`);
      const apiError = new Error(
        `Gemini API Error (${response.status}): ${responseText}`,
      );

      if (!RETRYABLE_STATUSES.has(response.status) || attempt === attempts - 1) {
        throw apiError;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get('Retry-After'),
        this.dependencies.now(),
      );
      await this.dependencies.sleep(
        retryAfterMs ??
          calculateFullJitterDelay(attempt, this.dependencies.random),
      );
    }

    throw new Error(
      `Gemini request exhausted retries: ${errorMessage(lastNetworkError)}`,
    );
  }

  async analyzeImage<T>(
    imageBase64: string,
    prompt: string,
    schema?: JsonSchema,
  ): Promise<AIOperationResult<T>> {
    const startTime = Date.now();
    try {
      const url = `${this.baseUrl}/${this.config.model}:generateContent`;
      const generationConfig: Record<string, unknown> = {
        temperature: this.config.temperature ?? 0.2,
        maxOutputTokens: this.config.maxTokens ?? 1_024,
      };

      if (schema) {
        generationConfig.response_mime_type = 'application/json';
        generationConfig.response_schema = schema;
      }

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig,
        }),
      });

      const data = (await response.json()) as GeminiApiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No content returned from Gemini API');

      return {
        success: true,
        data: (schema ? JSON.parse(text) : text) as T,
        durationMs: Date.now() - startTime,
        model: this.config.model,
        tokensUsed: data.usageMetadata?.totalTokenCount,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: errorMessage(error),
        durationMs: Date.now() - startTime,
        model: this.config.model,
      };
    }
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
  ): Promise<AIOperationResult<string>> {
    const startTime = Date.now();
    try {
      const url = `${this.baseUrl}/${this.config.model}:generateContent`;
      const payload: Record<string, unknown> = {
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: this.config.temperature ?? 0.7,
          maxOutputTokens: this.config.maxTokens ?? 2_048,
        },
      };

      if (systemPrompt) {
        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GeminiApiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No content returned from Gemini API');

      return {
        success: true,
        data: text,
        durationMs: Date.now() - startTime,
        model: this.config.model,
        tokensUsed: data.usageMetadata?.totalTokenCount,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: errorMessage(error),
        durationMs: Date.now() - startTime,
        model: this.config.model,
      };
    }
  }

  async batchAnalyze<T>(
    images: string[],
    prompt: string,
    schema?: JsonSchema,
  ): Promise<Array<AIOperationResult<T>>> {
    const results: Array<AIOperationResult<T>> = [];
    for (const image of images) {
      results.push(await this.analyzeImage<T>(image, prompt, schema));
    }
    return results;
  }
}
