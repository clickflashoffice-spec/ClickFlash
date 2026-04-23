# Finding: Hardcoded JWT Secret in Gallery Backend

**Finding ID:** F-SEC-003  
**Date:** 2026-04-08  
**App:** Customer Gallery  
**Domain:** Security  
**Severity:** Critical  

## Description

The Gallery backend has a hardcoded JWT secret in the config file, with a comment indicating it should use environment variable but defaults to a placeholder string.

**Evidence:**
- `apps/gallery/backend/src/config.ts` line 5: `export const JWT_SECRET = 'your-256-bit-secret'; // Recommended: Use env.JWT_SECRET`

## Impact

If the environment variable is not set, all JWT tokens are signed with a known default secret, allowing token forgery.

## Recommendation

Throw error if `JWT_SECRET` environment variable is not set:
```typescript
if (!process.env.JWT_SECRET) {
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
