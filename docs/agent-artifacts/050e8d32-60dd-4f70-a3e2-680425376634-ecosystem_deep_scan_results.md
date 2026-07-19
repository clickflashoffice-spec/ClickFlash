# Ecosystem Scan Results & Architecture Audit

---

## 1. Apps/MoneyTrash (Vite + Tauri Uploader)

### Architecture Overview
- **Frontend (React 19 + Vite)**: Relies on `cloudApiService.ts` to coordinate chunked uploads with a Cloudflare Worker API.
- **Backend (Tauri v2 + Rust)**: Handles local file selection and file chunk reading (`read_file_chunk`).
- **Orchestration**: `desktopBatchUploadService.ts` splits local files into 5MB chunks, invoking Tauri Rust commands (`upload_file_chunk`) to save files to a temp directory, and then uploads them sequentially to the master server via native Rust HTTP (reqwest).

### Cloudflare R2/D1 Integration Patterns
- **API Endpoints**: Communicates directly with the Cloudflare Worker API at:
  - `/api/office/verify`
  - `/api/office/register`
  - `/api/upload/chunk/init`
  - `/api/upload/chunk` (PUT endpoint accepting chunks via FormData)
  - `/api/upload/chunk/finalize`
  - `/api/upload/chunk/cancel`
  - `/api/galleries`
  - `/api/galleries/:accessCode`
- **Dead Code**: The client contains `s3StorageService.ts` (using AWS SDK v3 `@aws-sdk/client-s3`), which has configurations for S3-compatible endpoints, but this service is dead code and is never imported or used.

### App.tsx Monolith Breakdown (1155 lines)
The massive `App.tsx` has multiple concerns that should be refactored:
1. **State Groups**:
   - Application flow (`mode`, `files`, `uploading`, `overallProgress`, `uploadStatus`, `uploadHistory`, `showHistory`, `showSettings`, `isNativeMode`).
   - Metadata (`eventName`, `accessCode`, `singlePhotoPrice`, `fullGalleryPrice`, `customerEmail`, `sendNotification`).
   - Form/File selection validation errors (`fieldErrors`, `fileSelectionError`).
   - App settings (`settings`).
2. **Distinct Concerns & Hooks**:
   - VRAM Protection: Downsampling previews to avoid application VRAM leaks/crashes.
   - Native Tauri integrations: Dialog file and folder pickers (`select_files`, `select_folder`, `read_file`).
   - Drag & Drop: React dropzone event callbacks.
   - Batch Upload Orchestrator: Job state subscription from `desktopBatchUploadService`.
3. **Extraction Recommendations**:
   - `SettingsPanel.tsx` (lines 567-675)
   - `HistoryPanel.tsx` (lines 678-704)
   - `GalleryDetailsForm.tsx` (lines 709-868)
   - `UploadSummary.tsx` (lines 870-922)
   - `DropZoneUploader.tsx` (lines 925-1012)
   - `UploadQueueGrid.tsx` (lines 1014-1146)
   - Hooks: `useUploadConfig.ts`, `useUploadForm.ts`

### Rust Commands and tauri.conf.json Structure
- **Commands**:
  - `config.rs`: Saves encrypted upload configs using AES-256-GCM.
  - `file.rs`: Selects native files/folders, validates sizes, and reads chunks.
  - `upload.rs`: Temporarily reconstructs chunks in standard temp directories and streams to the API.
- **Dead Code**: `cloud_mirror.rs` implements parallel S3+R2 mirroring uploads but is only invoked in tests.
- **Security & Performance Risks**:
  - `cloud_mirror.rs` contains a mocked `generate_presigned_url` method which does not perform cryptographic SigV4 signing.
  - `tauri.conf.json` defines a CSP (`connect-src 'self' https://s3.amazonaws.com`). This will block standard web `fetch()` calls in the frontend that target external Cloudflare Worker APIs unless the API url resolves to localhost or is explicitly allowed.

---

## 2. Apps/Management (React + Vite Cloud Dashboard)

### Directory Structure & Component Organization
- **Frontend**: Contains top-level components/pages directly under `src/components` (`Clients.tsx`, `Orders.tsx`, `Photographers.tsx`, `ProductsPage.tsx`), mixed with subfolders like `dashboard/`, `layout/`, `common/`, creating folder structure inconsistency.
- **Backend**: Lives in `apps/management/backend`. It is deployed as a Cloudflare Worker (`management-hub`) using Wrangler.

### API Routes & Database Bindings
- **Worker Configuration (`wrangler.toml`)**:
  - Database: Cloudflare D1 SQL database (`management-db`, ID: `983b7087-b6e9-4468-9c92-1965309ce2df`) bound to `DB`.
  - Storage: Cloudflare R2 bucket (`clickflash-gallery-assets`) bound to `GALLERY_BUCKET`.
  - Variables: `ALLOWED_ORIGINS` whitelists administration origins. WAF rate limiting is set to 60 req/min, with a whitelist for countries: `MA, TN, FR, US`.
- **Backend Code**: Uses a monolithic `server.ts` (95KB) acting as Express-like routing middleware. Separate routing modules exist under `backend/src/routes/` (`analytics.ts`, `auth.ts`, `sync.ts`, etc.).

### Dependencies & Anti-patterns
- **Mixed Dependencies**: Root frontend `package.json` includes server-only libraries: `"formidable": "2.1.5"`, `"fs-extra": "^11.3.2"`, `"jsonwebtoken": "^9.0.2"`. These will fail or cause bloat if imported into client code.
- **Monolith server.ts**: The 95KB backend `server.ts` is overly large and violates single-responsibility principles.

---

## 3. Apps/Gallery (React + Stripe Client Gallery)

### Directory Structure
- Structured similarly to management: React + Vite frontend (`src/`) alongside a Cloudflare Worker backend (`backend/`).

### Stripe Integration Patterns
- **Frontend**: `stripeService.ts` and `stripeEdgeService.ts` coordinate payment intents and hosted checkout.
  - `stripeEdgeService.ts` is a comprehensive wrapper handling elements, 3D secure verification, saved payment cards, and digital wallets (Apple Pay/Google Pay).
  - Backend payment API endpoints are `/api/payments/create-intent`, `/api/payments/create-session`, and `/api/payments/methods`.
- **Wrangler D1 Bindings**:
  - Bound to `GALLERY_DB` (`gallery-db`, ID: `b556a025-1ada-46f1-ac15-2f7d117ca350`) and `WEBSITE_DB` (`clickflash-website-db`, ID: `5f78535b-10d3-45b4-af94-a6e5a061cac5`).
  - Has a cron trigger running hourly for cart abandonment recovery emails.

### Anti-patterns & Risks
- **Implicit Backend Dependencies**: `backend/package.json` is a blank 28-byte shell. The backend code imports server libraries declared in the root frontend `package.json` (such as `express`, `jsonwebtoken`, `bcryptjs`, `formidable`, `fs-extra`).
- **WAF Country Hardcoding**: Restricts access strictly to countries: `MA, TN, FR, US`, which will block global customers attempting to buy galleries.

---

## 4. Apps/Website (Next.js 15 Marketing Site)

### Architecture & Directory Structure
- Standard Next.js 15 App router structure (`src/app/` containing routes like `/pricing`, `/portfolio`, `/blog`, `/bookings`, `/contact`).
- Deployed on Cloudflare Pages (`wrangler.toml` targets output directory `out`).
- Uses Framer Motion and GSAP for rich animations.

### Dependencies
- Clean, focused package.json (`next`, `react`, `react-dom`, `gsap`, `framer-motion`, `@builder.io/partytown` for offloading analytics).

### Risks
- Layout thrashing or performance degradation on mobile if heavy GSAP/Framer animations run on the main thread simultaneously.

---

## 5. Packages/ (Shared Packages)

### Structure & Purpose
- **`@clickflash/config`**: Monorepo configurations (ESLint, Prettier, Tailwind, tsconfig, security-headers).
- **`@clickflash/database`**: Shared migrations and DB tools (uses `better-sqlite3-multiple-ciphers` for encrypted local databases).
- **`@clickflash/types`**: Shared TypeScript definitions.
- **`@clickflash/ui`**: Atomic UI library (Button, Card, Input, Modal, PhotoCard, Spinner, Toast).
- **`@clickflash/validation`**: Shared Zod schemas (PhotoSchema, AlbumSchema, UserSchema).
- **Anti-patterns**: None. The packages are clean and modular, resolving correctly via workspaces.
