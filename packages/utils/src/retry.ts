export interface RetryOptions {
  /** Maximum number of retry attempts after the first failure. Default: 3 */
  maxRetries?: number;
  /** Base delay in milliseconds before exponential scaling. Default: 100 */
  baseDelayMs?: number;
  /** Exponential multiplier per attempt. Default: 2 */
  factor?: number;
  /** Maximum delay cap in milliseconds. Default: 30000 */
  maxDelayMs?: number;
  /** Whether to apply full jitter (random between 0 and calculated delay). Default: true */
  jitter?: boolean;
  /** Optional filter predicate determining whether an error should trigger a retry */
  shouldRetry?: (error: unknown) => boolean;
  /** Optional callback invoked before each retry sleep */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

/**
 * Executes an async operation with exponential backoff and optional jitter.
 */
export async function retryWithBackoffAndJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 100,
    factor = 2,
    maxDelayMs = 30000,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate exponential backoff: base * (factor ^ (attempt - 1))
      const exponentialDelay = Math.min(
        baseDelayMs * Math.pow(factor, attempt - 1),
        maxDelayMs
      );

      // Apply jitter: full jitter uniformly chooses in [0, exponentialDelay]
      const delayMs = jitter ? Math.random() * exponentialDelay : exponentialDelay;

      if (onRetry) {
        onRetry(attempt, error, delayMs);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
