---
title: "[SEC-01] JWT_SECRET hardcoded in wrangler.toml - Gallery"
labels: ["security", "critical", "jwt"]
assignees: []
---

## Finding: SEC-01

**App:** Gallery  
**Severity:** Critical  
**Layer:** Security Controls  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** DevOps  

## Description

JWT_SECRET is hardcoded in `apps/gallery/backend/wrangler.toml` line 23:

```toml
JWT_SECRET = "<REDACTED:GALLERY_JWT_SECRET>"
```

This secret is checked into source control and visible in Git history.

## Impact

- Authentication bypass possible if repository is compromised
- Production JWT tokens can be forged
- Customer data exposure risk

## Remediation

1. Remove JWT_SECRET from wrangler.toml
2. Use `wrangler secret put JWT_SECRET` to set via Cloudflare dashboard
3. Verify no other hardcoded secrets exist

**Effort:** 0.5 day  
**Priority:** P1  
**SLA:** 24 hours

---
*Related: SEC-02, SEC-03, SEC-04*