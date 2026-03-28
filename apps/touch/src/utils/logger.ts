/**
 * Structured logging utility for frontend
 *
 * Provides log levels, structured data, and console formatting.
 * Supports both development (formatted) and production (JSON) logging.
 *
 * Log Levels:
 * - DEBUG: Detailed information for debugging
 * - INFO: General informational messages
 * - WARN: Warning messages for potential issues
 * - ERROR: Error messages for failures
 *
 * Configuration:
 * - Set log level via VITE_LOG_LEVEL environment variable
 * - Defaults to INFO level
 * - Development mode uses formatted console output
 * - Production mode uses structured JSON logging
 */

/** Log level enumeration */
export enum LogLevel {
  /** Detailed debugging information */
  DEBUG = 0,
  /** General informational messages */
  INFO = 1,
  /** Warning messages */
  WARN = 2,
  /** Error messages */
  ERROR = 3,
}

/** Log entry structure */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
  stack?: string;
}

/** Logger Class */
class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    // Use import.meta.env for Vite environment
    const envLevel = (import.meta.env.VITE_LOG_LEVEL || 'INFO').toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string, data?: unknown, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    if (data) entry.data = data;
    if (error) {
      entry.stack = error.stack;
      if (!entry.data) entry.data = { error: error.message };
    }
    return entry;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: unknown, error?: Error): void {
    if (!this.shouldLog(level)) return;
    const entry = this.formatMessage(levelName, message, data, error);
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      console.log(`%c[${entry.timestamp}] ${entry.level}: ${entry.message}`, style, data || error || '');
      if (entry.stack) console.log('%cStack:', 'color: #999; font-size: 11px;', entry.stack);
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'color: #888; font-size: 12px;',
      [LogLevel.INFO]: 'color: #2196F3; font-size: 12px; font-weight: bold;',
      [LogLevel.WARN]: 'color: #FF9800; font-size: 12px; font-weight: bold;',
      [LogLevel.ERROR]: 'color: #F44336; font-size: 12px; font-weight: bold;',
    };
    return styles[level] || '';
  }

  debug(message: string, data?: unknown): void { this.log(LogLevel.DEBUG, 'DEBUG', message, data); }
  info(message: string, data?: unknown): void { this.log(LogLevel.INFO, 'INFO', message, data); }
  warn(message: string, data?: unknown): void { this.log(LogLevel.WARN, 'WARN', message, data); }
  error(message: string, error?: Error | unknown, data?: unknown): void {
    const err = error instanceof Error ? error : undefined;
    this.log(LogLevel.ERROR, 'ERROR', message, data || error, err);
  }
}

/** Default logger instance */
export const logger = new Logger();
