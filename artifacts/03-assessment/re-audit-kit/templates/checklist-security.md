# Security Audit Checklist

## Authentication & Authorization

- [ ] JWT secrets not hardcoded in source
- [ ] JWT secrets not in wrangler.toml / .env files
- [ ] No fallback secrets like "CHANGE_ME_IN_PRODUCTION"
- [ ] bcrypt with minimum 12 rounds used
- [ ] HMAC signing uses timestamp validation (5-min window)
- [ ] Session tokens expire appropriately
- [ ] Passwords validated for complexity
- [ ] RBAC properly enforced

## Secrets Management

- [ ] No secrets in git history (TruffleHog clean)
- [ ] Secrets stored in environment variables
- [ ] Secrets rotated within 90 days
- [ ] No API keys in client-side code
- [ ] No credentials in configuration files

## Data Protection

- [ ] PII encrypted at rest (SQLite cipher, D1 encryption)
- [ ] TLS 1.2+ for all external connections
- [ ] Sensitive data not logged
- [ ] Credit card data handled by Stripe only
- [ ] GDPR: Consent obtained before processing
- [ ] GDPR: Right to erasure implemented
- [ ] GDPR: Data portability available

## Input Validation

- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF tokens for state-changing operations
- [ ] File upload validation (type, size)
- [ ] Rate limiting on public endpoints

## Infrastructure

- [ ] No debug mode in production
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] CORS properly configured
- [ ] No sensitive data in URLs
- [ ] Error messages don't expose internals

## Dependencies

- [ ] No known vulnerabilities (npm audit)
- [ ] Dependencies up to date
- [ ] No deprecated packages
- [ ] License compliance verified

---

## Per-App Checklist

### Master Portal
- [ ] CSRF tokens persisted to database
- [ ] SERVICE_SECRET persistent across restarts
- [ ] HMAC secrets not in plaintext
- [ ] Cloud tunnel has failover

### Touch Kiosk
- [ ] HMAC timestamp validation implemented
- [ ] JWT secret not on disk in plaintext
- [ ] Rate limiting on endpoints

### MoneyTrash
- [ ] Webhook signatures verified
- [ ] Config files encrypted
- [ ] Request signing implemented

### Gallery
- [ ] All JWT fallback secrets removed
- [ ] Auto-created user disabled
- [ ] JWT secret via wrangler secret

### Management Hub
- [ ] JWT fallback secret removed (server.ts:988)
- [ ] JWT secret via wrangler secret
- [ ] Rate limiting on public order lookup

### Website
- [ ] No server-side processing (static)
- [ ] Environment variables properly set
- [ ] External API calls use HTTPS

### Master C++
- [ ] bcrypt used instead of SHA-256 for passwords
- [ ] RealtimeController.h file exists or removed from CMakeLists
- [ ] Database path consistent

---

*Checklist version: 1.0*