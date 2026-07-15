import { logger as sharedLogger } from '@clickflash/logger';
/**
 * Structured Logger for MoneyTrash Uploader
 * 
 * Provides consistent, structured logging across the application
 * with support for different log levels and contextual information.
 */

/** Log levels */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Log entry structure */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  error?: any;
}

/** Logger configuration */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStoredEntries: number;
}

/** Log level priorities */
const LOG_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured Logger class
 */
class Logger {
  private config: LoggerConfig;
  private storedEntries: LogEntry[] = [];
  private readonly STORAGE_KEY = 'moneytrash_logs';

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: (import.meta.env.DEV ? 'debug' : 'info') as LogLevel,
      enableConsole: true,
      enableStorage: true,
      maxStoredEntries: 1000,
      ...config,
    };

    // Load stored logs from localStorage
    this.loadStoredLogs();
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.minLevel;
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_PRIORITIES[level] >= LOG_PRIORITIES[this.config.minLevel];
  }

  /**
   * Create a log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: any,
    error?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };
  }

  /**
   * Log a message
   */
  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Storage
    if (this.config.enableStorage) {
      this.storeEntry(entry);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;

    const styles: Record<LogLevel, string> = {
      debug: 'color: #6b7280',
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold',
    };

    switch (entry.level) {
      case 'debug':
        logger.debug(String(`%c${prefix}`) + ' ' + String(styles[entry.level]) + ' ' + String(entry.message) + ' ' + String(entry.context || ''));
        break;
      case 'info':
        logger.info(String(`%c${prefix}`) + ' ' + String(styles[entry.level]) + ' ' + String(entry.message) + ' ' + String(entry.context || ''));
        break;
      case 'warn':
        sharedLogger.warn(entry.message, entry.context as any);
        break;
      case 'error':
        sharedLogger.error(entry.message, entry.error as any, entry.context as any);
        break;
    }
  }

  /**
   * Store log entry in memory and localStorage
   */
  private storeEntry(entry: LogEntry): void {
    this.storedEntries.push(entry);

    // Trim old entries
    if (this.storedEntries.length > this.config.maxStoredEntries) {
      this.storedEntries = this.storedEntries.slice(-this.config.maxStoredEntries);
    }

    // Persist to localStorage (async to not block)
    if (typeof window !== 'undefined') {
      this.persistLogs();
    }
  }

  /**
   * Load stored logs from localStorage
   */
  private loadStoredLogs(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.storedEntries = JSON.parse(stored);
      }
    } catch (e) {
      sharedLogger.warn('Failed to load stored logs:', e as any);
    }
  }

  /**
   * Persist logs to localStorage
   */
  private persistLogs(): void {
    try {
      // Only store last 100 entries in localStorage to avoid quota issues
      const toStore = this.storedEntries.slice(-100);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      // Silently fail if localStorage is full
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void {
    this.log(this.createEntry('debug', message, context));
  }

  /**
   * Log an info message
   */
  info(message: string, context?: any): void {
    this.log(this.createEntry('info', message, context));
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    this.log(this.createEntry('warn', message, context));
  }

  /**
   * Log an error message
   */
  error(message: string, error?: any, context?: any): void {
    this.log(this.createEntry('error', message, context, error));
  }

  /**
   * Get all stored log entries
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.storedEntries.filter(entry => entry.level === level);
    }
    return [...this.storedEntries];
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.storedEntries.slice(-count);
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    this.storedEntries = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.storedEntries, null, 2);
  }

  /**
   * Create a child logger with predefined context
   */
  child(defaultContext: Record<string, unknown>): Logger {
    const childLogger = new Logger(this.config);
    const originalLog = this.log.bind(this);
    
    childLogger.log = (entry: LogEntry) => {
      originalLog({
        ...entry,
        context: { ...defaultContext, ...entry.context },
      });
    };
    
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };

// Convenience exports for common usage patterns
export const debug = (message: string, context?: any) => 
  logger.debug(message, context);

export const info = (message: string, context?: any) => 
  logger.info(message, context);

export const warn = (message: string, context?: any) => 
  logger.warn(message, context);

export const error = (message: string, err?: Error, context?: any) => 
  logger.error(message, err, context);
