# Security Key Rotation Policy

**Version:** 1.0  
**Date:** 2026-04-08  
**Status:** Implemented  

---

## 1. Overview

This document defines the key rotation policy for all cryptographic keys and secrets used in the ClickFlash ecosystem.

---

## 2. Key Inventory

| Key Name | Type | Rotation Period | Storage | Owner |
|----------|------|-----------------|---------|-------|
| JWT_SECRET | Symmetric (HS256) | 90 days | Environment Variable | DevOps |
| SESSION_SECRET | Symmetric | 90 days | Environment Variable | DevOps |
| STRIPE_SECRET_KEY | API Key | Per Stripe policy | Environment Variable | DevOps |
| DATABASE_ENCRYPTION_KEY | Symmetric | 180 days | HSM/KMS | DevOps |
| BACKUP_ENCRYPTION_KEY | Symmetric | 90 days | KMS | DevOps |
| HMAC_SIGNING_KEY | Symmetric | 180 days | Environment Variable | DevOps |

---

## 3. Rotation Schedule

### 3.1 Automatic Rotation (Recommended)

Keys should be rotated automatically using:
- **Cloudflare Workers:** Environment variables with secrets manager
- **Cloudflare D1:** Database-level encryption
- **Environment Variables:** CI/CD pipeline integration

### 3.2 Manual Rotation Procedure

For keys requiring manual rotation:

1. Generate new key (minimum 256-bit for symmetric keys)
2. Update environment variable in staging
3. Test application in staging
4. Deploy to production
5. Verify old key invalidated
6. Archive old key (retain for 30 days for rollback)

### 3.3 Emergency Rotation

If a key is compromised:
1. Immediately rotate the key
2. Invalidate all existing sessions
3. Notify affected users
4. Document incident
5. Review access logs

---

## 4. Rotation Commands

### JWT_SECRET
```bash
# Generate new secret
openssl rand -base64 32

# Update in CI/CD pipeline
gh secret set JWT_SECRET --repo owner/repo
```

### HMAC Signing Key
```bash
# Generate new key
openssl rand -hex 32

# Update in pairing configuration
```

---

## 5. Monitoring

| Metric | Alert |
|--------|-------|
| Key age > 80% of rotation period | Warning |
| Key age > 100% of rotation period | Critical |
| Key rotation failure | Critical |

---

## 6. Compliance

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| GDPR Art. 32 | Encryption key management | This policy |
| PCI-DSS | Key rotation | Annual minimum |
| SOC 2 | Key management | Quarterly rotation |

---

**Last Reviewed:** 2026-04-08  
**Next Review:** 2026-07-08
