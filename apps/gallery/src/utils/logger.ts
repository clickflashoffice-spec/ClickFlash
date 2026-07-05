import { WebLogger, initializeWebVitals, LogLevel } from '@clickflash/telemetry-web';

const SENSITIVE_PATTERNS = [
  { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_LIVE_SECRET_KEY' },
  { pattern: /sk_test_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_TEST_SECRET_KEY' },
  { pattern: /pk_live_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_LIVE_PUBLISHABLE_KEY' },
  { pattern: /pk_test_[a-zA-Z0-9]{24,}/g, name: 'STRIPE_TEST_PUBLISHABLE_KEY' },
  { pattern: /\b[0-9]{13,19}\b/g, name: 'CREDIT_CARD_NUMBER' },
  { pattern: /client_secret_[a-zA-Z0-9_-]+/g, name: 'STRIPE_CLIENT_SECRET' },
  { pattern: /\b[0-9]{3,4}\b/g, name: 'CVV_CODE' },
  { pattern: /password[^\s]*/gi, name: 'PASSWORD' },
  { pattern: /token[^\s]*/gi, name: 'TOKEN' },
  { pattern: /api[_-]?key[^\s]*/gi, name: 'API_KEY' },
  { pattern: /secret[^\s]*/gi, name: 'SECRET' },
  { pattern: /authorization[:\s]+[^\s]+/gi, name: 'AUTHORIZATION_HEADER' },
];

const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'apiKey', 'api_key', 'privateKey', 'private_key',
  'clientSecret', 'client_secret', 'stripeKey', 'stripeSecret', 'paymentMethod',
  'cardNumber', 'card_number', 'cvv', 'cvc', 'expirationDate', 'expiration_date',
  'authToken', 'accessToken', 'refreshToken', 'idToken', 'bearer', 'authorization'
];

function sanitizeString(str: string): string {
  let sanitized = str;
  SENSITIVE_PATTERNS.forEach(({ pattern, name }) => {
    sanitized = sanitized.replace(pattern, `[REDACTED:${name}]`);
  });
  return sanitized;
}

function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return sanitizeString(data);
  if (Array.isArray(data)) return data.map(item => sanitizeData(item));
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  return data;
}

const isDev = typeof import.meta !== 'undefined' && (import.meta.env?.DEV || import.meta.env?.MODE === 'development');
const apiUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL : '';

export const logger = new WebLogger({
  serviceName: 'gallery',
  endpointUrl: `${apiUrl}/api/telemetry/ingest`,
  flushIntervalMs: isDev ? 2000 : 5000,
  level: isDev ? LogLevel.DEBUG : LogLevel.INFO,
  sanitize: sanitizeData,
});

if (!isDev) {
  initializeWebVitals(logger);
}

export { LogLevel };
