---
title: "[SEC-02] JWT_SECRET hardcoded in wrangler.toml - Management"
labels: ["security", "critical", "jwt"]
assignees: []
---

## Finding: SEC-02

**App:** Management Hub  
**Severity:** Critical  
**Layer:** Security Controls  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** DevOps  

## Description

JWT_SECRET is hardcoded in `apps/management/backend/wrangler.toml` line 16:

```toml
JWT_SECRET = "<REDACTED:MANAGEMENT_JWT_SECRET>"
```

## Impact

- Authentication bypass possible
- Hub operations compromised
- Multi-tenant data at risk

## Remediation

1. Remove JWT_SECRET from wrangler.toml
2. Use `wrangler secret put JWT_SECRET` to set via Cloudflare dashboard
3. Rotate secret immediately after deployment

**Effort:** 0.5 day  
**Priority:** P1  
**SLA:** 24 hours

---
*Related: SEC-01, SEC-03*