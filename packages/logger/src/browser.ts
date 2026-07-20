
export interface LogMeta {
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, errorOrMeta?: Error | LogMeta, meta?: LogMeta): void;
  child(defaultMeta: Record<string, unknown>): ILogger;
}

export class BrowserLogger implements ILogger {
  private service: string;
  private defaultMeta: Record<string, unknown>;

  constructor(serviceName: string, defaultMeta: Record<string, unknown> = {}) {
    this.service = serviceName;
    this.defaultMeta = defaultMeta;
  }

  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`%c[${this.service}] DEBUG`, 'color: #888; font-size: 11px;', message, { ...this.defaultMeta, ...(meta || {}) });
    }
  }

  info(message: string, meta?: LogMeta): void {
    const merged = { ...this.defaultMeta, ...(meta || {}) };
    if (process.env.NODE_ENV !== 'production') {
      console.info(`%c[${this.service}] INFO`, 'color: #2196F3; font-size: 11px; font-weight: bold;', message, merged);
    } else {
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', service: this.service, message, meta: merged }));
    }
  }

  warn(message: string, meta?: LogMeta): void {
    const merged = { ...this.defaultMeta, ...(meta || {}) };
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`%c[${this.service}] WARN`, 'color: #FF9800; font-size: 11px; font-weight: bold;', message, merged);
    } else {
      console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', service: this.service, message, meta: merged }));
    }
  }

  error(message: string, errorOrMeta?: Error | LogMeta, meta?: LogMeta): void {
    let merged = { ...this.defaultMeta };
    let errorObj = null;

    if (errorOrMeta instanceof Error) {
      errorObj = { message: errorOrMeta.message, stack: errorOrMeta.stack, name: errorOrMeta.name };
      merged = { ...merged, ...(meta || {}) };
    } else if (errorOrMeta) {
      merged = { ...merged, ...errorOrMeta as LogMeta };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error(`%c[${this.service}] ERROR`, 'color: #F44336; font-size: 11px; font-weight: bold;', message, errorObj, merged);
    } else {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR', service: this.service, message, error: errorObj, meta: merged }));
    }
  }

  child(defaultMeta: Record<string, unknown>): ILogger {
    return new BrowserLogger(this.service, { ...this.defaultMeta, ...defaultMeta });
  }
}

export const logger: ILogger = new BrowserLogger('clickflash-client');

export const noopLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child(_defaultMeta: Record<string, unknown>): ILogger {
    return noopLogger;
  },
};

export function createLogger(config: unknown): ILogger {
  // Try to use a safe parsed config, falling back to an empty object
  const safeConfig = (config && typeof config === 'object' ? config : {}) as { serviceName?: string };
  return new BrowserLogger(safeConfig.serviceName || 'clickflash-client');
}
