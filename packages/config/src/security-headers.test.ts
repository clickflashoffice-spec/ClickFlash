import { describe, it, expect } from 'vitest';
import {
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
} from './security-headers.js';

// ─── productionHeaders ────────────────────────────────────────────────────────

describe('productionHeaders', () => {
  it('includes X-Frame-Options: DENY', () => {
    expect(productionHeaders['X-Frame-Options']).toBe('DENY');
  });

  it('includes X-Content-Type-Options: nosniff', () => {
    expect(productionHeaders['X-Content-Type-Options']).toBe('nosniff');
  });

  it('includes HSTS with at least 1-year max-age', () => {
    const hsts = productionHeaders['Strict-Transport-Security'];
    expect(hsts).toMatch(/max-age=\d+/);
    const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? '0', 10);
    expect(maxAge).toBeGreaterThanOrEqual(31536000); // 1 year
  });

  it('includes Referrer-Policy', () => {
    expect(productionHeaders['Referrer-Policy']).toBeTruthy();
  });
});

// ─── developmentHeaders ───────────────────────────────────────────────────────

describe('developmentHeaders', () => {
  it('allows SAMEORIGIN iframes (for debugging)', () => {
    expect(developmentHeaders['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('still includes nosniff in development', () => {
    expect(developmentHeaders['X-Content-Type-Options']).toBe('nosniff');
  });
});

// ─── electronHeaders ─────────────────────────────────────────────────────────

describe('electronHeaders', () => {
  it('does not include HSTS (not needed for local app)', () => {
    expect(electronHeaders['Strict-Transport-Security']).toBeUndefined();
  });

  it('includes nosniff', () => {
    expect(electronHeaders['X-Content-Type-Options']).toBe('nosniff');
  });

  it('allows SAMEORIGIN for embedded webviews', () => {
    expect(electronHeaders['X-Frame-Options']).toBe('SAMEORIGIN');
  });
});

// ─── cloudflareHeaders ────────────────────────────────────────────────────────

describe('cloudflareHeaders', () => {
  it('extends productionHeaders', () => {
    expect(cloudflareHeaders['X-Frame-Options']).toBe('DENY');
    expect(cloudflareHeaders['X-Content-Type-Options']).toBe('nosniff');
  });

  it('includes CF-IPCountry key (value set by Cloudflare)', () => {
    expect('CF-IPCountry' in cloudflareHeaders).toBe(true);
  });
});

// ─── contentSecurityPolicy ───────────────────────────────────────────────────

describe('contentSecurityPolicy', () => {
  it('is a non-empty string', () => {
    expect(typeof contentSecurityPolicy).toBe('string');
    expect(contentSecurityPolicy.length).toBeGreaterThan(0);
  });

  it('contains default-src directive', () => {
    expect(contentSecurityPolicy).toContain("default-src 'self'");
  });

  it('contains object-src none (no plugins)', () => {
    expect(contentSecurityPolicy).toContain("object-src 'none'");
  });

  it('contains frame-ancestors none (prevents clickjacking)', () => {
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
  });

  it('contains upgrade-insecure-requests', () => {
    expect(contentSecurityPolicy).toContain('upgrade-insecure-requests');
  });

  it('is a semicolon-separated string of directives', () => {
    const directives = contentSecurityPolicy.split('; ');
    expect(directives.length).toBeGreaterThan(5);
  });
});

// ─── contentSecurityPolicyReportOnly ─────────────────────────────────────────

describe('contentSecurityPolicyReportOnly', () => {
  it('includes all CSP directives', () => {
    expect(contentSecurityPolicyReportOnly).toContain("default-src 'self'");
  });

  it('includes report-uri directive', () => {
    expect(contentSecurityPolicyReportOnly).toContain('report-uri');
    expect(contentSecurityPolicyReportOnly).toContain('clickflash.app');
  });
});

// ─── getSecurityHeaders ───────────────────────────────────────────────────────

describe('getSecurityHeaders', () => {
  it('returns productionHeaders for "production"', () => {
    expect(getSecurityHeaders('production')).toBe(productionHeaders);
  });

  it('returns developmentHeaders for "development"', () => {
    expect(getSecurityHeaders('development')).toBe(developmentHeaders);
  });

  it('returns electronHeaders for "electron"', () => {
    expect(getSecurityHeaders('electron')).toBe(electronHeaders);
  });

  it('returns cloudflareHeaders for "cloudflare"', () => {
    expect(getSecurityHeaders('cloudflare')).toBe(cloudflareHeaders);
  });
});

// ─── applySecurityHeaders ────────────────────────────────────────────────────

describe('applySecurityHeaders', () => {
  it('sets X-Frame-Options on Headers object', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, 'production');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('sets Content-Security-Policy by default', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, 'production', true);
    expect(headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('does not set CSP when includeCSP is false', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, 'production', false);
    expect(headers.get('Content-Security-Policy')).toBeNull();
  });

  it('defaults to production when environment omitted', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    expect(headers.get('X-Frame-Options')).toBe('DENY');
  });
});

// ─── getNextJsHeaders ────────────────────────────────────────────────────────

describe('getNextJsHeaders', () => {
  it('returns array with source matching all paths', () => {
    const result = getNextJsHeaders();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].source).toBe('/(.*)');
  });

  it('includes X-Frame-Options in headers array', () => {
    const result = getNextJsHeaders();
    const frameOptions = result[0].headers.find(h => h.key === 'X-Frame-Options');
    expect(frameOptions?.value).toBe('DENY');
  });

  it('includes Content-Security-Policy header', () => {
    const result = getNextJsHeaders();
    const csp = result[0].headers.find(h => h.key === 'Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp?.value).toContain("default-src 'self'");
  });

  it('includes Report-To header', () => {
    const result = getNextJsHeaders();
    const reportTo = result[0].headers.find(h => h.key === 'Report-To');
    expect(reportTo).toBeDefined();
  });
});

// ─── applyExpressHeaders ─────────────────────────────────────────────────────

describe('applyExpressHeaders', () => {
  it('calls setHeader for X-Frame-Options', () => {
    const setHeaderCalls: [string, string][] = [];
    const mockRes = {
      setHeader: (key: string, value: string) => setHeaderCalls.push([key, value]),
    };
    applyExpressHeaders(mockRes, 'production');
    expect(setHeaderCalls.some(([k]) => k === 'X-Frame-Options')).toBe(true);
  });

  it('always sets Content-Security-Policy', () => {
    const setHeaderCalls: [string, string][] = [];
    const mockRes = {
      setHeader: (key: string, value: string) => setHeaderCalls.push([key, value]),
    };
    applyExpressHeaders(mockRes, 'development');
    expect(setHeaderCalls.some(([k]) => k === 'Content-Security-Policy')).toBe(true);
  });

  it('uses production headers by default', () => {
    const setHeaderCalls: [string, string][] = [];
    const mockRes = {
      setHeader: (key: string, value: string) => setHeaderCalls.push([key, value]),
    };
    applyExpressHeaders(mockRes);
    const frameOptions = setHeaderCalls.find(([k]) => k === 'X-Frame-Options');
    expect(frameOptions?.[1]).toBe('DENY');
  });
});
