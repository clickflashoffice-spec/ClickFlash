# Cloud Deployment Guide (Wrangler + Edge)

## Overview
ClickFlash uses Cloudflare Workers, D1 (SQLite Edge Database), and R2 (Object Storage) for all cloud synchronization.

## Deploying Cloudflare Workers
```bash
cd workers
npx wrangler d1 execute clickflash-db --file=./schema.sql
npx wrangler deploy
```

## Deploying Web Applications
- **Management Hub (`apps/management`)**: `pnpm run build` -> deploy dist to Edge / Pages.
- **Client Gallery (`apps/gallery`)**: `pnpm run build` -> deploy dist to Edge / Pages.
- **Marketing Site (`apps/website`)**: Next.js standalone build -> deploy to self-hosted node or edge container.
