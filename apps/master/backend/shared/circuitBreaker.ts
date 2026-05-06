/**
 * Simple Circuit Breaker Implementation
 * For protecting against cascading failures in external service calls
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes in half-open before closing
  timeout: number;               // Time in ms before trying again (half-open)
}

export interface CircuitBreakerStats {
  failures: number;
  successes: number;
  state: CircuitState;
  lastFailure: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: number | null = null;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 3,
      timeout: options.timeout ?? 60000, // 1 minute
    };
  }

  getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() - (this.lastFailure ?? 0) > this.options.timeout) {
        this.state = CircuitState.HALF_OPEN;
      }
    }
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      failures: this.failures,
      successes: this.successes,
      state: this.getState(),
      lastFailure: this.lastFailure,
    };
  }

  async execute<T>(fn: () => Promise<T>, fallbackFn?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      if (fallbackFn) {
        return fallbackFn();
      }
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallbackFn && currentState === CircuitState.HALF_OPEN) {
        return fallbackFn();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN && this.successes >= this.options.successThreshold) {
      this.state = CircuitState.CLOSED;
      this.successes = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
  }
}

// Singleton registry for circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(options));
  }
  return circuitBreakers.get(name)!;
}

export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach(cb => cb.reset());
}
