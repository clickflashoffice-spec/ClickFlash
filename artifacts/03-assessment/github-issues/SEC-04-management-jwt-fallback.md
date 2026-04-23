---
title: "[SEC-04] JWT fallback to 'fallback_secret' - Management server.ts"
labels: ["security", "critical", "jwt"]
assignees: []
---

## Finding: SEC-04

**App:** Management Hub  
**Severity:** Critical  
**Layer:** Security Controls  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** Backend  

## Description

JWT fallback secret in `apps/management/backend/src/server.ts` line 988:

```typescript
const secretKey = env.JWT_SECRET || "fallback_secret";
```

## Impact

- JWT tokens can be forged
- Authentication bypass
- Multi-tenant data at risk

## Remediation

1. Remove fallback secret
2. Fail-fast if JWT_SECRET not set (like config.ts does)
3. Add startup validation

**Effort:** 0.5 day  
**Priority:** P1  
**SLA:** 24 hours

---
*Related: SEC-02*