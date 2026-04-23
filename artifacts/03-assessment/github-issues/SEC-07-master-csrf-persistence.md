---
title: "[SEC-07] CSRF tokens not persisted - Master Portal"
labels: ["security", "high", "csrf"]
assignees: []
---

## Finding: SEC-07

**App:** Master Portal  
**Severity:** High  
**Layer:** Security Controls  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** Backend  

## Description

CSRF tokens stored in-memory Map are lost on server restart.

**Location:** `apps/master/backend/shared/csrf.ts`

## Impact

- CSRF protection ineffective after restart
- State-changing operations vulnerable
- Authenticated users at risk

## Remediation

1. Persist CSRF tokens to database
2. Add token expiration tracking
3. Implement token rotation

**Effort:** 1 day  
**Priority:** P2  
**SLA:** 1 week

---
*Related: GDPR compliance*