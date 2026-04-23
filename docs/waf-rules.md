# Web Application Firewall (WAF) Rules

**Version:** 1.0  
**Date:** April 8, 2026  
**Status:** Documented

---

## Overview

This document defines the WAF rules and security configurations for the ClickFlash ecosystem across Cloudflare and application-level protections.

---

## Cloudflare WAF (Production)

### Rate Limiting Rules

| Rule ID | Description | Action | Threshold | Period |
|---------|-------------|--------|-----------|--------|
| CF-RATE-001 | API endpoint protection | Block | 100 req/min | 1 minute |
| CF-RATE-002 | Login endpoint protection | Block | 10 req/min | 1 minute |
| CF-RATE-003 | File upload protection | Block | 5 req/min | 1 minute |

### SQL Injection Protection

| Rule ID | Pattern | Action |
|---------|---------|--------|
| CF-SQL-001 | `UNION SELECT` | Block |
| CF-SQL-002 | `DROP TABLE` | Block |
| CF-SQL-003 | `' OR '1'='1` | Block |
| CF-SQL-004 | `--` (comment injection) | Block |

### XSS Protection

| Rule ID | Pattern | Action |
|---------|---------|--------|
| CF-XSS-001 | `<script>` tags | Block |
| CF-XSS-002 | `javascript:` URI | Block |
| CF-XSS-003 | `onload=` events | Block |

### Path Traversal Protection

| Rule ID | Pattern | Action |
|---------|---------|--------|
| CF-PATH-001 | `../` | Block |
| CF-PATH-002 | `..\` | Block |
| CF-PATH-003 | `/etc/passwd` | Block |

---

## Application-Level Security

### Express Middleware (Master Portal)

| Middleware | Purpose | Configuration |
|------------|---------|----------------|
| `helmet` | Security headers | CSP, HSTS, X-Frame-Options |
| `rateLimiter` | Request throttling | 100 req/min per IP |
| `csrfMiddleware` | CSRF protection | Token-based |
| `validateInput` | Zod validation | All POST/PUT endpoints |

### Security Headers

```typescript
// helmet configuration
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
}
```

---

## Touch Kiosk Security

### HMAC Request Signing

| Header | Purpose | Validation |
|--------|---------|-------------|
| `X-Kiosk-ID` | Kiosk identifier | Database lookup |
| `X-Timestamp` | Request timestamp | 5-minute window |
| `X-Signature` | HMAC-SHA256 signature | Secret validation |

### LAN Isolation

- Only accept requests from private IP ranges:
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
- Block all public IP addresses

---

## Stripe Integration (Gallery/MoneyTrash)

| Rule | Configuration |
|------|----------------|
| Webhook Signature | Verify `Stripe-Signature` header |
| Test Mode Only | Non-production uses test keys |
| Payment Intent | 3D Secure enabled |
| Retry Policy | Exponential backoff |

---

## Monitoring & Alerts

### Cloudflare Analytics

- Track blocked requests by rule
- Monitor false positive rates
- Review IP reputation lists

### Application Logging

```typescript
// Log blocked requests
logger.warn('WAF blocked', {
  rule: 'CF-SQL-001',
  ip: req.ip,
  path: req.path,
  method: req.method,
});
```

---

## Exception Handling

| Scenario | Action |
|----------|--------|
| False positive | Add to allowlist |
| Legitimate traffic burst | Adjust threshold |
| New attack vector | Create new rule |

---

## Review Schedule

- **Weekly:** Review blocked requests
- **Monthly:** Update rules based on threats
- **Quarterly:** Comprehensive security audit

---

## References

- Cloudflare Dashboard: https://dash.cloudflare.com
- Stripe Security: https://stripe.com/docs/security
- OWASP Top 10: https://owasp.org/www-project-top-ten/

---

*End of WAF Rules Documentation*