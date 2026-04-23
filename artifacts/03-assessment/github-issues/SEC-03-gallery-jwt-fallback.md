---
title: "[SEC-03] JWT fallback to 'CHANGE_ME_IN_PRODUCTION' - Gallery syncRoutes"
labels: ["security", "critical", "jwt"]
assignees: []
---

## Finding: SEC-03

**App:** Gallery  
**Severity:** Critical  
**Layer:** Security Controls  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** Backend  

## Description

JWT fallback secret in `apps/gallery/backend/routes/syncRoutes.js` line 36:

```javascript
deskData = jwt.verify(token, process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION');
```

If environment variable is not set, uses an easily guessable fallback.

## Impact

- JWT tokens can be forged with known secret
- Sync operations compromised
- Data integrity risk

## Remediation

1. Remove fallback secret
2. Fail-fast if JWT_SECRET not set
3. Add startup validation

**Effort:** 0.5 day  
**Priority:** P1  
**SLA:** 24 hours

---
*Related: SEC-01, SEC-02, SEC-04*