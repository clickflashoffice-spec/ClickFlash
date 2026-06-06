/**
 * Structured logging utility for Gallery App
 *
 * Provides log levels, structured data, and console formatting.
 * Supports both development (formatted) and production (JSON) logging.
 * 
 * SECURITY CRITICAL: This logger includes automatic sanitization to prevent
 * accidental logging of sensitive payment data (Stripe keys, card numbers, etc.)
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

/** Sensitive field patterns that should be redacted from logs */
const SENSITIVE_PATTERNS = [
  { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_LIVE_SECRET_KEY' },
  { pattern: /sk_test_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_TEST_SECRET_KEY' },
  { pattern: /pk_live_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_LIVE_PUBLISHABLE_KEY' },
  { pattern: /pk_test_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_TEST_PUBLISHABLE_KEY' },
  { pattern: /\b[0-9]{13,19}\b/g, name: 'CREDIT_CARD_NUMBER' },
  { pattern: /client_secret_[a-zA-Z0-9_-]+/g, name: 'STRIPE_CLIENT_SECRET' },
  { pattern: /\b[0-9]{3,4}\b/g, name: 'CVV_CODE' }, // Simple 3-4 digit numbers (context-dependent)
  { pattern: /password[^\s]*/gi, name: 'PASSWORD' },
  { pattern: /token[^\s]*/gi, name: 'TOKEN' },
  { pattern: /api[_-]?key[^\s]*/gi, name: 'API_KEY' },
  { pattern: /secret[^\s]*/gi, name: 'SECRET' },
  { pattern: /authorization[:\s]+[^\s]+/gi, name: 'AUTHORIZATION_HEADER' },
];

/** Sensitive object keys that trigger redaction */
const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'apiKey', 'api_key', 'privateKey', 'private_key',
  'clientSecret', 'client_secret', 'stripeKey', 'stripeSecret', 'paymentMethod',
  'cardNumber', 'card_number', 'cvv', 'cvc', 'expirationDate', 'expiration_date',
  'authToken', 'accessToken', 'refreshToken', 'idToken', 'bearer', 'authorization'
];

/** Log entry structure */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
  stack?: string;
  app?: string;
  version?: string;
}

/** Logger Class */
class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;
  private appName: string;
  private version: string;

  constructor() {
    const envLevel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOG_LEVEL ? import.meta.env.VITE_LOG_LEVEL : 'INFO').toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
    this.isDevelopment = typeof import.meta !== 'undefined' && (import.meta.env?.DEV || import.meta.env?.MODE === 'development');
    this.appName = 'gallery';
    this.version = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) ? import.meta.env.VITE_APP_VERSION : '4.2.0';
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  /**
   * Sanitize sensitive data from strings
   */
  private sanitizeString(str: string): string {
    let sanitized = str;
    SENSITIVE_PATTERNS.forEach(({ pattern, name }) => {
      sanitized = sanitized.replace(pattern, `[REDACTED:${name}]`);
    });
    return sanitized;
  }

  /**
   * Deep sanitize an object to remove sensitive data
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle strings
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    // Handle objects
    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        // Check if key is sensitive
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    // Return primitives as-is
    return data;
  }

  /**
   * Sanitize error objects
   */
  private sanitizeError(error: Error): Error {
    const sanitizedMessage = this.sanitizeString(error.message);
    const sanitizedError = new Error(sanitizedMessage);
    sanitizedError.name = error.name;
    
    if (error.stack) {
      sanitizedError.stack = this.sanitizeString(error.stack);
    }
    
    // Preserve additional error properties
    Object.entries(error).forEach(([key, value]) => {
      if (key !== 'message' && key !== 'stack' && key !== 'name') {
        (sanitizedError as any)[key] = this.sanitizeData(value);
      }
    });
    
    return sanitizedError;
  }

  private formatMessage(
    level: string, 
    message: string, 
    data?: unknown, 
    error?: Error
  ): LogEntry {
    // Sanitize all inputs
    const sanitizedMessage = this.sanitizeString(message);
    const sanitizedData = this.sanitizeData(data);
    const sanitizedError = error ? this.sanitizeError(error) : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizedMessage,
      app: this.appName,
      version: this.version,
    };

    if (sanitizedData) entry.data = sanitizedData;
    if (sanitizedError) {
      entry.stack = sanitizedError.stack;
      if (!entry.data) entry.data = { error: sanitizedError.message };
    }

    return entry;
  }

  private log(
    level: LogLevel, 
    levelName: string, 
    message: string, 
    data?: unknown, 
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;
    
    const entry = this.formatMessage(levelName, message, data, error);
    
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      const prefix = `[${entry.timestamp}] ${entry.level}:`;
      
      // Use appropriate console method based on level
      switch (level) {
        case LogLevel.ERROR:
          console.error(`%c${prefix} ${entry.message}`, style, entry.data || '');
          break;
        case LogLevel.WARN:
          console.warn(`%c${prefix} ${entry.message}`, style, entry.data || '');
          break;
        case LogLevel.DEBUG:
          console.debug(`%c${prefix} ${entry.message}`, style, entry.data || '');
          break;
        default:
          console.log(`%c${prefix} ${entry.message}`, style, entry.data || '');
      }
      
      if (entry.stack) {
        console.log('%cStack:', 'color: #999; font-size: 11px;', entry.stack);
      }
    } else {
      // Production: structured JSON logging
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

  // Public logging methods
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    const err = error instanceof Error ? error : undefined;
    const extraData = err ? data : error;
    this.log(LogLevel.ERROR, 'ERROR', message, extraData, err);
  }

  /**
   * Log payment-related events with additional security context
   */
  payment(message: string, data?: unknown): void {
    // Always add payment context for filtering
    const paymentData = { ...((data as object) || {}), _context: 'payment' };
    this.info(`[Payment] ${message}`, paymentData);
  }

  /**
   * Log security-related events
   */
  security(message: string, data?: unknown): void {
    const securityData = { ...((data as object) || {}), _context: 'security' };
    this.warn(`[Security] ${message}`, securityData);
  }
}

/** Default logger instance */
export const logger = new Logger();

/** Logger singleton for importing */
export default logger;
