import { logger } from "@clickflash/logger";

export interface ErrorContext {
  [key: string]: unknown;
}

export class SimpleErrorLogger {
  private static instance: SimpleErrorLogger;
  private errors: Array<{ timestamp: string; error: string; context?: ErrorContext }> = [];
  private maxErrors = 50;

  private constructor() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('clickflash_errors');
        if (stored) {
          this.errors = JSON.parse(stored);
        }
      }
    } catch (e) {
      // Ignore
    }
  }

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
    logger.error('[ErrorLogger]', { args: [errorEntry] });

    // Store in localStorage for persistence
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('clickflash_errors', JSON.stringify(this.errors));
      }
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
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('clickflash_errors');
      }
    } catch (e) {
      // Ignore
    }
  }
}

export const errorLogger = SimpleErrorLogger.getInstance();

export function initErrorLogger(): void {
  if (typeof window !== 'undefined') {
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
  }

  logger.info(String('[ErrorLogger] Initialized - free error tracking active'));
}
