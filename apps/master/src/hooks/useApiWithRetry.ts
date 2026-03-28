import { useState, useCallback, useRef } from 'react';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

interface UseApiWithRetryReturn<T> extends ApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
  cancel: () => void;
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Hook for API calls with automatic retry logic
 * 
 * @example
 * const { data, isLoading, error, execute } = useApiWithRetry(
 *   fetchPhotos,
 *   { maxRetries: 3, retryDelay: 1000 }
 * );
 * 
 * useEffect(() => {
 *   execute(albumId);
 * }, [albumId]);
 */
export function useApiWithRetry<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  config: RetryConfig = {}
): UseApiWithRetryReturn<T> {
  const {
    maxRetries,
    retryDelay,
    backoffMultiplier,
    shouldRetry,
  } = { ...defaultConfig, ...config };

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      data: null,
      isLoading: false,
      error: null,
      retryCount: 0,
    });
  }, [cancel]);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      isCancelledRef.current = false;

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      let lastError: Error | null = null;
      let currentDelay = retryDelay;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Check if cancelled before attempting
          if (isCancelledRef.current) {
            return null;
          }

          const result = await apiFunction(...args);
          
          // Check if cancelled after successful call
          if (isCancelledRef.current) {
            return null;
          }

          setState({
            data: result,
            isLoading: false,
            error: null,
            retryCount: attempt,
          });

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Check if cancelled
          if (isCancelledRef.current || abortControllerRef.current?.signal.aborted) {
            return null;
          }

          // Don't retry if we shouldn't
          if (!shouldRetry(lastError) || attempt === maxRetries) {
            break;
          }

          // Update state to show retry
          setState(prev => ({
            ...prev,
            retryCount: attempt + 1,
          }));

          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= backoffMultiplier;
        }
      }

      // All retries exhausted
      setState({
        data: null,
        isLoading: false,
        error: lastError,
        retryCount: maxRetries,
      });

      return null;
    },
    [apiFunction, maxRetries, retryDelay, backoffMultiplier, shouldRetry]
  );

  return {
    ...state,
    execute,
    reset,
    cancel,
  };
}

/**
 * Default retry decision function
 * Retries on network errors and 5xx server errors
 */
export function defaultShouldRetry(error: Error): boolean {
  // Network errors (no response)
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.message.includes('timeout')) {
    return true;
  }

  // Abort errors - don't retry
  if (error.name === 'AbortError') {
    return false;
  }

  // Server errors (5xx) - retry
  if (error.message.match(/5\d{2}/)) {
    return true;
  }

  // Client errors (4xx) - don't retry (except 429 rate limit)
  if (error.message.match(/4\d{2}/) && !error.message.includes('429')) {
    return false;
  }

  return true;
}

/**
 * Hook specifically for data fetching with retry
 */
export function useFetchWithRetry<T>(
  fetchFunction: (...args: any[]) => Promise<T>,
  immediate: boolean = false,
  config: RetryConfig = {}
) {
  const { execute, ...state } = useApiWithRetry(fetchFunction, config);

  return {
    ...state,
    refetch: execute,
  };
}

export default useApiWithRetry;
