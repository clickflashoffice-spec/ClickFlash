import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

interface LoggerConfig {
  serviceName: string;
  logDir?: string;
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
}

export function createLogger(config: LoggerConfig): winston.Logger {
  const logDir = config.logDir || path.join(process.cwd(), 'logs');

  const { combine, timestamp, printf, colorize, errors, json } = winston.format;

  const customFormat = printf(({ level, message, timestamp, stack, service }) => {
    return `${timestamp} [${service}] ${level}: ${stack || message}`;
  });

  const logger = winston.createLogger({
    level: config.level || 'info',
    defaultMeta: { service: config.serviceName },
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      customFormat
    ),
    transports: [
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: `${config.serviceName}-error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '14d',
        maxSize: '20m',
        format: combine(timestamp(), json()), // Production structured logging
      }),
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: `${config.serviceName}-combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        maxSize: '20m',
        format: combine(timestamp(), json()), // Production structured logging
      }),
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: combine(
          colorize(),
          customFormat
        ),
      })
    );
  }

  return logger;
}
