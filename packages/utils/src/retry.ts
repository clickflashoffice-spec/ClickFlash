export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: number;
  signal?: AbortSignal;
  onRetry?: (error: unknown, attempt: number) => void;
}

export function calculateBackoff(attempt: number, base = 1000, max = 30000, jitter = 0.1): number {
  const exponential = base * Math.pow(2, attempt - 1);
  const bounded = Math.min(exponential, max);
  const jitterAmount = bounded * jitter;
  const minJitter = bounded - jitterAmount;
  const maxJitter = bounded + jitterAmount;
  return Math.random() * (maxJitter - minJitter) + minJitter;
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason || new Error('Aborted'));
    }

    const timeout = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(signal.reason || new Error('Aborted'));
      }, { once: true });
    }
  });
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = 0.1,
    signal,
    onRetry
  } = options;

  let attempt = 1;

  while (true) {
    if (signal?.aborted) {
      throw signal.reason || new Error('Aborted');
    }

    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      onRetry?.(error, attempt);
      const backoffDelay = calculateBackoff(attempt, baseDelay, maxDelay, jitter);
      await delay(backoffDelay, signal);
      attempt++;
    }
  }
}
