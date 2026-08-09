# ClickFlash v2.0 Deployment Guide

## 1. Prerequisites
- Node.js >= 20.0.0
- pnpm 10.28.2
- Windows 10/11 x64 (for desktop apps)
- Cloudflare account with Workers, D1, R2, Pages
- Stripe account (test mode for dev)
- Android Studio + Android SDK (for mobile-photographer)

## 2. Local Development Setup
```bash
git clone <repo>
cd ClickFlash
pnpm install
cp .env.example .env  # Configure local environment
pnpm run dev:master   # Master on :8090
pnpm run dev:touch    # Touch on :8091
```

## 3. Cloud Deployment
### 3.1 Cloudflare Workers
- gallery-worker → `wrangler deploy` in workers/gallery-worker/
- management-worker → `wrangler deploy` in workers/management-worker/
- moneytrash-worker → `wrangler deploy` in workers/moneytrash-worker/
- update-server → `wrangler deploy` in workers/update-server/

### 3.2 D1 Database Migrations
- gallery-db: `001_security_rate_limits.sql`, `002_online_commerce.sql`
- moneytrash-db: `001_secure_multipart_uploads.sql`, `002_gallery_expiration.sql`, `003_b2b_commerce.sql`
- Reference: [D1 Migration Deployment](file:///c:/Users/alamo/Desktop/ClickFlash/docs/D1_MIGRATION_DEPLOYMENT.md)

### 3.3 Secrets Configuration
- `wrangler secret put JWT_SECRET` for each worker
- `wrangler secret put STRIPE_SECRET_KEY` for commerce workers
- `wrangler secret put PRIVATE_KEY_PEM` for signing workers
- Reference: [Credential Rotation Runbook](file:///c:/Users/alamo/Desktop/ClickFlash/docs/CREDENTIAL_ROTATION_RUNBOOK.md)

### 3.4 Cloudflare Pages
- Management: `pnpm run build:management` → deploy to Pages
- Gallery: `pnpm run build:gallery` → deploy to Pages
- Website: `pnpm run build:website` → deploy to Pages

## 4. Desktop Packaging
- Master: `pnpm run build:master` → electron-builder
- Touch: `pnpm run build:touch` → electron-builder
- Installer: Build Studio Installer with payload verification
- License Generator: Build offline signing utility
- Code signing: `scripts/sign-release.ps1` (requires Authenticode cert)
- Reference: [Code Signing Setup](file:///c:/Users/alamo/Desktop/ClickFlash/docs/CODE_SIGNING_SETUP.md)

## 5. Mobile Build
- `cd apps/mobile-photographer && npx expo prebuild --platform android`
- Debug: `npx expo run:android`
- Release: `eas build --platform android` (requires EAS credentials)

## 6. Environment Variables
Key environment variables from `.env.example`:
- `JWT_SECRET` - 64-byte hex JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API secret
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `DB_ENCRYPTION_KEY` - SQLCipher database encryption
- `CLOUD_API_URL` - Worker API endpoint
- `LICENSE_PUBLIC_KEY` - Ed25519 public key for license verification
- `DATABASE_PATH` - Path to SQLite db (e.g., `./data/clickflash.db`)
- `DATABASE_URL` - SQLite connection URL (e.g., `sqlite:./data/clickflash.db`)
- `API_PORT` - Master API port (default: 8090)
- `API_URL` - Master API URL (default: `http://localhost:8090/api`)
- `TOUCH_KIOSK_PORT` - Touch Kiosk port (default: 8091)
- `MONEYTRASH_PORT` - MoneyTrash port (default: 3000)
- `WEBSITE_PORT` - Website port (default: 3001)
- `MANAGEMENT_PORT` - Management Web App port (default: 5173)
- `GALLERY_PORT` - Gallery Web App port (default: 5174)
- `NEXT_PUBLIC_GALLERY_API_URL` - Public API used by apps/website at build/runtime
- `CLICKFLASH_LICENSE_SALT` - License Key Salt
- `CLICKFLASH_HUB_URL` - Hotel Deployment Package Builder Hub URL
- `CLICKFLASH_GALLERY_URL` - Hotel Deployment Package Builder Gallery URL
- `ENABLE_CLOUD_SYNC` - Feature flag for cloud sync (true/false)
- `ENABLE_AUTO_UPDATER` - Feature flag for auto updater (true/false)
- `ENABLE_FACE_RECOGNITION` - Feature flag for touch kiosk face recognition (true/false)

## 7. Rollback Procedures
- Workers: `wrangler rollback` to previous version
- D1: Backup before migration, restore from backup
- Desktop: Installer supports same-release repair and root rollback
- Reference: [Disaster Recovery](file:///c:/Users/alamo/Desktop/ClickFlash/docs/DISASTER_RECOVERY.md)
