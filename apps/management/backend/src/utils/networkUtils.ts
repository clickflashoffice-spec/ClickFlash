/**
 * Executes an async function with exponential-backoff retry logic.
 * Safe for use in Cloudflare Workers (no Node.js dependencies).
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 200 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
