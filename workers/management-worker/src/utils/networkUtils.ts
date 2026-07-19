import { logger } from "@clickflash/logger";

// Management Worker network utilities.

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
  jitter: true,
};

/**
 * Executes an async function with exponential backoff and jitter.
 * Specifically for Cloudflare Workers calling external APIs (e.g. Gemini).
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  onRetry?: (error: any, attempt: number) => void
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;

      if (attempt > opts.maxRetries) {
        throw error;
      }

      // Calculate delay: initialDelay * (factor ^ (attempt - 1))
      let delay = opts.initialDelay * Math.pow(opts.factor, attempt - 1);
      delay = Math.min(delay, opts.maxDelay);

      if (opts.jitter) {
        delay = delay * (0.5 + Math.random());
      }

      if (onRetry) {
        onRetry(error, attempt);
      }

      logger.warn(String(`[Retry] Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms...`) + ' ' + String({
                error: error.message,
              }));

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Retry loop failed unexpectedly");
}
