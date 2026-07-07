# ClickFlash Security Policies

**Version:** 1.0  
**Date:** April 8, 2026  
**Status:** Draft  

---

## 1. Access Control Policy

### 1.1 User Authentication
- All apps require authentication for protected resources
- Master Portal: JWT + Express Sessions (7-day token expiry)
- Touch Kiosk: HMAC-SHA256 request signing
- Management Hub: RS256 JWT
- Gallery: Token-based (per-order access tokens)

### 1.2 Password Requirements
- Minimum 8 characters
- bcrypt hashing with 10 salt rounds
- No plain-text password storage

### 1.3 Session Management
- Session timeout: Configurable per app
- Automatic session invalidation on logout
- Secure, HttpOnly session cookies

---

## 2. Data Protection Policy

### 2.1 Encryption at Rest
- SQLite databases use `better-sqlite3-multiple-ciphers`
- Encryption key: 32-byte key via `DB_ENCRYPTION_KEY` env var

### 2.2 Encryption in Transit
- TLS 1.2+ recommended for production
- HTTP redirect to HTTPS in production mode

### 2.3 PII Handling
- GDPR compliant consent tracking
- User data deletion endpoint available (DELETE /api/auth/me)
- Data export endpoint available (POST /api/auth/me/export)

---

## 3. API Security Policy

### 3.1 Rate Limiting
| Endpoint Type | Limit |
|--------------|-------|
| Auth endpoints | 10 req/min |
| API endpoints | 100 req/min |
| File uploads | 5 req/min |

### 3.2 Input Validation
- All inputs validated via Zod schemas
- SQL injection prevention via parameterized queries
- XSS sanitization for user-generated content

### 3.3 CORS Configuration
- Explicit allowed origins per app
- No wildcard CORS settings in production

---

## 4. Secrets Management Policy

### 4.1 Environment Variables
- All secrets via environment variables
- `.env` files excluded from version control
- No hardcoded secrets in source code

### 4.2 Key Rotation
- JWT secrets: Rotate every 90 days
- API keys: Rotate every 60 days
- Database encryption keys: Rotate annually

### 4.3 Secrets Storage
- Development: `.env` files (local only)
- Production: Docker Secrets or HashiCorp Vault

---

## 5. Audit and Logging Policy

### 5.1 Audit Logging
- All authentication attempts logged
- Data access logged with user/timestamp
- Security events logged (rate limits, failures)

### 5.2 Log Retention
- Development: 7 days
- Production: 30 days
- Audit logs: 90 days

---

## 6. Incident Response

### 6.1 Severity Levels
| Level | Response Time |
|-------|---------------|
| SEV1 (Critical) | 15 minutes |
| SEV2 (High) | 30 minutes |
| SEV3 (Medium) | 2 hours |
| SEV4 (Low) | 24 hours |

### 6.2 Reporting
- Security incidents: security@clickflash.com
- Escalation: CTO → CEO

---

## 7. Compliance

### 7.1 GDPR Readiness
- Right to access (data export)
- Right to deletion (account deletion)
- Consent management
- Data minimization

### 7.2 Data Retention
- Photo retention: Configurable (default 7 days for unsold)
- Order data: 2 years minimum
- Audit logs: 90 days

---

## 8. Review and Updates

- Policy review: Quarterly
- Security assessment: Annual
- Penetration testing: Annual

---

*End of Security Policies*