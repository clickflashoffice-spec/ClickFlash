# Secret Rotation Checklist — Ready for Execution

**Total .env files:** 32  
**Secret exposures found:** 32  
**Services affected:** Internal JWT, Stripe, Generic API, Cloudflare, Database, Resend

---

## Pre-Rotation (Do This First)

- [ ] Notify all developers: NO COMMITS until rotation complete
- [ ] Coordinate force-push to all remotes (GitHub, etc.)
- [ ] Backup current `.env` values from vault or secure offline store
- [ ] Verify Stripe/Resend/Cloudflare dashboard access

## Service-by-Service Rotation

### Internal JWT

**Affected files:** 20

**Dashboard:** N/A — generate cryptographically secure random string

**Steps:**
1. Generate new 32+ char secret (openssl rand -hex 32). 2. Update all .env and wrangler.toml. 3. Use wrangler secret put for Workers. 4. All active sessions will be invalidated — coordinate downtime.

**Files to update after rotation:**

- `.env` (line 61, pattern `JWT_SECRET`)
- `.env.example` (line 28, pattern `JWT_SECRET`)
- `apps/gallery/.env.example` (line 59, pattern `JWT_SECRET`)
- `apps/gallery/backend/.env` (line 3, pattern `JWT_SECRET`)
- `apps/gallery/backend/.env.example` (line 6, pattern `JWT_SECRET`)
- `apps/management/backend/.env` (line 3, pattern `JWT_SECRET`)
- `apps/management/backend/.env.example` (line 6, pattern `JWT_SECRET`)
- `apps/master/.env` (line 7, pattern `JWT_SECRET`)
- `apps/master/.env.example` (line 19, pattern `JWT_SECRET`)
- `apps/master/backend/.env` (line 9, pattern `JWT_SECRET`)
- `apps/master/backend/.env.example` (line 6, pattern `JWT_SECRET`)
- `apps/master/backend/setup/config-template.env` (line 97, pattern `JWT_SECRET`)
- `apps/master/ClickFlash-Master-test-hotel-2/.env` (line 56, pattern `JWT_SECRET`)
- `apps/master/configs/club.env` (line 11, pattern `JWT_SECRET`)
- `apps/master/configs/concorde.env` (line 11, pattern `JWT_SECRET`)
- `apps/master/configs/occidental.env` (line 11, pattern `JWT_SECRET`)
- `apps/touch/.env` (line 56, pattern `JWT_SECRET`)
- `apps/touch/.env.example` (line 10, pattern `JWT_SECRET`)
- `apps/touch/backend/.env` (line 3, pattern `JWT_SECRET`)
- `apps/touch/backend/.env.example` (line 6, pattern `JWT_SECRET`)

### Stripe

**Affected files:** 1

**Dashboard:** https://dashboard.stripe.com/test/apikeys

**Steps:**
1. Go to Dashboard → Developers → API keys (test mode). 2. Roll test key. 3. Update test environments.

**Files to update after rotation:**

- `apps/management/backend/.env` (line 6, pattern `STRIPE_TEST_KEY`)

### Generic API

**Affected files:** 6

**Dashboard:** Varies by provider

**Steps:**
Identify provider from key name, rotate in respective dashboard, update .env and wrangler secrets.

**Files to update after rotation:**

- `apps/management/backend/.env` (line 11, pattern `GENERIC_API_KEY`)
- `apps/management/backend/.env.example` (line 10, pattern `GENERIC_API_KEY`)
- `apps/master/.env` (line 62, pattern `GENERIC_API_KEY`)
- `apps/master/ClickFlash-Master-test-hotel-2/.env` (line 30, pattern `GENERIC_API_KEY`)
- `apps/master/ClickFlash-Master-test-hotel-2/.env` (line 43, pattern `GENERIC_API_KEY`)
- `apps/master/ClickFlash-Master-test-hotel-2/.env` (line 47, pattern `GENERIC_API_KEY`)
- `apps/moneytrash/.env` (line 24, pattern `GENERIC_API_KEY`)
- `apps/website/.env` (line 31, pattern `GENERIC_API_KEY`)

### Cloudflare

**Affected files:** 1

**Dashboard:** https://dash.cloudflare.com/profile/api-tokens

**Steps:**
1. Go to Cloudflare → My Profile → API Tokens. 2. Roll token. 3. Update wrangler.toml / CI secrets.

**Files to update after rotation:**

- `apps/master/ClickFlash-Master-test-hotel-2/.env` (line 11, pattern `CLOUDFLARE_API_TOKEN`)

### Database

**Affected files:** 1

**Dashboard:** Varies by host (Neon/Supabase/Railway)

**Steps:**
1. Rotate DB password in hosting dashboard. 2. Update connection strings. 3. Restart services.

**Files to update after rotation:**

- `apps/moneytrash/.env.example` (line 15, pattern `DATABASE_URL_WITH_PASSWORD`)

### Resend

**Affected files:** 1

**Dashboard:** https://resend.com/api-keys

**Steps:**
1. Go to Resend → API Keys. 2. Revoke old key. 3. Create new key. 4. Update apps/management/.env and Worker secrets.

**Files to update after rotation:**

- `apps/website/.env` (line 31, pattern `RESEND_API_KEY`)

---

## Git History Purge Commands

### Option A — Nuclear (recommended for P0)

```bash
# Install git-filter-repo if not already installed
pip install git-filter-repo

# Run from repo root
git filter-repo --replace-text <<EOF
.env==***REMOVED***
.env.example==***REMOVED***
apps\gallery\.env==***REMOVED***
apps\gallery\.env.example==***REMOVED***
apps\gallery\backend\.env==***REMOVED***
apps\gallery\backend\.env.example==***REMOVED***
apps\management\.env==***REMOVED***
apps\management\.env.example==***REMOVED***
apps\management\backend\.env==***REMOVED***
apps\management\backend\.env.example==***REMOVED***
apps\master\.env==***REMOVED***
apps\master\.env.example==***REMOVED***
apps\master\backend\.env==***REMOVED***
apps\master\backend\.env.example==***REMOVED***
apps\master\backend\setup\config-template.env==***REMOVED***
apps\master\backend\setup\profiles\concorde.env==***REMOVED***
apps\master\backend\setup\profiles\marhaba-club.env==***REMOVED***
apps\master\backend\setup\profiles\marhaba-occidental.env==***REMOVED***
apps\master\ClickFlash-Master-test-hotel-2\.env==***REMOVED***
apps\master\configs\club.env==***REMOVED***
apps\master\configs\concorde.env==***REMOVED***
apps\master\configs\occidental.env==***REMOVED***
apps\moneytrash\.env==***REMOVED***
apps\moneytrash\.env.example==***REMOVED***
apps\touch\.env==***REMOVED***
apps\touch\.env.example==***REMOVED***
apps\touch\backend\.env==***REMOVED***
apps\touch\backend\.env.example==***REMOVED***
apps\website\.env==***REMOVED***
apps\website\.env.example==***REMOVED***
claude-code\.env.example==***REMOVED***
claude-code\web\.env.example==***REMOVED***
EOF

# Force push (coordinate with team)
git push origin --force --all
git push origin --force --tags
```

### Option B — Surgical (if rewrite impossible)

```bash
# Delete files in current commit only
git rm --cached .env
git rm --cached .env.example
git rm --cached apps\gallery\.env
git rm --cached apps\gallery\.env.example
git rm --cached apps\gallery\backend\.env
git rm --cached apps\gallery\backend\.env.example
git rm --cached apps\management\.env
git rm --cached apps\management\.env.example
git rm --cached apps\management\backend\.env
git rm --cached apps\management\backend\.env.example
git rm --cached apps\master\.env
git rm --cached apps\master\.env.example
git rm --cached apps\master\backend\.env
git rm --cached apps\master\backend\.env.example
git rm --cached apps\master\backend\setup\config-template.env
git rm --cached apps\master\backend\setup\profiles\concorde.env
git rm --cached apps\master\backend\setup\profiles\marhaba-club.env
git rm --cached apps\master\backend\setup\profiles\marhaba-occidental.env
git rm --cached apps\master\ClickFlash-Master-test-hotel-2\.env
git rm --cached apps\master\configs\club.env
git rm --cached apps\master\configs\concorde.env
git rm --cached apps\master\configs\occidental.env
git rm --cached apps\moneytrash\.env
git rm --cached apps\moneytrash\.env.example
git rm --cached apps\touch\.env
git rm --cached apps\touch\.env.example
git rm --cached apps\touch\backend\.env
git rm --cached apps\touch\backend\.env.example
git rm --cached apps\website\.env
git rm --cached apps\website\.env.example
git rm --cached claude-code\.env.example
git rm --cached claude-code\web\.env.example

# Add to .gitignore
echo '.env' >> .gitignore
git add .gitignore
git commit -m "chore: remove .env files and update gitignore"
# Then rotate all exposed secrets so old values are dead even if in history
```

---

## Post-Rotation Verification

- [ ] `git log -S "sk_live_"` returns no results
- [ ] `git log -S "re_"` returns no results
- [ ] Stripe dashboard: old key shows 'Revoked'
- [ ] Resend dashboard: old API key removed
- [ ] Cloudflare: old API tokens deleted
- [ ] All `.env` files replaced with `.env.example`
- [ ] Vault populated with new secrets
- [ ] CI/CD secrets updated
- [ ] Team notified and local dev environments refreshed
