import { logger } from "@clickflash/logger";

type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

const LOG_LEVELS: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

export class Logger {
  private logLevel: number;

  constructor(context: string, level: LogLevel = "INFO") {
    this.logLevel = LOG_LEVELS[level] ?? 2;
  }

  private writeLog(level: LogLevel, message: string, meta: any = {}): void {
    if (LOG_LEVELS[level] > this.logLevel) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    if (level === "ERROR") {
      logger.error(String(`[${level}] ${message}`) + ' ' + String(Object.keys(meta).length ? meta : ""));
    } else if (level === "WARN") {
      logger.warn(String(`[${level}] ${message}`) + ' ' + String(Object.keys(meta).length ? meta : ""));
    } else {
      logger.info(String(`[${level}] ${message}`) + ' ' + String(Object.keys(meta).length ? meta : ""));
    }
  }

  info(message: string, meta?: any): void {
    this.writeLog("INFO", message, meta);
  }
  warn(message: string, meta?: any): void {
    this.writeLog("WARN", message, meta);
  }
  error(message: string, meta?: any): void {
    this.writeLog("ERROR", message, meta);
  }
  debug(message: string, meta?: any): void {
    this.writeLog("DEBUG", message, meta);
  }
}

export default Logger;
