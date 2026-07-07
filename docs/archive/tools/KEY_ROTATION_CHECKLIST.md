# 🔑 KEY ROTATION CHECKLIST - P0 CRITICAL

**Execute these steps IMMEDIATELY. Your old keys are compromised.**

## Stripe - Restricted Test Key

**Old Key:** `rk_test_51Tfm2N...Gk4R003s0oziu1`

**Dashboard:** [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)

### Steps:

- [ ] 1. Login to Stripe Dashboard (link above)
- [ ] 2. Navigate to Developers → API Keys
- [ ] 3. Find the key starting with 'rk_test_51Tfm2N'
- [ ] 4. Click the '...' menu → 'Roll key' OR 'Delete'
- [ ] 5. Create new restricted test key with same permissions
- [ ] 6. Copy the new key (starts with rk_test_)
- [ ] 7. Update apps/management/backend/.env
- [ ] 8. Update any other .env files using this key

### Affected Files:

- `apps/management/backend/.env`
- `apps/management/worker/wrangler.toml`

## Resend - API Key

**Old Key:** `re_cYq1p8w3...K46oy`

**Dashboard:** [https://resend.com/api-keys](https://resend.com/api-keys)

### Steps:

- [ ] 1. Login to Resend Dashboard (link above)
- [ ] 2. Go to API Keys section
- [ ] 3. Find the key starting with 're_cYq1p8w3'
- [ ] 4. Click 'Revoke' to disable immediately
- [ ] 5. Click 'Create API Key'
- [ ] 6. Name it 'ClickFlash Production'
- [ ] 7. Copy the new key (starts with re_)
- [ ] 8. Update apps/website/.env
- [ ] 9. Update apps/management/backend/.env

### Affected Files:

- `apps/website/.env`
- `apps/management/backend/.env`

## Cloudflare - API Token

**Old Key:** `cfut_VMGMGxL1...0b4b4109`

**Dashboard:** [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)

### Steps:

- [ ] 1. Login to Cloudflare Dashboard (link above)
- [ ] 2. Go to My Profile → API Tokens
- [ ] 3. Find the token starting with 'cfut_VMGMGxL1'
- [ ] 4. Click 'Roll' OR 'Delete'
- [ ] 5. Create new token with same permissions:
- [ ]    - Zone:Read, Zone:Edit (for clickflash.app)
- [ ]    - Account:Read (for R2 access)
- [ ] 6. Copy the new token (starts with cfut_)
- [ ] 7. Update apps/master/.env
- [ ] 8. Update apps/master/production-config.json
- [ ] 9. Update wrangler.toml files

### Affected Files:

- `apps/master/.env`
- `apps/master/production-config.json`
- `apps/*/wrangler.toml`

## Post-Rotation Verification

- [ ] Run: grep -r 'rk_test_51Tfm2N' apps/ --include='*.env' --include='*.toml'
- [ ] Run: grep -r 're_cYq1p8w3' apps/ --include='*.env' --include='*.toml'
- [ ] Run: grep -r 'cfut_VMGMGxL1' apps/ --include='*.env' --include='*.toml'
- [ ] All commands should return NO RESULTS
- [ ] Test Stripe integration: npm run test:stripe
- [ ] Test Resend emails: npm run test:email
- [ ] Test Cloudflare deployments: npm run deploy:staging