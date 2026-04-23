# Finding: Fallback JWT Secrets in Management Backend

**Finding ID:** F-SEC-004  
**Date:** 2026-04-08  
**App:** Management Hub  
**Domain:** Security  
**Severity:** High  

## Description

The Management Hub backend uses fallback JWT secrets when environment variables are not set, including a placeholder string that is explicitly marked for production change.

**Evidence:**
- `apps/management/backend/src/routes/syncRoutes.ts` line 13: `const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';`
- `apps/management/backend/src/config.ts` line 4: `JWT_SECRET: env.JWT_SECRET || "CHANGE_ME_IN_PRODUCTION_MANAGEMENT"`
- `apps/management/backend/src/server.ts` line 930: `const secretKey = env.JWT_SECRET || "fallback_secret";`
- `apps/management/backend/src/server.ts` line 980: `const secretKey = env.JWT_SECRET || "fallback_secret";`

## Impact

If `JWT_SECRET` is not properly set during deployment, the system uses known placeholder values, allowing JWT token forgery.

## Recommendation

Fail-fast if `JWT_SECRET` is not set:
```typescript
if (!env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

## References

- S-02: Secrets not in code
- S-03: Secrets in env files only

## Owner

Dev

## Status

Open
