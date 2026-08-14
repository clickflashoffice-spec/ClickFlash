import { logger as coreLogger } from '@clickflash/logger';

export const logger = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.info(String(...args));
    }
  },
  warn: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      coreLogger.warn(message, meta);
    }
  },
  error: (message: string, meta?: any) => {
    coreLogger.error(message, meta);
  },
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(String(...args));
    }
  }
};
