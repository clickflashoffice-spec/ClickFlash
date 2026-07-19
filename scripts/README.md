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

Validates and deploys the four canonical Cloudflare Workers, applies their D1
migrations, and builds/deploys the Gallery and Management Pages apps. It defaults
to staging and refuses staging deployment while resource IDs are placeholders.
The Website remains owned by its dedicated Pages workflow.

```powershell
.\scripts\deploy-cloud.ps1 -Environment staging -WhatIf
.\scripts\deploy-cloud.ps1 -Environment production -WhatIf
```

Deploys:
- `workers/gallery-worker` -- Gallery and Website APIs (D1 + R2)
- `workers/management-worker` -- Management API (D1 + R2)
- `workers/moneytrash-worker` -- MoneyTrash API (D1 + R2 + KV)
- `workers/update-server` -- signed desktop update metadata
- `apps/gallery` and `apps/management` -- Cloudflare Pages

### `provision-secrets.sh`

Audits or interactively provisions the exact Cloudflare Worker secrets for
Gallery, Management, and MoneyTrash. The default environment is staging;
production must be explicit. Values are sent to Wrangler over stdin and are
never written into repository files.

```bash
./scripts/provision-secrets.sh --check --env staging
./scripts/provision-secrets.sh --env production
```

### `verify_ingestion.js`

Verifies the photo ingestion pipeline is working correctly. Checks that photos flow from camera import through processing to cloud upload.

```bash
node scripts/verify_ingestion.js
```

## Archived Scripts

Historical build and audit scripts are in `scripts/archive/` (if present). These were used during development and are not needed for production operations.
