import { logger as coreLogger } from '@clickflash/logger';
/// <reference types="vite/client" />
import { getEnv } from './env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    const env = getEnv();
    const envLevel = (env.VITE_LOG_LEVEL || 'INFO').toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
    this.isDevelopment = Boolean(env.DEV) || env.MODE === 'development';
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
      coreLogger.info(`[${entry.timestamp}] ${entry.level}: ${entry.message}`, { style, data: data || error });
      if (entry.stack) coreLogger.info('Stack:', { stack: entry.stack });
    } else {
      coreLogger.info(entry.message, { data: entry });
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

export const logger = new Logger();
