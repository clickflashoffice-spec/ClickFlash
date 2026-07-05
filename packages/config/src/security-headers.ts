/**
 * Security Headers Configuration for ClickFlash
 * Centralized security header definitions for all environments.
 */

export interface SecurityHeadersConfig {
  headers: Record<string, string>;
  csp: string;
  cspReportOnly?: string;
}

/**
 * Content Security Policy directives for ClickFlash
 */
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'",   // Required for Next.js fast refresh
    'https://*.google-analytics.com',
    'https://*.googletagmanager.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components / CSS-in-JS
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'blob:',
    'data:',
    'https://*.cloudflare.com',
    'https://*.unsplash.com',
    'https://*.google-analytics.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://*.clickflash.app',
    'https://*.cloudflare.com',
    'https://*.google-analytics.com',
    'https://*.googletagmanager.com',
    'wss://*.clickflash.app',
  ],
  'media-src': [
    "'self'",
    'blob:',
  ],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
} as const;

/**
 * Build CSP string from directives
 */
function buildCSP(directives: Record<string, readonly string[]>): string {
  return Object.entries(directives)
    .map(([directive, values]) => {
      if (values.length === 0) return directive;
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Default security headers for production web environments
 */
export const productionHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=(self)',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-DNS-Prefetch-Control': 'on',
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

/**
 * Development headers (less strict for local debugging)
 */
export const developmentHeaders: Record<string, string> = {
  ...productionHeaders,
  'X-Frame-Options': 'SAMEORIGIN', // Allow iframe debugging
};

/**
 * Electron-specific headers (for main window / embedded webviews)
 */
export const electronHeaders: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'on',
};

/**
 * Cloudflare Workers headers (additional CF-specific considerations)
 */
export const cloudflareHeaders: Record<string, string> = {
  ...productionHeaders,
  'CF-IPCountry': '', // Will be set by Cloudflare
  'CF-RAY': '',       // Will be set by Cloudflare
};

/**
 * Full CSP string for production
 */
export const contentSecurityPolicy = buildCSP(CSP_DIRECTIVES);

/**
 * Report-only CSP for testing (sends violations without blocking)
 */
export const contentSecurityPolicyReportOnly = [
  buildCSP(CSP_DIRECTIVES),
  'report-uri https://clickflash.app/api/csp-report',
].join('; ');

/**
 * Get environment-specific security headers
 */
export function getSecurityHeaders(
  environment: 'production' | 'development' | 'electron' | 'cloudflare'
): Record<string, string> {
  switch (environment) {
    case 'production':
      return productionHeaders;
    case 'development':
      return developmentHeaders;
    case 'electron':
      return electronHeaders;
    case 'cloudflare':
      return cloudflareHeaders;
    default:
      return productionHeaders;
  }
}

/**
 * Apply security headers to a Headers object (for fetch/Response)
 */
export function applySecurityHeaders(
  headers: Headers,
  environment: 'production' | 'development' | 'electron' | 'cloudflare' = 'production',
  includeCSP: boolean = true
): Headers {
  const securityHeaders = getSecurityHeaders(environment);

  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) headers.set(key, value);
  });

  if (includeCSP) {
    headers.set('Content-Security-Policy', contentSecurityPolicy);
  }

  return headers;
}

/**
 * Next.js headers() format for next.config.js
 */
export function getNextJsHeaders(): Array<{ source: string; headers: Array<{ key: string; value: string }> }> {
  const headers = Object.entries(productionHeaders).map(([key, value]) => ({
    key,
    value,
  }));

  headers.push(
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'Report-To', value: '{"group":"csp-report","max_age":31536000,"endpoints":[{"url":"https://clickflash.app/api/csp-report"}]}' }
  );

  return [
    {
      source: '/(.*)',
      headers,
    },
  ];
}

/**
 * Express/Connect middleware compatible headers
 */
export function applyExpressHeaders(
  res: { setHeader: (key: string, value: string) => void },
  environment: 'production' | 'development' | 'electron' | 'cloudflare' = 'production'
): void {
  const securityHeaders = getSecurityHeaders(environment);

  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) res.setHeader(key, value);
  });

  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
}

export default {
  productionHeaders,
  developmentHeaders,
  electronHeaders,
  cloudflareHeaders,
  contentSecurityPolicy,
  contentSecurityPolicyReportOnly,
  getSecurityHeaders,
  applySecurityHeaders,
  getNextJsHeaders,
  applyExpressHeaders,
};
