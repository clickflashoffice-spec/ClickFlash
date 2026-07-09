/**
 * @clickflash/logger — Structured Winston Logger for Node.js backends
 *
 * For frontend/browser logging, apps should use their local logger utility
 * (e.g., src/utils/logger.ts) which provides browser-compatible logging.
 *
 * Usage:
 *   import { createLogger, logger } from '@clickflash/logger';
 *
 *   // Use default logger
 *   logger.info('Server started', { port: 8090 });
 *
 *   // Create custom logger for a specific service
 *   const dbLogger = createLogger({ serviceName: 'master-db' });
 *   dbLogger.error('Connection failed', new Error('timeout'));
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

// =============================================================================
// TYPES
// =============================================================================

export interface LoggerConfig {
  /** Service name shown in log entries */
  serviceName: string;
  /** Directory for log files. Defaults to {cwd}/logs */
  logDir?: string;
  /** Minimum log level. Defaults to 'info' */
  level?: string;
  /** Enable console output. Defaults to true in non-production */
  enableConsole?: boolean;
  /** Enable file output. Defaults to true */
  enableFile?: boolean;
}

export interface LogMeta {
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, errorOrMeta?: Error | LogMeta, meta?: LogMeta): void;
}

// =============================================================================
// LOGGER FACTORY
// =============================================================================

export function createLogger(config: LoggerConfig): ILogger {
  const logDir = config.logDir || path.join(process.cwd(), 'logs');
  const level = config.level || 'info';

  const { combine, timestamp, printf, colorize, errors, json } = winston.format;

  const customFormat = printf(({ level: lvl, message, timestamp: ts, stack, service }) => {
    return `${ts} [${service}] ${lvl}: ${stack || message}`;
  });

  const transports: winston.transport[] = [];

  // File transports (enabled by default)
  if (config.enableFile !== false) {
    transports.push(
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: `${config.serviceName}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '14d',
        maxSize: '20m',
        format: combine(timestamp(), json()),
      }),
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: `${config.serviceName}-combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        maxSize: '20m',
        format: combine(timestamp(), json()),
      }),
    );
  }

  const winstonLogger = winston.createLogger({
    level,
    defaultMeta: { service: config.serviceName },
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      customFormat,
    ),
    transports,
  });

  // Console transport (enabled in non-production by default)
  const shouldEnableConsole =
    config.enableConsole !== undefined
      ? config.enableConsole
      : process.env.NODE_ENV !== 'production';

  if (shouldEnableConsole) {
    winstonLogger.add(
      new winston.transports.Console({
        format: combine(colorize(), customFormat),
      }),
    );
  }

  // Wrap in our standard interface
  return {
    debug(message: string, meta?: LogMeta): void {
      winstonLogger.debug(message, meta);
    },
    info(message: string, meta?: LogMeta): void {
      winstonLogger.info(message, meta);
    },
    warn(message: string, meta?: LogMeta): void {
      winstonLogger.warn(message, meta);
    },
    error(message: string, errorOrMeta?: Error | LogMeta, meta?: LogMeta): void {
      if (errorOrMeta instanceof Error) {
        winstonLogger.error(message, {
          error: errorOrMeta.message,
          stack: errorOrMeta.stack,
          ...meta,
        });
      } else {
        winstonLogger.error(message, errorOrMeta);
      }
    },
  };
}

// =============================================================================
// DEFAULT LOGGER INSTANCE
// =============================================================================

/** Default logger for quick usage. Service name: 'clickflash'. */
export const logger: ILogger = createLogger({ serviceName: 'clickflash' });

// =============================================================================
// NO-OP LOGGER (for testing)
// =============================================================================

/** Silent logger for unit tests where you don't want log output. */
export const noopLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// =============================================================================
// BROWSER LOGGER CLASS (for frontend apps to import directly)
// =============================================================================

/**
 * Lightweight browser logger class.
 * Frontend apps should create an instance in their own utils/logger.ts:
 *
 *   export const logger = new BrowserLogger('master-frontend');
 */
export class BrowserLogger implements ILogger {
  private service: string;

  constructor(serviceName: string) {
    this.service = serviceName;
  }

  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`%c[${this.service}] DEBUG`, 'color: #888; font-size: 11px;', message, meta || '');
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`%c[${this.service}] INFO`, 'color: #2196F3; font-size: 11px; font-weight: bold;', message, meta || '');
    } else {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', service: this.service, message, meta }));
    }
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(`[${this.service}] WARN: ${message}`, meta || '');
  }

  error(message: string, errorOrMeta?: Error | LogMeta, meta?: LogMeta): void {
    if (errorOrMeta instanceof Error) {
      console.error(`[${this.service}] ERROR: ${message}`, errorOrMeta, meta || '');
    } else {
      console.error(`[${this.service}] ERROR: ${message}`, errorOrMeta || '');
    }
  }
}
