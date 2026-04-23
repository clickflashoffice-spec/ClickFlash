---
title: "[SEC-08] SERVICE_SECRET not persistent - Master Portal"
labels: ["security", "high", "secrets"]
assignees: []
---

## Finding: SEC-08

**App:** Master Portal  
**Severity:** High  
**Layer:** Security Controls  
**Status:** Open  
**Found Date:** 2026-04-08  
**Owner:** Backend  

## Description

SERVICE_SECRET regenerated on every restart, invalidating existing sessions.

**Location:** `apps/master/backend/server.ts` lines 124-131

## Impact

- Service-to-service auth broken after restart
- Intermittent failures
- Operational issues

## Remediation

1. Store SERVICE_SECRET in database or file
2. Load on startup, generate only if missing
3. Add rotation mechanism

**Effort:** 0.5 day  
**Priority:** P2  
**SLA:** 1 week

---
*Related: SEC-07*