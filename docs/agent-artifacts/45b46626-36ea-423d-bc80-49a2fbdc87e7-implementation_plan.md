# Cloudflare Online Deployment & Live Testing Plan

This plan outlines the end-to-end strategy for deploying all ClickFlash cloud-based applications and backend Workers directly to Cloudflare (`clickflash.office@gmail.com`), transitioning the monorepo from local-only testing to full online cloud hosting.

## Goal Description
Currently, local development servers run on ports `3000`, `5173`, `5174`, `8090`, and `8091`. The goal is to deploy all production-ready cloud backend services (Cloudflare Workers with D1, R2, and KV bindings) and frontend web applications (Cloudflare Pages) online so they can be accessed and tested over real cloud endpoints (`*.workers.dev` and `*.pages.dev` / `*.clickflash.com`).

## User Review Required

> [!IMPORTANT]
> **Cloudflare Account & Authentication**
> We have verified that `wrangler` is authenticated with account **`Clickflash.office@gmail.com's Account`** (`Account ID: <REDACTED:CF_ACCOUNT_ID>`) and has full write permissions (`workers (write)`, `pages (write)`, `d1 (write)`, `r2`, `kv`).

> [!WARNING]
> **Production Secrets Setup**
> During or immediately after deploying the Workers, required environment secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) must be populated in Cloudflare using `wrangler secret put <SECRET_NAME>` for secure authentication and Stripe payment processing.

## Open Questions
1. **Frontends Project Naming**: For Cloudflare Pages, we will deploy the built frontends under the names:
   - `clickflash-website` (`apps/website`)
   - `clickflash-management` (`apps/management`)
   - `clickflash-gallery` (`apps/gallery`)
   - `clickflash-moneytrash` (`apps/moneytrash`)
   Are you happy with these Pages project names?
2. **`apps/cloud-backend` Prototype**: `apps/cloud-backend` is currently a Hono prototype with placeholder D1 database IDs (`00000000-...`), whereas the active production backends (`workers/gallery-worker`, `workers/management-worker`, `workers/moneytrash-worker`, `workers/update-server`) have fully configured D1 (`gallery-db`, `management-db`, `moneytrash-db`), R2, and KV bindings. We will prioritize deploying all active `workers/*` and `apps/*` frontends first. Would you also like `apps/cloud-backend` deployed as a separate staging worker after creating a D1 database for it?

---

## Proposed Changes & Deployment Strategy

### Part 1: Backend Workers Deployment (`workers/*`)
We will verify TypeScript builds (`tsc --noEmit`) and run `npx wrangler deploy` for each production worker. All D1 (`gallery-db`, `management-db`, `moneytrash-db`), R2 (`clickflash-gallery-assets`, `clickflash-backups`, `moneytrash-uploads`), and KV (`UPLOAD_SESSIONS`) resources have been verified online.

#### [MODIFY] [gallery-worker](file:///C:/Users/alamo/Desktop/ClickFlash/workers/gallery-worker/wrangler.toml)
- **Service Name**: `gallery-backend`
- **Deploy Command**: `cd workers/gallery-worker && npx wrangler deploy`
- **Bindings**: Connects to `gallery-db`, `clickflash-website-db`, and `clickflash-gallery-assets` R2 bucket.

#### [MODIFY] [management-worker](file:///C:/Users/alamo/Desktop/ClickFlash/workers/management-worker/wrangler.toml)
- **Service Name**: `management-hub`
- **Deploy Command**: `cd workers/management-worker && npx wrangler deploy`
- **Bindings**: Connects to `management-db`, `clickflash-gallery-assets`, and `clickflash-backups` R2 buckets.

#### [MODIFY] [moneytrash-worker](file:///C:/Users/alamo/Desktop/ClickFlash/workers/moneytrash-worker/wrangler.toml)
- **Service Name**: `moneytrash-api`
- **Deploy Command**: `cd workers/moneytrash-worker && npx wrangler deploy`
- **Bindings**: Connects to `moneytrash-db`, `moneytrash-uploads` R2 bucket, and `UPLOAD_SESSIONS` KV namespace.

#### [MODIFY] [update-server](file:///C:/Users/alamo/Desktop/ClickFlash/workers/update-server/wrangler.toml)
- **Service Name**: `clickflash-update-server`
- **Deploy Command**: `cd workers/update-server && npx wrangler deploy`
- **Purpose**: Online OTA update check endpoint for desktop/kiosk applications.

---

### Part 2: Frontend Web Applications (`apps/*` -> Cloudflare Pages)
We will build the static/SSR bundles for each frontend application using `pnpm run build` and deploy them directly to Cloudflare Pages via `wrangler pages deploy`.

#### [MODIFY] [website](file:///C:/Users/alamo/Desktop/ClickFlash/apps/website/package.json)
- **Service Name**: `clickflash-website` (Cloudflare Pages)
- **Build & Deploy Command**: 
  - Build using Next.js / `@cloudflare/next-on-pages` (`npx @cloudflare/next-on-pages`) or standard static build.
  - Deploy using `cd apps/website && npx wrangler pages deploy .vercel/output/static --project-name clickflash-website`.

#### [MODIFY] [management](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/package.json)
- **Service Name**: `clickflash-management` (Cloudflare Pages)
- **Build & Deploy Command**:
  - Build: `cd apps/management && pnpm run build` (outputs to `./dist`)
  - Deploy: `cd apps/management && npx wrangler pages deploy dist --project-name clickflash-management`

#### [MODIFY] [gallery](file:///C:/Users/alamo/Desktop/ClickFlash/apps/gallery/package.json)
- **Service Name**: `clickflash-gallery` (Cloudflare Pages)
- **Build & Deploy Command**:
  - Build: `cd apps/gallery && pnpm run build` (outputs to `./dist`)
  - Deploy: `cd apps/gallery && npx wrangler pages deploy dist --project-name clickflash-gallery`

#### [MODIFY] [moneytrash](file:///C:/Users/alamo/Desktop/ClickFlash/apps/moneytrash/package.json)
- **Service Name**: `clickflash-moneytrash` (Cloudflare Pages)
- **Build & Deploy Command**:
  - Build: `cd apps/moneytrash && pnpm run build` (outputs to `./dist`)
  - Deploy: `cd apps/moneytrash && npx wrangler pages deploy dist --project-name clickflash-moneytrash`

---

## Verification Plan

### Automated Verification
1. **Worker Deployments Check**:
   - Verify each `wrangler deploy` returns successful deployment URLs (`https://<service-name>.<account-subdomain>.workers.dev`).
2. **Pages Deployments Check**:
   - Verify each `wrangler pages deploy` returns live preview/production URLs (`https://<project-name>.pages.dev`).

### Live Online Testing
1. **Health & API Endpoints**:
   - Perform live HTTP `GET` queries via `curl` against online worker endpoints (`/health` or status routes on `gallery-backend`, `management-hub`, `moneytrash-api`) to confirm live database connectivity.
2. **Frontend Accessibility**:
   - Verify the deployed Cloudflare Pages URLs serve the React/Next.js UI cleanly online without local CORS errors.
