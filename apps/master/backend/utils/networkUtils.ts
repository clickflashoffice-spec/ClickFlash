import { logger } from '../utils/logger';
// apps/master/backend/shared/networkUtils.ts

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    jitter?: boolean;
    retryIf?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    jitter: true,
    retryIf: () => true
};

/**
 * Executes an async function with exponential backoff and jitter.
 * Specifically for infrastructure/external service calls.
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
            
            // Check if we should retry based on the error predicate
            const shouldRetry = opts.retryIf(error);

            // Don't retry if it's the last attempt OR if the predicate says no
            if (attempt > opts.maxRetries || !shouldRetry) {
                if (!shouldRetry && attempt <= opts.maxRetries) {
                    logger.warn(`[Retry] Permanent failure detected. Aborting retries.`, { error: error.message });
                }
                throw error;
            }

            // Calculate delay: initialDelay * (factor ^ (attempt - 1))
            let delay = opts.initialDelay * Math.pow(opts.factor, attempt - 1);
            
            // Cap the delay
            delay = Math.min(delay, opts.maxDelay);

            // Add jitter (randomness to prevent thundering herd)
            if (opts.jitter) {
                delay = delay * (0.5 + Math.random());
            }

            if (onRetry) {
                onRetry(error, attempt);
            }

            logger.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms...`, { error: error.message });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error('Retry loop failed unexpectedly');
}

/**
 * Check if an error is transient (e.g. network timeout, rate limit)
 */
export function isTransientError(error: any): boolean {
    if (!error) return false;
    
    // Check for network codes
    const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
    if (transientCodes.includes(error.code)) return true;

    // Check for HTTP status codes (429 Too Many Requests, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
    if (error.response?.status) {
        const transientStatus = [429, 502, 503, 504];
        return transientStatus.includes(error.response.status);
    }

    return false;
}

/**
 * Safely extracts a message from an unknown error object.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}
