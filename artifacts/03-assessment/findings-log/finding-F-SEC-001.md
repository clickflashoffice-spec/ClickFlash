# Finding: Default Admin Password Fallback Insecure

**Finding ID:** F-SEC-001  
**Date:** 2026-04-08  
**App:** Master Portal  
**Domain:** Security  
**Severity:** High  

## Description

The default admin user creation falls back to a hardcoded password `'DEFAULT_PASSWORD_PLACEHOLDER'` when `DEFAULT_ADMIN_PASSWORD` environment variable is not set. This creates a security risk if the environment variable is accidentally unset during deployment.

**Evidence:**
- `apps/master/backend/shared/defaultUserConfig.ts` line 28: `password: process.env.DEFAULT_ADMIN_PASSWORD || 'DEFAULT_PASSWORD_PLACEHOLDER'`
- `apps/master/backend/shared/init-default-user.ts` line 13

## Impact

If deployment automation fails to set `DEFAULT_ADMIN_PASSWORD`, the system will have a known default credential that could be exploited.

## Recommendation

Fail-fast if `DEFAULT_ADMIN_PASSWORD` is not set in production:
```typescript
if (!process.env.DEFAULT_ADMIN_PASSWORD) {
  throw new Error('FATAL: DEFAULT_ADMIN_PASSWORD must be set');
}
```

## References

- S-02: Secrets not in code
- S-03: Secrets in env files only

## Owner

Dev

## Status

Open
