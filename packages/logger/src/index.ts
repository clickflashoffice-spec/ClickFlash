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
 *
 *   // Create a child logger with default metadata
 *   const reqLogger = logger.child({ requestId: 'abc123' });
 *   reqLogger.info('Processing order'); // includes requestId
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import os from 'os';

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
  /** Max number of days to retain log files. Defaults to '14d' */
  maxFiles?: string;
  /** Max size per log file. Defaults to '20m' */
  maxSize?: string;
}

export interface LogMeta {
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, errorOrMeta?: unknown, meta?: unknown): void;
  /** Create a child logger that merges additional default metadata into every log entry */
  child(defaultMeta: Record<string, unknown>): ILogger;
}

// =============================================================================
// REDACT FORMAT MIDDLEWARE
// =============================================================================

/** Fields whose values will be replaced with '[REDACTED]' */
const SENSITIVE_FIELDS = new Set(
  process.env.LOGGER_SENSITIVE_FIELDS
    ? process.env.LOGGER_SENSITIVE_FIELDS.split(',')
    : [
        'password',
        'token',
        'secret',
        'apikey',
        'authorization',
        'creditcard',
        'ssn',
        'cookie',
      ]
);

/**
 * Recursively redact sensitive fields from an object.
 * Handles nested objects and arrays. Returns a new object — never mutates the input.
 */
export function redactSensitiveFields(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'object' && obj !== null) {
    if (seen.has(obj)) return '[CIRCULAR]';
    seen.add(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveFields(item, seen));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactSensitiveFields(value, seen);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return obj;
}

/**
 * Winston format that automatically redacts sensitive fields from log metadata.
 *
 * Redacted fields: password, token, secret, apiKey, authorization, creditCard, ssn, cookie.
 * Matching is case-insensitive. Works recursively on nested objects and arrays.
 */
export const redactFormat = winston.format((info: winston.Logform.TransformableInfo) => {
  // Walk every top-level key in the info object (excluding Winston internals)
  const winstonInternals = new Set(['level', 'message', 'splat', Symbol.for('level'), Symbol.for('splat')]);

  for (const key of Object.keys(info)) {
    if (winstonInternals.has(key)) continue;

    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      info[key] = '[REDACTED]';
    } else if (typeof info[key] === 'object' && info[key] !== null) {
      info[key] = redactSensitiveFields(info[key]) as string;
    }
  }

  return info;
});

// =============================================================================
// LOGGER FACTORY
// =============================================================================

export function createLogger(config: LoggerConfig): ILogger {
  let logDir = config.logDir || path.join(process.cwd(), 'logs');
  const level = config.level || 'info';
  const maxFiles = config.maxFiles || '14d';
  const maxSize = config.maxSize || '20m';

  const { combine, timestamp, printf, colorize, errors, json } = winston.format;

  const customFormat = printf(({ level: lvl, message, timestamp: ts, stack, service }: winston.Logform.TransformableInfo) => {
    return `${ts} [${service}] ${lvl}: ${stack || message}`;
  });

  const transports: winston.transport[] = [];

  // File transports (enabled by default)
  if (config.enableFile !== false) {
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (err) {
      // Fallback to os.tmpdir if EPERM or access denied (e.g. running from C:\Windows\System32 inside IDE/MCP)
      try {
        logDir = path.join(os.tmpdir(), 'clickflash-logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      } catch (fallbackErr) {
        // If even tmpdir fails, disable file transport safely
        config.enableFile = false;
      }
    }

    if (config.enableFile !== false) {
      transports.push(
        new (winston.transports as any).DailyRotateFile({
          dirname: logDir,
          filename: `${config.serviceName}-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles,
          maxSize,
          format: combine(timestamp(), redactFormat(), json()),
        } as any),
        new (winston.transports as any).DailyRotateFile({
          dirname: logDir,
          filename: `${config.serviceName}-combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxFiles,
          maxSize,
          format: combine(timestamp(), redactFormat(), json()),
        } as any),
      );
    }
  }

  const winstonLogger = winston.createLogger({
    level,
    defaultMeta: { service: config.serviceName },
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      redactFormat(),
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
        stderrLevels: ['error', 'warn', 'info', 'debug'],
      } as any),
    );
  }

  // Wrap in our standard interface with child() support
  return createLoggerInterface(winstonLogger);
}

// =============================================================================
// INTERNAL: BUILD ILogger WRAPPER
// =============================================================================

/**
 * Wraps a winston.Logger (or child) in our ILogger interface.
 * Supports creating child loggers that merge additional default metadata.
 */
function createLoggerInterface(winstonLogger: winston.Logger): ILogger {
  return {
    debug(message: string, meta?: unknown): void {
      winstonLogger.debug(message, meta as Record<string, unknown>);
    },
    info(message: string, meta?: unknown): void {
      winstonLogger.info(message, meta as Record<string, unknown>);
    },
    warn(message: string, meta?: unknown): void {
      winstonLogger.warn(message, meta as Record<string, unknown>);
    },
    error(message: string, errorOrMeta?: unknown, meta?: unknown): void {
      if (errorOrMeta instanceof Error) {
        winstonLogger.error(message, {
          error: errorOrMeta.message,
          stack: errorOrMeta.stack,
          ...(meta as Record<string, unknown>),
        });
      } else {
        winstonLogger.error(message, errorOrMeta as Record<string, unknown>);
      }
    },
    child(defaultMeta: Record<string, unknown>): ILogger {
      const childWinston = winstonLogger.child(defaultMeta);
      return createLoggerInterface(childWinston);
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
  child(_defaultMeta: Record<string, unknown>): ILogger {
    return noopLogger;
  },
};

export { BrowserLogger } from './browser.js';

