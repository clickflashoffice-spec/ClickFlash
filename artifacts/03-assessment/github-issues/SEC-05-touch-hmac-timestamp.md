---
title: "[SEC-05] HMAC timestamp validation missing - Touch Kiosk"
labels: ["security", "critical", "hmac", "replay-attack"]
assignees: []
---

## Finding: SEC-05

**App:** Touch Kiosk  
**Severity:** Critical  
**Layer:** Messaging  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** Backend  

## Description

HMAC signing for Touch-Master communication lacks timestamp validation. The `orderExport.ts` generates timestamps but the server does not validate the 5-minute replay window.

**Location:** `apps/touch/backend/routes/orderExport.ts`

## Impact

- Replay attacks possible
- Orders can be re-submitted
- Financial reconciliation issues

## Remediation

1. Add timestamp validation to HMAC verification
2. Reject requests older than 5 minutes
3. Log replay attempts

**Effort:** 1 day  
**Priority:** P1  
**SLA:** 24 hours

---
*Reference: master/backend/shared/lanSigningMiddleware.ts has correct implementation*