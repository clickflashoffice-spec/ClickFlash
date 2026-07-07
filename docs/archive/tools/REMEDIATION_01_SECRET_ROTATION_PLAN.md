# ClickFlash — Secret Rotation & .env Cleanup Implementation Plan
> **Generated:** June 2026  
> **Priority:** P0 — Execute within 24 hours  
> **Principle:** Non-destructive preparation; actual rotation requires live services access

---

## 1. Immediate Threat Assessment

### 1.1 Exposed Secret Categories
| Category | Count | Location Pattern | Risk |
|----------|-------|------------------|------|
| JWT secrets | 5+ | `.env`, `wrangler.toml`, legacy backend config | Forged tokens, unauthorized admin access |
| API keys (Resend, Cloud, Gallery, Hub, MoneyTrash) | 8+ | `.env` files | Service abuse, quota theft, email spam |
| Stripe secret key | 1 | `apps/management/backend/.env` | Payment fraud, PCI scope expansion |
| Default passwords | 4+ | Legacy backend init scripts | Admin account takeover |
| Cloud credentials (R2) | 2+ | Master backend `.env` | Data exfiltration, storage abuse |

### 1.2 Committed `.env` Files (18 Real Files)
```
.env
apps/gallery/.env
apps/gallery/backend/.env
apps/management/.env
apps/management/backend/.env
apps/master/.env
apps/master/backend/.env
apps/master/backend/setup/profiles/*.env (3)
apps/master/ClickFlash-Master-test-hotel-2/.env
apps/master/configs/*.env (3)
apps/moneytrash/.env
apps/touch/.env
apps/touch/backend/.env
apps/website/.env
```

---

## 2. Step-by-Step Remediation

### Step 1 — Stop the Bleeding (0–2 hours)
1. **Do NOT commit any new changes** until cleanup is complete.
2. Inform all team members with repo access that secret rotation is in progress.
3. Revoke/disable exposed cloud service keys immediately:
   - Stripe dashboard → Developers → API keys → revoke `STRIPE_SECRET_KEY`
   - Resend dashboard → API keys → revoke exposed key
   - Cloudflare API tokens → revoke tokens in `R2_SECRET_KEY`, `CLOUD_API_KEY`
   - Any custom gallery/hub/moneytrash API keys → rotate

### Step 2 — Purge from Git History (2–4 hours)
**Option A — Nuclear (recommended for P0):**
```bash
# Use git-filter-repo or BFG Repo-Cleaner
# Example with git-filter-repo:
git filter-repo --replace-text <<EOF
apps/management/backend/.env==***REMOVED***
apps/master/.env==***REMOVED***
EOF

# Force push to all remotes (coordinate with team)
git push origin --force --all
git push origin --force --tags
```

**Option B — Surgical (if history rewrite is impossible):**
1. Delete files in current commit.
2. Add patterns to `.gitignore`.
3. Rotate all exposed secrets (history will still show old values but they are dead).

### Step 3 — Add `.gitignore` Rules
Append to root `.gitignore` and every app `.gitignore`:
```gitignore
# Environment files
.env
.env.local
.env.production
.env.development
!.env.example

# Runtime data
pb_data/
*.db
*.db-shm
*.db-wal
*.log
logs/

# Binaries / installers
*.msi
*.exe
*.dmg
release/
```

### Step 4 — Replace with `.env.example` Templates
For every real `.env` file, create an `.env.example` with:
- All keys present
- All secret values replaced with placeholders:
  ```
  JWT_SECRET=your-32-char-jwt-secret-here
  STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
  RESEND_API_KEY=[REDACTED]
  R2_ACCESS_KEY=your_r2_access_key
  R2_SECRET_KEY=your_r2_secret_key
  ```

### Step 5 — Move Secrets to Vault
Recommended: **1Password Secrets Automation** or **Doppler**
- Create a `clickflash` project/config per environment (dev/staging/prod)
- Import cleaned `.env` values
- Update CI/CD to inject secrets at runtime
- Update local dev onboarding to use `op run --` or Doppler CLI

### Step 6 — Code-Level Fixes
1. Replace hardcoded default passwords in legacy backends:
   - `apps/gallery/backend/legacy/init-default-user.js`
   - `apps/gallery/backend/legacy/shared/init-default-user.js`
   - `apps/gallery/backend/legacy/src/initDefaultUser.ts`
   - `apps/gallery/backend/legacy/seed_d1.sql`
   > Generate random passwords from env or require first-run setup.

2. Remove or rotate JWT secrets in `wrangler.toml` files:
   - `apps/gallery/backend/wrangler.toml`
   - `apps/management/backend/wrangler.toml`
   > Use `wrangler secret put JWT_SECRET` instead of hardcoding.

3. Audit `apps/master/backend/setup/profiles/*.env` and `apps/master/configs/*.env`.
   > These appear to be per-hotel configs. Move to vault with hotel-specific namespaces.

---

## 3. Verification Checklist

- [ ] All 18 real `.env` files removed from git history or current commit
- [ ] `.gitignore` updated at root and per-app
- [ ] `.env.example` created for every removed `.env`
- [ ] Stripe key rotated and old key revoked
- [ ] Resend key rotated
- [ ] Cloudflare API tokens rotated
- [ ] Custom API keys (Gallery/Hub/MoneyTrash) rotated
- [ ] Default passwords removed from source
- [ ] `git log -S` search returns no live secrets
- [ ] Vault populated with new values
- [ ] CI/CD updated to pull from vault
- [ ] Team notified of new local dev setup

---

## 4. Rollback Plan

If rotation breaks a service:
1. Revert to previous vault version (1Password/Doppler keep history).
2. If vault unavailable, restore from secure offline backup.
3. Never roll back to committed `.env` files.

---

## 5. Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Revoke exposed keys | 30 min | Security Lead |
| Purge git history | 2 hours | DevOps |
| `.gitignore` + examples | 1 hour | Engineering |
| Vault migration | 4 hours | DevOps |
| Code-level fixes | 2 hours | Backend Lead |
| Verification | 1 hour | QA + Security |
| **Total** | **~1 day** | — |
