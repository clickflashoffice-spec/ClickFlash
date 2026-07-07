# Security Hardening Report

## Actions Completed

- [x] Fixed hardcoded password in PasswordModal.tsx (clickflash2025 → env var)
- [x] Fixed hardcoded password in pbManagement.ts (password123 → env var)
- [x] Replaced exposed Cloudflare token in production-config.json with placeholder
- [x] Generated master rotation script for ALL keys
- [x] Built signed master installer
- [x] Audited gallery app for secrets

## Remaining Critical Actions

- [ ] Run MASTER_ROTATION_SCRIPT.sh to purge keys from git history
- [ ] Rotate Stripe keys at dashboard.stripe.com
- [ ] Rotate Resend keys at resend.com/api-keys
- [ ] Rotate Cloudflare tokens at dash.cloudflare.com
- [ ] Generate new JWT secrets with openssl rand -hex 32
- [ ] Update all .env files with new keys
- [ ] Add VITE_KIOSK_ADMIN_PASSWORD to gallery .env
- [ ] Add VITE_DEFAULT_USER_PASSWORD to gallery .env

## Files Modified

- `apps/master/production-config.json`
- `apps/gallery/src/components/touch/PasswordModal.tsx`
- `apps/gallery/src/services/pbManagement.ts`

## Files Generated

- `docs/audit/tools/MASTER_ROTATION_SCRIPT.sh`
- `docs/audit/tools/MASTER_KEY_INVENTORY.json`
- `docs/audit/tools/GALLERY_SECRET_AUDIT.json`

## Installer Location
```
apps/master/release/ClickFlash-Master-Setup-4.2.0-x64.exe
```