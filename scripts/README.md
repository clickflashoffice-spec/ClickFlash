# Scripts Directory

Operational scripts for building, deploying, and maintaining the ClickFlash ecosystem.

## Scripts

### `build-hotel-packages.ts`

Assembles deployment packages for the 3 Tunisian hotels. Each package contains:
- Master Electron installer (`.exe`)
- Touch kiosk Electron installer (`.exe`)
- Hotel-specific `.env` configuration
- Setup instructions

```bash
npx tsx scripts/build-hotel-packages.ts
```

### `deploy-cloud.ps1`

Deploys Cloudflare Workers (gallery, management) and the website to production.

```powershell
.\scripts\deploy-cloud.ps1
```

Deploys:
- `apps/gallery` -- CF Worker (D1 + R2)
- `apps/management` -- CF Worker (D1)
- `apps/website` -- Vercel / CF Pages

### `rotate-api-keys.ts`

Rotates JWT secrets and API keys across all apps. Should be run quarterly or after any suspected compromise.

```bash
npx tsx scripts/rotate-api-keys.ts
```

Updates:
- Master `JWT_SECRET` and `SESSION_SECRET`
- Touch `JWT_SECRET`
- CF Worker secrets via `wrangler secret put`

### `verify_ingestion.js`

Verifies the photo ingestion pipeline is working correctly. Checks that photos flow from camera import through processing to cloud upload.

```bash
node scripts/verify_ingestion.js
```

## Archived Scripts

Historical build and audit scripts are in `scripts/archive/` (if present). These were used during development and are not needed for production operations.
