# Finding: Default Admin Password Fallback (Cross-App)

**Finding ID:** F-SEC-002  
**Date:** 2026-04-08  
**App:** Touch Kiosk, Master Portal  
**Domain:** Security  
**Severity:** High  

## Description

Same insecure default password fallback exists in Touch Kiosk as in Master Portal. The default user config falls back to `'DEFAULT_PASSWORD_PLACEHOLDER'` when `DEFAULT_ADMIN_PASSWORD` is not set.

**Evidence:**
- `apps/touch/backend/shared/defaultUserConfig.ts` line 28
- `apps/touch/backend/server.ts` line 179 confirms warning is logged

## Impact

If Touch Kiosk deployment fails to set `DEFAULT_ADMIN_PASSWORD`, known credentials will be present.

## Recommendation

Same as F-SEC-001 - fail-fast if not set in production.

## References

- F-SEC-001 (Master Portal - same issue)

## Owner

Dev

## Status

Open

---

## Cross-App Scope

| App | File | Status |
|-----|------|--------|
| Master | `backend/shared/defaultUserConfig.ts` | Same issue |
| Touch | `backend/shared/defaultUserConfig.ts` | Same issue |
| MoneyTrash | TBD | Unknown |
| Management | TBD | Unknown |
| Gallery | TBD | Unknown |
| Website | N/A | No backend |
| CPP | TBD | Unknown |
