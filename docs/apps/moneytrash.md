# Forensic Architecture Report: `apps/moneytrash/` — MoneyTrash Uploader

> Generated: 2026-06-22 | Scope: Next.js 15 web app + Tauri desktop uploader, Cloudflare Worker API, D1/R2/KV

## 1. Overview & Stats

| Attribute | Value |
|-----------|-------|
| **App name** | `moneytrash-uploader` |
| **Version** | 4.2.0 |
| **Frontend stack** | React 19.2, TypeScript 5.9, Vite 7.3, Tailwind CSS 3.4, `react-dropzone` |
| **Desktop shell** | Tauri v2 (`@tauri-apps/api` 2.2, plugins: dialog, fs, http, notification, shell) |
| **Backend stack** | Cloudflare Worker (Wrangler 3.x), D1 (SQLite), R2, KV |
| **Deployment target** | Web -> Vercel/Cloudflare Pages; Worker -> Cloudflare Workers (`moneytrash-api`) |
| **Package manager** | pnpm 10.28.2 |
| **TS/TSX files** | 54 |
| **Component files** | 10 |
| **Test files** | 5 |
| **Key dependencies** | `@tauri-apps/api`, `react-dropzone`, `lucide-react`, `clsx`, `uuid`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |

**Entry flow**: `src/main.tsx` (Vite/Tauri build) renders `App.tsx`, which uses `useUploadManager`. A parallel Next.js App Router app (`src/app/page.tsx`) provides a web-only uploader. Tauri native mode is detected via `__TAURI__` window flag.

## 2. Folder/File Tree

```
apps/moneytrash/
├── src/
│   ├── App.tsx                    # Tauri/Vite main uploader UI
│   ├── main.tsx                   # Vite React root
│   ├── app/
│   │   ├── layout.tsx             # Next.js 15 root layout
│   │   ├── page.tsx               # Next.js web uploader
│   │   └── api/upload/
│   │       ├── route.ts           # Local Next.js ingest endpoint
│   │       ├── chunk/route.ts     # Chunked upload route
│   │       └── uploadUtils.ts     # Background sync helpers
│   ├── components/
│   │   ├── Uploader.tsx           # Standalone uploader component
│   │   ├── MemoryStatus.tsx       # VRAM/memory indicator
│   │   ├── error-boundaries/
│   │   ├── modals/
│   │   │   ├── SettingsModal.tsx
│   │   │   └── HistoryModal.tsx
│   │   └── upload/
│   │       └── UploadZone.tsx     # Dropzone + file queue
│   ├── hooks/
│   │   ├── useUploadManager.ts    # Main upload state machine
│   │   └── useVRAMProtection.ts   # Preview downsampling guard
│   ├── services/
│   │   ├── cloudApiService.ts     # Worker API client
│   │   ├── desktopBatchUploadService.ts # Tauri native batch uploader
│   │   ├── batchUploadService.ts  # Web fallback batch uploader
│   │   ├── resumableUploadService.ts
│   │   ├── uploadQueue.ts
│   │   ├── bandwidthScheduler.ts
│   │   ├── progressStorage.ts
│   │   └── tauriService.ts        # Tauri invoke wrapper
│   ├── types/index.ts
│   ├── utils/exif.ts
│   ├── utils/logger.ts
│   └── utils/uploadBenchmark.ts
├── cloudflare/
│   ├── src/
│   │   ├── index.ts               # Worker entry/router
│   │   ├── router.ts              # Tiny middleware router
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT verification
│   │   │   └── rateLimit.ts       # In-memory IP rate limit
│   │   ├── handlers/
│   │   │   ├── office/register.ts
│   │   │   ├── office/verify.ts
│   │   │   ├── upload/init.ts
│   │   │   ├── upload/chunk.ts
│   │   │   ├── upload/finalize.ts
│   │   │   ├── upload/cancel.ts
│   │   │   ├── gallery/create.ts
│   │   │   └── gallery/get.ts
│   │   ├── handlers/webhook.ts
│   │   └── utils/jwt.ts
│   ├── migrations/                # D1 schema
│   └── wrangler.toml
├── __tests__/logic.test.ts
├── tests/e2e/*.spec.ts
├── package.json
├── vite.config.ts
├── next.config.js/ts
└── tsconfig.json
```

## 3. Screens / Pages / Routes

### Next.js App Router (web)
- `/` — Web uploader (`UploaderDashboard`)
- `/api/upload` — Local form-data ingest + background gallery sync
- `/api/upload/chunk` — Chunked upload endpoint

### Tauri/Vite app
- Single-page app; no router. Modals for settings/history.

### Worker API routes
- `GET /api/health`
- `POST /api/office/register` — Register office (requires `MASTER_API_KEY`)
- `POST /api/office/verify` — Verify desk credentials, returns JWT
- `POST /api/upload/chunk/init` — Start upload session
- `PUT /api/upload/chunk` — Upload chunk
- `PATCH /api/upload/chunk/finalize` — Finalize and create gallery
- `POST /api/upload/chunk/cancel` — Cancel session
- `POST /api/galleries` — Create gallery record
- `GET /api/galleries/:code` — Lookup gallery
- `POST /api/webhooks/:event` — Webhook handler

## 4. UI Component Inventory

### Shell / layout
`App` (main shell), `Uploader` (web standalone), `RootLayout`.

### Upload
`UploadZone`, `MemoryStatus`.

### Modals
`SettingsModal`, `HistoryModal`.

### Error handling
`FeatureErrorBoundary`.

### States
- Loading: inline spinners (`Loader2`)
- Empty: dropzone prompt
- Error: file rejection list, `fileSelectionError`, per-file error overlay
- Progress: per-file progress bar + overall progress fill on Start Upload button

## 5. Features & User Journeys

1. **New Gallery upload (web)**: fill event name/access code/pricing/email -> drag files -> Start Upload -> local ingest -> background sync to gallery API
2. **Order Backup (web)**: switch mode -> fill order name/access code/email -> drag files -> ingest -> sync
3. **Tauri desktop batch upload**: settings configure API URL/deskId -> native file/folder picker -> chunked upload to Worker -> gallery creation
4. **Settings**: API endpoint, desk ID, API key, auto-start, native-mode toggle
5. **History**: list of recent uploads (in-memory, persisted via Tauri `load_upload_history`)

### Sub-features
- Drag-and-drop with `react-dropzone`
- Native file/folder selection via Tauri commands
- Chunked resumable upload (5MB chunks)
- VRAM-protected preview generation
- EXIF shot-time extraction
- Bandwidth scheduling and concurrent upload queue

## 6. State Management

| Layer | Tech | Usage |
|-------|------|-------|
| Local form state | `useState` | All metadata fields, files, progress |
| Upload job queue | Singleton service classes | `desktopBatchUploadService`, `batchUploadService` |
| Settings | `useState` + Tauri config load | API URL, desk ID, credentials |
| History | `useState` + Tauri invoke | Recent uploads |
| Server cache | none explicit | direct fetch |

No global store (Zustand/Redux) is used; state is lifted into `useUploadManager`.

## 7. API / Backend

**Worker**: `moneytrash-api` (Cloudflare Worker).

**Bindings**: `DB` (D1), `UPLOADS_BUCKET` (R2), `UPLOAD_SESSIONS` (KV).

**Secrets**: `JWT_SECRET`, `STRIPE_SECRET_KEY`, `WEBHOOK_SECRET`, `MASTER_API_KEY`, `ALLOWED_ORIGINS`, `ENVIRONMENT`, `GALLERY_APP_URL`.

**Integrations**:
- Gallery app: syncs album metadata and photos via `/api/cloud/sync-album`
- Stripe: webhook endpoint for payments
- Tauri: native commands `select_files`, `read_file`, `read_file_chunk`, `upload_file_chunk`

**Security**: exact-origin CORS (comma-list check), JWT auth via `Authorization: Bearer`, in-memory IP rate limiting, `MASTER_API_KEY` for office registration.

## 8. Database

### D1 tables
- `offices` — registered desks/stations
- `galleries` — created galleries and access codes
- `upload_logs` — upload lifecycle audit log
- `webhook_events` — Stripe/webhook idempotency

### KV
- `session:${sessionId}` — active chunked upload session state (24h TTL)

### R2
- `uploads/${officeId}/${mode}/${timestamp}-${filename}` — raw uploaded chunks/files

## 9. Security Surface

| Area | Status | Notes |
|------|--------|-------|
| CORS | comma-list exact origin | fail-closed to empty origin |
| Auth | JWT | 24h expiry for office tokens |
| Office registration | `MASTER_API_KEY` | simple shared secret |
| Rate limiting | in-memory per IP/path | not shared across Worker instances; reset on deploy |
| Input validation | manual checks | no Zod schemas visible in Worker |
| File validation | type/size | in Next.js route and Worker init |
| SQL injection | mitigated | D1 parameterized |
| R2 keys | sanitized filenames | replaces non-alphanumeric chars |
| Secrets | env bindings | good |
| Local Next.js endpoint | writes to disk | `uploads/` directory; no auth check visible |

## 10. Testing

- `__tests__/logic.test.ts` — unit tests
- `tests/e2e/*.spec.ts` — 4 Playwright specs covering smoke, file-selection, mode/auth validation, upload flow
- Vitest + Playwright

### Observed gaps
- No Worker backend tests
- No Tauri command mocking tests
- No rate-limit correctness tests
- No file-system cleanup tests for local `/api/upload`

## 11. Architecture / Performance / Design System

- **Dual entry**: Next.js web app for browser uploads; Vite+Tauri for desktop high-volume uploads.
- **Zero-buffer native uploads**: Tauri reads file chunks and streams to Worker without loading whole files into JS heap.
- **Concurrency**: desktop batch service limits to 3 concurrent jobs / 5 concurrent files.
- **Chunking**: 5MB chunks for Worker; configurable via `CHUNK_SIZE` env.
- **VRAM protection**: previews downsampled to 400x400 and capped at 20 in memory.
- **Design**: Tailwind dark zinc/yellow/green theme; inline styling.
- **Bundle risks**: full `@aws-sdk/client-s3` import for presigned URLs; large Tauri plugin bundle.

## 12. Concrete Improvement Proposals

1. **Unify upload backends**: either use Next.js local ingest or Cloudflare Worker, not both, to reduce security/maintenance surface.
2. **Add Zod validation** to all Worker request bodies and Next.js form-data handlers.
3. **Replace in-memory rate limiting** with Cloudflare KV or Durable Objects for consistency across Worker instances.
4. **Add authentication to Next.js `/api/upload`** or restrict it to local loopback/Tauri context.
5. **Write backend tests** with Miniflare/Wrangler unstable_dev covering init/chunk/finalize flow.
6. **Add Sentry integration** for Tauri and Worker error tracking.
7. **Tree-shake AWS SDK**: use `@aws-sdk/s3-request-presigner` only or replace with Cloudflare R2 S3 API wrapper.
8. **Implement resumable session recovery** on app restart using KV + local progress storage.
