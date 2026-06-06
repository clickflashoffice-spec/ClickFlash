// apps/gallery/backend/utils/networkUtils.js

const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    jitter: true
};

/**
 * Executes an async function with exponential backoff and jitter.
 * Specifically for infrastructure/external service calls (e.g. Stripe).
 */
async function executeWithRetry(fn, options = {}, onRetry = null) {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let attempt = 0;

    while (attempt <= opts.maxRetries) {
        try {
            return await fn();
        } catch (error) {
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

            console.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms...`, { error: error.message });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error('Retry loop failed unexpectedly');
}

module.exports = { executeWithRetry };
