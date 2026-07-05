import { NextRequest, NextResponse } from 'next/server';

// Inline security headers (avoiding module resolution issues)
const productionHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const contentSecurityPolicyReportOnly = contentSecurityPolicy + '; report-uri /api/csp-report';

/**
 * Security middleware for ClickFlash Next.js website
 * Applies CSP and security headers to all incoming requests
 */

interface SecurityMiddlewareOptions {
  /** Use report-only CSP mode (for testing) */
  reportOnly?: boolean;
  /** Additional CSP directives to merge */
  cspOverrides?: Record<string, string[]>;
  /** Skip security headers for specific paths */
  skipPaths?: string[];
}

const DEFAULT_SKIP_PATHS = [
  '/_next/static/', // Next.js static assets
  '/api/health',      // Health check endpoint
];

/**
 * Build CSP header value with optional overrides
 */
function buildCSP(
  basePolicy: string,
  overrides?: Record<string, string[]>
): string {
  if (!overrides) return basePolicy;

  const directives = basePolicy.split(';').reduce((acc, directive) => {
    const [key, ...values] = directive.trim().split(' ');
    acc[key] = values.join(' ');
    return acc;
  }, {} as Record<string, string>);

  Object.entries(overrides).forEach(([key, values]) => {
    directives[key] = values.join(' ');
  });

  return Object.entries(directives)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
}

/**
 * Check if request path should skip security headers
 */
function shouldSkipPath(pathname: string, skipPaths: string[]): boolean {
  return skipPaths.some((skip) => pathname.startsWith(skip));
}

/**
 * Generate nonce for inline scripts (when strict CSP is needed)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Next.js middleware handler for security headers
 */
export function createSecurityMiddleware(options: SecurityMiddlewareOptions = {}) {
  const { reportOnly = false, cspOverrides, skipPaths = DEFAULT_SKIP_PATHS } = options;

  return function securityMiddleware(request: NextRequest): NextResponse {
    const pathname = request.nextUrl.pathname;

    // Skip security headers for exempt paths
    if (shouldSkipPath(pathname, skipPaths)) {
      return NextResponse.next();
    }

    const response = NextResponse.next();

    // Apply security headers
    Object.entries(productionHeaders).forEach(([key, value]) => {
      if (value) response.headers.set(key, value);
    });

    // Apply CSP
    const csp = buildCSP(
      reportOnly ? contentSecurityPolicyReportOnly : contentSecurityPolicy,
      cspOverrides
    );

    const cspHeader = reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    response.headers.set(cspHeader, csp);

    // Additional Next.js-specific headers
    response.headers.set('X-Nextjs-Page', pathname);

    // Prevent caching of sensitive pages
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }

    return response;
  };
}

/**
 * Default security middleware instance
 */
export default createSecurityMiddleware();

/**
 * Standalone middleware function for direct export
 */
export function middleware(request: NextRequest): NextResponse {
  return createSecurityMiddleware()(request);
}

/**
 * Middleware config matcher for Next.js
 * Apply to all routes except static files and API routes
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};

/**
 * Higher-order middleware for composing with other middleware
 */
export function withSecurity(
  nextMiddleware?: (request: NextRequest) => NextResponse | Promise<NextResponse>,
  options?: SecurityMiddlewareOptions
) {
  const security = createSecurityMiddleware(options);

  return async function composedMiddleware(
    request: NextRequest
  ): Promise<NextResponse> {
    const securityResponse = security(request);

    // If security middleware returns a modified response, use it
    // Otherwise, continue to next middleware
    if (nextMiddleware) {
      const nextResponse = await nextMiddleware(request);

      // Merge security headers into next middleware response
      securityResponse.headers.forEach((value, key) => {
        nextResponse.headers.set(key, value);
      });

      return nextResponse;
    }

    return securityResponse;
  };
}

/**
 * API route wrapper for applying security headers to API responses
 */
export function withApiSecurity(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async function securedHandler(req: NextRequest): Promise<NextResponse> {
    const response = await handler(req);

    // Apply security headers to API responses
    Object.entries(productionHeaders).forEach(([key, value]) => {
      if (value) response.headers.set(key, value);
    });

    return response;
  };
}
