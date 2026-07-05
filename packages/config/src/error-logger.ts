/**
 * Simple Error Logger - Free alternative to Sentry
 * Logs errors to console and local storage for debugging
 */

interface ErrorContext {
  [key: string]: any;
}

class SimpleErrorLogger {
  private static instance: SimpleErrorLogger;
  private errors: Array<{ timestamp: string; error: string; context?: ErrorContext }> = [];
  private maxErrors = 100;

  static getInstance(): SimpleErrorLogger {
    if (!SimpleErrorLogger.instance) {
      SimpleErrorLogger.instance = new SimpleErrorLogger();
    }
    return SimpleErrorLogger.instance;
  }

  logError(error: Error | string, context?: ErrorContext): void {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
      context,
    };

    this.errors.push(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console
    console.error('[ErrorLogger]', errorEntry);

    // Store in localStorage for persistence
    try {
      localStorage.setItem('clickflash_errors', JSON.stringify(this.errors));
    } catch (e) {
      // localStorage might be full
    }
  }

  getErrors(): Array<{ timestamp: string; error: string; context?: ErrorContext }> {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
    try {
      localStorage.removeItem('clickflash_errors');
    } catch (e) {
      // Ignore
    }
  }
}

export const errorLogger = SimpleErrorLogger.getInstance();

export function initErrorLogger(): void {
  // Set up global error handler
  window.addEventListener('error', (event) => {
    errorLogger.logError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.logError('Unhandled Promise Rejection', {
      reason: event.reason?.message || event.reason,
    });
  });

  console.info('[ErrorLogger] Initialized - free error tracking active');
}
