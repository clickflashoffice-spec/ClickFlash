# Secret Rotation Checklist

## Immediate Actions Required


### Exposed Keys Found: 8 unique types

- [ ] **STRIPE_SECRET_KEY** (found in `.env`)
  - Go to: https://dashboard.stripe.com/apikeys → Revoke old key → Generate new restricted key
- [ ] **JWT_SECRET** (found in `.env`)
  - Generate new 256-bit secret: `openssl rand -base64 32`
- [ ] **DATABASE_URL** (found in `.env`)
  - Rotate database credentials via hosting provider (Railway/Neon/Supabase)
- [ ] **RESEND_API_KEY** (found in `apps\management\backend\.env`)
  - Go to: https://resend.com/api-keys → Revoke old key → Create new API key
- [ ] **API_KEY** (found in `apps\management\backend\.env`)
  - Rotate via respective service dashboard
- [ ] **CLOUD_API_KEY** (found in `apps\moneytrash\.env`)
  - Go to: https://dash.cloudflare.com → Manage API Tokens → Roll token
- [ ] **R2_ACCESS_KEY_ID** (found in `apps\moneytrash\.env`)
  - Go to: https://dash.cloudflare.com → Manage API Tokens → Roll token
- [ ] **R2_SECRET_ACCESS_KEY** (found in `apps\moneytrash\.env`)
  - Go to: https://dash.cloudflare.com → Manage API Tokens → Roll token

## Post-Rotation Steps

- [ ] Update all `.env.example` files with new placeholder format
- [ ] Populate vault (1Password/Doppler) with new secrets
- [ ] Update CI/CD environment variables
- [ ] Update `wrangler secret put` for Worker deployments
- [ ] Restart all services
- [ ] Verify no 401/403 errors in logs
- [ ] Run `git log -S` to confirm old secrets no longer in history (if history rewritten)

## Files to Update After Rotation

- `.env`
- `.env.example`
- `apps\gallery\.env`
- `apps\gallery\.env.example`
- `apps\gallery\backend\.env`
- `apps\gallery\backend\.env.example`
- `apps\management\.env`
- `apps\management\.env.example`
- `apps\management\backend\.env`
- `apps\management\backend\.env.example`
- `apps\master\.env`
- `apps\master\.env.example`
- `apps\master\backend\.env`
- `apps\master\backend\.env.example`
- `apps\master\backend\setup\config-template.env`
- `apps\master\backend\setup\profiles\concorde.env`
- `apps\master\backend\setup\profiles\marhaba-club.env`
- `apps\master\backend\setup\profiles\marhaba-occidental.env`
- `apps\master\ClickFlash-Master-test-hotel-2\.env`
- `apps\master\configs\club.env`
- `apps\master\configs\concorde.env`
- `apps\master\configs\occidental.env`
- `apps\moneytrash\.env`
- `apps\moneytrash\.env.example`
- `apps\touch\.env`
- `apps\touch\.env.example`
- `apps\touch\backend\.env`
- `apps\touch\backend\.env.example`
- `apps\website\.env`
- `apps\website\.env.example`
- `claude-code\.env.example`
- `claude-code\web\.env.example`