---
title: "[SEC-06] Auto-created default user credentials - Gallery"
labels: ["security", "high", "authentication"]
assignees: []
---

## Finding: SEC-06

**App:** Gallery  
**Severity:** High  
**Layer:** Backend  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** Backend  

## Description

Backend auto-creates user `alaeddine@example.com` with password `DEFAULT_PASSWORD_PLACEHOLDER` if user doesn't exist on login.

**Location:** `apps/gallery/backend/server.js` lines 938-970

## Impact

- Known default credentials
- Unauthorized access if auto-creation triggers
- Compliance violation (GDPR)

## Remediation

1. Remove auto-creation code
2. Require explicit admin creation
3. Audit existing auto-created users

**Effort:** 1 day  
**Priority:** P1  
**SLA:** 24 hours

---
*Note: This is also a GDPR compliance issue*