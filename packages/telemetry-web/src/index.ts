export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
  service: string;
  url: string;
}

export interface TelemetryConfig {
  serviceName: string;
  endpointUrl: string;
  flushIntervalMs?: number;
  level?: LogLevel;
  sanitize?: (data: unknown) => unknown;
}

export class WebLogger {
  private queue: LogEntry[] = [];
  private flushTimer: number | null = null;
  private readonly config: Required<Omit<TelemetryConfig, 'sanitize'>> & Pick<TelemetryConfig, 'sanitize'>;

  constructor(config: TelemetryConfig) {
    this.config = {
      flushIntervalMs: 5000,
      level: LogLevel.INFO,
      ...config,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      
      // Global error handlers
      window.addEventListener('error', (event) => {
        this.error('Unhandled Error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', {
          reason: event.reason,
        });
      });
    }

    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (typeof window !== 'undefined' && !this.flushTimer) {
      this.flushTimer = window.setInterval(() => this.flush(), this.config.flushIntervalMs);
    }
  }

  private pushLog(levelName: string, levelValue: LogLevel, message: string, data?: unknown) {
    if (levelValue < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      data: typeof this.config.sanitize === 'function' && data !== undefined ? this.config.sanitize(data) : data,
      service: this.config.serviceName,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    this.queue.push(entry);

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMsg = `[${this.config.serviceName}] ${message}`;
      if (levelValue === LogLevel.ERROR || levelValue === LogLevel.FATAL) console.error(consoleMsg, data);
      else if (levelValue === LogLevel.WARN) console.warn(consoleMsg, data);
      else if (levelValue === LogLevel.INFO) console.info(consoleMsg, data);
      else console.debug(consoleMsg, data);
    }

    if (this.queue.length >= 50) {
      this.flush();
    }
  }

  public debug(message: string, arg1?: unknown, arg2?: unknown) { this.pushLog('DEBUG', LogLevel.DEBUG, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); }
  public info(message: string, arg1?: unknown, arg2?: unknown) { this.pushLog('INFO', LogLevel.INFO, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); }
  public warn(message: string, arg1?: unknown, arg2?: unknown) { this.pushLog('WARN', LogLevel.WARN, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); }
  public error(message: string, arg1?: unknown, arg2?: unknown) { this.pushLog('ERROR', LogLevel.ERROR, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); }
  public fatal(message: string, arg1?: unknown, arg2?: unknown) { this.pushLog('FATAL', LogLevel.FATAL, message, arg2 !== undefined ? { data: arg1, extra: arg2 } : arg1); }

  public async flush() {
    if (this.queue.length === 0) return;
    
    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (typeof sessionStorage !== 'undefined') {
        const token = sessionStorage.getItem('authToken');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      // Use sendBeacon if available for beforeunload reliability, otherwise fetch
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ logs: logsToSend })], { type: 'application/json' });
        navigator.sendBeacon(this.config.endpointUrl, blob);
      } else {
        await fetch(this.config.endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ logs: logsToSend }),
          keepalive: true,
        });
      }
    } catch (err) {
      // If flush fails, push back to queue (limit size to prevent memory leaks)
      if (this.queue.length < 500) {
        this.queue = [...logsToSend, ...this.queue];
      }
    }
  }
}

export * from './vitals';
export * from './analyzer';
