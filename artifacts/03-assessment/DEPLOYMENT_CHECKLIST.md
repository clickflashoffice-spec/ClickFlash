# Deployment Checklist - Security Fixes

## Pre-Deployment

### Required Secrets (must be set before deploying)

#### Gallery Backend
```bash
cd apps/gallery/backend
wrangler secret put JWT_SECRET
# Enter production JWT secret value
```

#### Management Hub
```bash
cd apps/management/backend
wrangler secret put JWT_SECRET
# Enter production JWT secret value
```

#### MoneyTrash Cloudflare
```bash
cd apps/moneytrash/cloudflare
wrangler secret put WEBHOOK_SECRET
# Enter Stripe webhook secret
```

### Database Migration (Master Portal)

Run migration 061 on production database:
```bash
cd apps/master
# Migration will auto-apply on server start
```

---

## Modified Files by App

### Master Portal
| File | Change |
|------|--------|
| `backend/shared/csrf.ts` | CSRF tokens now persisted to DB |
| `backend/shared/migrations/061_add_csrf_tokens_table.sql` | New migration |
| `backend/server.ts` | SERVICE_SECRET persistence, CSRF init |

### Gallery
| File | Change |
|------|--------|
| `backend/wrangler.toml` | JWT_SECRET removed |
| `backend/server.js` | JWT fail-fast, auto-user removed |
| `backend/routes/syncRoutes.js` | JWT fail-fast |
| `backend/routes/moneyTrashRoutes.js` | JWT fail-fast |

### Management Hub
| File | Change |
|------|--------|
| `backend/wrangler.toml` | JWT_SECRET removed |
| `backend/src/server.ts` | JWT fail-fast |
| `backend/src/config.ts` | Already secure |

### MoneyTrash
| File | Change |
|------|--------|
| `cloudflare/src/handlers/webhook.ts` | HMAC-SHA256 verification |
| `src-tauri/src/commands/config.rs` | AES-256-GCM encryption |
| `src-tauri/Cargo.toml` | Encryption dependencies |

---

## Deployment Order

1. **Master Portal** (Sequential)
   - Deploy backend
   - Migration auto-runs
   - Verify CSRF tokens persist across restart

2. **Gallery** (Sequential)
   - Deploy to Cloudflare Workers
   - Verify JWT_SECRET is set
   - Test authentication

3. **Management Hub** (Sequential)
   - Deploy to Cloudflare Workers
   - Verify JWT_SECRET is set
   - Test authentication

4. **MoneyTrash** (Sequential)
   - Deploy Cloudflare Worker
   - Deploy Tauri update (optional, for config encryption)
   - Verify webhook signature

---

## Post-Deployment Verification

### Master Portal
```bash
# Test CSRF persistence
curl -X POST http://localhost:8090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Restart server
# Login again - CSRF token should be valid
```

### Gallery
```bash
# Test JWT validation
curl https://gallery.clickflash.com/api/health
# Should work with valid JWT

# Test with missing JWT_SECRET (should 500)
```

### Management Hub
```bash
# Test JWT validation
curl https://management-hub.clickflash.com/api/health
# Should require JWT_SECRET
```

### MoneyTrash
```bash
# Test webhook with invalid signature (should 401)
curl -X POST https://moneytrash-api.../api/webhooks/payment \
  -H "X-Webhook-Signature: invalid" \
  -d '{"test":true}'
# Should return 401
```

---

## Rollback Procedure

### Master Portal
```bash
git revert HEAD -- apps/master/backend/shared/csrf.ts
git revert HEAD -- apps/master/backend/server.ts
npm run build && npm run package
```

### Gallery
```bash
git revert HEAD -- apps/gallery/backend/server.js
wrangler deploy
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| DevOps Lead | | | |
| Security Lead | | | |
| QA | | | |

---

*Document Version: 1.0*  
*Last Updated: 2026-04-09*
