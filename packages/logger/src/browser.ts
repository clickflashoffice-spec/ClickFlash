export interface LogMeta {
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, errorOrMeta?: Error | LogMeta, meta?: LogMeta): void;
}

export class BrowserLogger implements ILogger {
  private service: string;

  constructor(serviceName: string) {
    this.service = serviceName;
  }

  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`%c[${this.service}] DEBUG`, 'color: #888; font-size: 11px;', message, meta || '');
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`%c[${this.service}] INFO`, 'color: #2196F3; font-size: 11px; font-weight: bold;', message, meta || '');
    } else {
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', service: this.service, message, meta }));
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

export const logger: ILogger = new BrowserLogger('clickflash-client');

export const noopLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

export function createLogger(config: any): ILogger {
  return new BrowserLogger(config.serviceName || 'clickflash-client');
}
