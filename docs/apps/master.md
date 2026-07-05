# ClickFlash Master Portal — Forensic Architecture Report

> Generated: 2026-06-22  
> Scope: `apps/master/` (Electron + React 19 frontend + Express backend) and `apps/master-cpp/` (C++ Drogon/QTcpServer backend candidate).  
> Method: Read-only code exploration (Glob/Grep/ReadFile/Shell).

---

## 1. Overview & Stats

| Item | Value |
|------|-------|
| **App name** | `clickflash-master` v4.2.0 |
| **Stack** | Electron 39, React 19.2, TypeScript 5.9, Vite 7.3, Tailwind CSS 3.4, Express 5.1, better-sqlite3-multiple-ciphers 12.8 |
| **Ports** | Dev Vite `5173`; backend unified on `8090`; master-cpp configurable (default `8090`). |
| **Build tools** | `vite`, `esbuild`, `tsc`, `electron-builder` 26.8, `pnpm`/`npm`, `turbo`. |
| **Frontend source** | 234 `.tsx`, 188 `.ts` files under `apps/master/src/`. |
| **Backend source** | 205 `.ts` files under `apps/master/backend/`. |
| **Tests** | 16 unit tests in `src/`, 14 backend tests, 52 Playwright E2E specs in `tests/e2e/`. |
| **Migrations** | 48 SQL migrations in `backend/shared/migrations/`. |
| **C++ backend** | `apps/master-cpp/` — C++20, Drogon, SQLite3/SQLCipher, OpenSSL; 47 `.cpp` files. |

### Key Entry Points
- **Renderer**: `src/main.tsx` → `App.tsx` → `AppRouter.tsx` → `MainLayout.tsx`.
- **Electron main**: `electron-main.ts` (forks `dist/backend/server.js`).
- **Backend**: `backend/server.ts` (DI `container.ts`, routes `routes/index.ts`).
- **C++ service**: `apps/master-cpp/src/main.cpp`.

---

## 2. Folder/File Tree (Depth 3–4)

```
apps/master/
├── src/
│   ├── components/                 # UI layer
│   │   ├── albums/                 # Album grid, import, Editor v1 + Editor2
│   │   │   ├── editor2/            # Next-gen photo editor
│   │   ├── bookings/               # Booking calendar
│   │   ├── common/                 # Shared UI primitives
│   │   ├── dashboard/              # Dashboard widgets
│   │   ├── error-boundaries/       # Feature error boundaries
│   │   ├── marketing/              # Campaign editor (legacy)
│   │   ├── modals/                 # CRUD modals
│   │   ├── moneytrash/             # Money-trash queue (legacy)
│   │   ├── orders/                 # Order board, print, lab folder
│   │   ├── photographers/          # Staff management
│   │   ├── products/               # Products, packs, inventory
│   │   ├── settings/               # Settings hub + tabs
│   │   ├── setup/                  # First-run wizard
│   │   ├── ui/                     # Local @clickflash/ui mirror
│   │   ├── AppRouter.tsx           # Top-level routing
│   │   ├── MainLayout.tsx          # App shell
│   │   ├── Sidebar.tsx             # Navigation
│   │   └── Login.tsx               # Login screen
│   ├── context/                    # React Context providers
│   │   ├── AuthContext.tsx         # Session restore/login/logout
│   │   ├── GlobalSearchContext.tsx # Cmd/Ctrl+K search
│   │   ├── SyncContext.tsx         # WebSocket, assistance, online
│   │   └── ToastContext.tsx        # Toasts
│   ├── hooks/                      # Custom hooks
│   ├── services/                   # API clients + business services
│   │   ├── api/                    # Per-domain typed wrappers
│   │   ├── apiService.ts           # Legacy unified client
│   │   ├── cloudSyncService.ts     # Cloud sync
│   │   ├── dataVersionManager.ts   # Conflict detection
│   │   ├── pb.ts                   # PocketBase adapter
│   │   └── webSocketService.ts     # Real-time client
│   ├── store/                      # Zustand stores
│   ├── types/                      # Shared TS types
│   ├── utils/                      # Helpers, logger, safeStorage
│   └── workers/                    # Web workers
├── backend/
│   ├── routes/                     # Express routers
│   ├── shared/                     # DB, auth, rate-limit, audit, LAN signing
│   ├── middleware/                 # auth, csrf, session, validate
│   ├── services/                   # websocket, tunnel, thermal
│   ├── workers/                    # photoWorker, folderWorker
│   ├── container.ts                # DI container
│   ├── server.ts                   # Express bootstrap
│   └── migrations/                 # 48 SQLite migrations
├── electron-main.ts                # Electron main process
├── preload.ts / preload.js         # Secure bridge
├── tests/e2e/                      # 52 Playwright specs
├── tests/a11y/                     # A11y + visual regression
└── tests/unit/                     # Vitest tests

apps/master-cpp/
├── src/
│   ├── core/                       # Config, Logger, Exceptions
│   ├── database/                   # MigrationRunner
│   ├── db/                         # DatabaseManager
│   ├── http/                       # Controllers + QTcpServer/Drogon
│   │   ├── *Controller.cpp         # Auth, Collections, Culling, Faces, Files, IPC, Orders, Pairing, Realtime, Sync, System
│   │   ├── HttpServer.cpp          # Custom QTcpServer (legacy)
│   │   ├── Router.cpp              # Regex routing
│   │   └── Middleware.cpp          # CORS/auth
│   ├── services/                   # Auth, CloudSync, Collection, Fulfillment, ImageProcessor, Ledger, Order, Photo, Queue, Realtime, Sync, VectorIndex
│   ├── utils/                      # FileUtils, JwtHelper, LanSigning, PasswordHash
│   └── workers/                    # Face, Folder, ML, Thumbnail, Watermark, WorkerPool
└── migrations/                     # 57 SQL migrations
```

---

## 3. Screens / Pages / Routes

### 3.1 Frontend Routes (`AppRouter.tsx`)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `MainLayout` | Authenticated shell; view switcher |
| `/audit` | `SystemAudit` | Read-only audit report |
| `*` | `<Navigate to="/" />` | Catch-all |

`MainLayout` uses an in-memory `currentView: View` state rather than URL routes for primary views.

### 3.2 In-App Views (`MainLayout.tsx`)

| View | Permission | Lazy | Description |
|------|------------|------|-------------|
| `Dashboard` | `viewDashboard` | Yes | Operational dashboard |
| `Albums` | `viewAlbums` | Yes | Album grid, import, editor |
| `Orders` | `viewOrders` | No | Order kanban/list, print, lab folder |
| `Photographers` | `viewPhotographers` | Yes | Staff management, payroll |
| `Bookings` | `viewBookings` | Yes | Booking calendar |
| `Clients` | `viewClients` | Yes | Client CRM |
| `Growth` | `viewGrowth` | Yes | Growth analytics |
| `Products` | `viewProducts` | Yes | Products, packs, inventory |
| `LocalResortDashboard` | `viewSettings` | Yes | Resort BI |
| `Settings` | `viewSettings` | Yes | Settings with 16 sub-tabs |

### 3.3 Settings Sub-Tabs

`account | general | system | database | cloud | products | session-types | photos | ai | print | kiosks | watermark | users | permissions | gdpr | help`

### 3.4 Backend API Routes (`backend/routes/index.ts`)

| Prefix | Module | Auth |
|--------|--------|------|
| `/api/auth` | `auth.ts` | Public |
| `/api/collections` | `collections.ts` | Session |
| `/api/system` | `system.ts` | Mixed |
| `/api/files` | `files.ts` | Service-token / session |
| `/api/realtime` | `realtime.ts` | Session |
| `/api/pairing` | `pairing.ts` | LAN-only |
| `/api/session-types` | `sessionTypes.ts` | Session |
| `/api/culling` | `culling.ts` | Session |
| `/api/cloud` | `cloud.ts` | Session |
| `/api/faces` | `faces.ts` | Session |
| `/api/orders` | `orders.ts` | Session |
| `/api/notifications` | `notification.ts` | Session |
| `/api/assistance` | `assistance.ts` | Public (kiosk) |
| `/api/gallery*` | `gallery*.ts` | Public gallery checkout |
| `/api/sync` | `sync.ts` | Session / LAN-signed |
| `/api/analytics` | `analytics.ts` | Session |
| `/api/marketing` | `marketing.ts` | Session |
| `/api/dashboard` | `dashboard.ts` | Session |
| `/api/health` | `health.ts` | Public |
| `/api/export` | `export.ts` | Session |
| `/api/resort-analytics` | `resortAnalytics.ts` | Session |
| `/api/audit` | `audit.ts` | Session |
| `/api/setup` | `setup.ts` | Public first-run |
| `/api/backup` | `backup.ts` | Session |

### 3.5 master-cpp Routes

Two routing layers exist:

1. **Drogon-based** (`main.cpp`): controllers implement `registerRoutes(Router*)`:
   - `CullingController` — `/culling/session`, `/culling/session/:id`, `/culling/submit`, `/culling/results`, `/culling/auto`
   - `FacesController` — `/faces/detect`, `/faces`, `/faces/:id`, `/faces/:id/similar`, `/faces/train`
   - `FilesController` — `/files/upload`, `/files/:id`, `/files/:id/thumbnail`, `/files/process`
   - `PairingController` — `/pairing/initiate`, `/pairing/confirm`, `/pairing/devices`, `/pairing/status`, `/pairing/renew`
2. **Legacy custom QTcpServer** (`HttpServer.cpp` + `Router.cpp`): `AuthController`, `CollectionsController`, `OrdersController`, `SyncController`, `SystemController`.

The C++ tree is in a **transition state**: `main.cpp` boots Drogon, but several controllers still use the custom request/response types.

---

## 4. UI Component Inventory

### 4.1 Major Top-Level Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MainLayout` | `components/MainLayout.tsx` | App shell: sidebar, header, views, toast, search |
| `Sidebar` | `components/Sidebar.tsx` | Navigation with permissions, collapse, AI shortcut |
| `Header` / `DesktopHeader` | `components/Header.tsx`, `common/DesktopHeader.tsx` | Top bars |
| `Login` | `components/Login.tsx` | Session login |
| `Dashboard` | `components/Dashboard.tsx` | Aggregated operational view |
| `Albums` | `components/albums/Albums.tsx` | Album hub |
| `Orders` | `components/Orders.tsx` | Order hub |
| `Photographers` | `components/Photographers.tsx` | Staff hub |
| `SettingsPage` | `components/settings/SettingsPage.tsx` | Settings hub |

### 4.2 Editor2 Subsystem (`components/albums/editor2/`)

| Component | Purpose |
|-----------|---------|
| `AlbumEditor.tsx` | Main editor shell |
| `canvas/EditorCanvas.tsx` | Canvas viewport |
| `canvas/GridOverlay.tsx` | Grid overlays |
| `canvas/RetouchInteractionOverlay.tsx` | Brush/retouch |
| `controls/AdjustTab.tsx`, `CropTab.tsx`, `FilterControls.tsx`, `RetouchTab.tsx`, `AITab.tsx` | Panels |
| `controls/EditorTopBar.tsx`, `SidebarControls.tsx`, `ZoomControls.tsx` | Toolbars |
| `controls/PresetSaveModal.tsx`, `PresetsPanel.tsx` | Presets |
| `viewer/InteractiveViewport.tsx`, `ProgressiveImage.tsx`, `LayerManager.tsx` | Viewport |
| `renderer/PhotoRenderer.tsx` | Render pipeline |
| `workers/renderWorker.ts` | Off-thread worker |
| `store/useEditorStore.ts` | Zustand editor state |
| `utils/CanvasFilterEngine.ts`, `ExportManager.ts`, `PresetManager.ts`, `KeyboardShortcuts.ts` | Utilities |

### 4.3 Common Primitives (`components/common/`)

`Button`, `Card`, `Input`, `Modal`, `FormField`, `Spinner`, `Toast`, `Tooltip`, `Skeleton` family, `LazyImage`, `VirtualGrid`, `VirtualList`, `PageHeader`, `PageTransition`, `ConfirmationModal`, `PasswordModal`, `ReleaseNotesModal`, `ImportProgressModal`, `FileTransferDialog`, `CloudStatusIndicator`, `NetworkStatusIndicator`, `SyncStatusIndicator`, `RealtimeStatus`, `FleetStatusIndicator`, `ThermalMonitor`, `OfflineScreen`, `AccessDenied`, `GlobalSearch`.

### 4.4 Modals (`components/modals/`)

`CategoryEditModal`, `ClientDetailsModal`, `CreateOrderModal`, `DailyResortStatsModal`, `FaceScanModal`, `KioskEditModal`, `OrderEditModal`, `PackEditModal`, `ProductEditModal`, `SessionTypeEditModal`, `TransferCategoryModal`, `UserEditModal`.

### 4.5 Orders Components (`components/orders/`)

`OrdersBoard`, `OrdersList`, `OrdersToolbar`, `OrderCard`, `OrderColumn`, `OrderPrintCard`, `FilterPanel`, `LabPrintFolder`, `OrderManagementView`, `PrintLayout`, `CustomerReceipt`, `SavedOrders`, `ReprocessModal`.

### 4.6 Dashboard Widgets (`components/dashboard/widgets/`)

`AlbumsToProcessWidget`, `CloudHealthWidget`, `DailyObjectivesWidget`, `FleetHealthWidget`, `ProductMixWidget`, `RecentOrdersWidget`, `SalesChartWidget`, `StatsWidget`, `SyncStatusWidget`, `TopAlbumsWidget`, `TopPhotographersWidget`, `TrashRetentionWidget`.

### 4.7 Loading / Empty / Error / Success

- **Loading**: `Spinner`, `Skeleton` family, `EditorSkeleton`, `PhotoThumbnailSkeleton`, `PageTransition`, `SettingsTabLoader`.
- **Empty**: Inline empty-state JSX (e.g., "No Photos Available").
- **Error**: `ErrorBoundary`, `GlobalErrorBoundary`, `FeatureErrorBoundary`, `DashboardErrorBoundary`, `AlbumErrorBoundary`, `OrderErrorBoundary`, `SettingsErrorBoundary`, `AccessDenied`, `OfflineScreen`.
- **Success**: `Toast` context + confirmation toasts.

### 4.8 Keyboard Shortcuts

- Albums/editor2: zoom (`+`/`-`), pan, undo/redo, copy/paste edits, select all, delete.
- `GlobalSearch`: `Cmd/Ctrl+K`.
- Touch admin override: `Ctrl+Shift+Alt+F12`.

### 4.9 Responsive & Dark Mode

- **Dark mode**: `class` strategy; `ThemeContext` + `ThemeToggle`; `dark:bg-slate-900` utilities.
- **Responsive**: Tailwind breakpoints; mobile sidebar overlay; `max-w-[1600px]` content well.
- **Print**: `.no-print` hides chrome during `window.print()`.

### 4.10 ARIA / Focus Notes

- Skip-to-main-content link in `MainLayout`.
- `role="navigation"`, `aria-label` on icon buttons.
- Modal focus trapping in `Modal.tsx`.
- Coverage inconsistent across legacy components.

---

## 5. Features & User Journeys

### 5.1 Authentication & Onboarding
1. Electron spawns backend on `:8090` → polls `/api/health`.
2. `AuthContext` restores session via CSRF handshake + `/api/auth/me`; falls back to `safeStorage`.
3. `Login.tsx` establishes Express session.
4. First-run `SetupWizard.tsx` + `/api/setup` configure destination/admin/license.

### 5.2 Dashboard Journey
- `MainLayout` fetches orders/users/albums in parallel.
- Widgets render KPIs, fleet health, cloud sync, top photographers, albums-to-process, trash retention.
- Auto-refresh respects tab visibility.

### 5.3 Album & Photo Pipeline
1. **Import**: `ImportAlbumModal` / tether mode.
2. **Processing**: `backend/workers/photoWorker.ts` uses `sharp` to generate variants and extract EXIF.
3. **Organization**: albums assigned to photographers, rooms, categories.
4. **Editing**: `editor2` non-destructive adjustments, presets, export.
5. **Publishing**: albums marked `kioskReady` sync to paired Touch kiosks.

### 5.4 Order & Fulfillment Journey
- `OrdersBoard` kanban (`Pending → Processing → Ready → Completed`).
- `CreateOrderModal` / `OrderEditModal` build carts.
- `PrintLayout` + `CustomerReceipt` use `window.print()`.
- `LabPrintFolder` generates lab-ready folders.
- `OrderIntegrity.ts` checksums Touch orders.

### 5.5 Kiosk Pairing Journey
1. Master generates QR payload `{deskId, ip, port, pairingToken, timestamp}`.
2. Touch scans QR → `/api/pairing/scan-qr` (Touch) → `/api/pairing/validate` (Master).
3. Master persists token, creates `signingSecret`.
4. LAN requests carry `x-kiosk-id`, `x-timestamp`, `x-signature` validated by `lanSigningMiddleware.ts`.

### 5.6 AI & Cloud Features
- **AI Culling**: `AICullingDashboard.tsx` + `/api/culling` + TensorFlow.js/face-api.
- **Face Recognition**: enrollment, indexing queue, vector search.
- **Cloud Sync**: `cloudSyncService.ts`, `dataVersionManager.ts`, tunnel manager.
- **AI Ideas**: `AIIdeasModal.tsx` (requires online).

### 5.7 Assistance & Real-Time
- Touch sends `ASSISTANCE_REQUEST` WebSocket message.
- `SyncContext` polls `/api/assistance` and renders `AssistanceNotificationBar`.

### 5.8 Offline / Edge Cases
- Master frontend falls back to `safeStorage` user on network failure.
- Backend is local-first; offline operation is primarily a Touch concern.

---

## 6. State Management

| Layer | Technology | Notes |
|-------|------------|-------|
| **Server state** | Custom service layer (`services/api/*`, `apiService.ts`) | Imperative fetch wrappers; React Query used sparingly. |
| **React Query** | `@tanstack/react-query` v5 | In `useAlbums.ts`, `useOrders.ts`, `usePhotos.ts`, `usePhotographers.ts`, `useDestinations.ts`, `Dashboard.tsx`. |
| **Global UI state** | React Context | `AuthContext`, `SyncContext`, `ToastContext`, `GlobalSearchContext`, `CurrencyContext`, `ThemeContext`. |
| **Local editor state** | Zustand v5 | `components/albums/editor2/store/useEditorStore.ts`. |
| **Connection state** | Zustand | `store/connectionStore.ts`. |
| **Persistence** | `localStorage` + `safeStorage.ts` | Session, sidebar collapse, cart, kiosk settings. |
| **Frontend DB** | Dexie v4 | Dependency present; heavier use in Touch. |
| **Backend state** | `better-sqlite3-multiple-ciphers` | Single-file encrypted SQLite. |
| **Real-time** | WebSocket (`ws`) | `backend/services/websocket.ts` + `src/services/webSocketService.ts`. |

---

## 7. API / IPC / Backend

### 7.1 Express Middleware Chain (`backend/server.ts`)

1. `helmet` with CSP (dev allows `unsafe-inline`/`unsafe-eval` and localhost wildcard).
2. `cookieParser()`.
3. `createSessionMiddleware()` (express-session, SQLite store).
4. `csrfMiddleware`.
5. Public API whitelist for `/auth`, `/health`, `/gallery*`, `/pairing`, `/assistance`, `/notification`.
6. `authMiddleware` (session + JWT Bearer + service token for `/api/files`).
7. Strict origin CORS.
8. Rate limiters (`rateLimiter`, `userRateLimiter`).
9. Mutation audit middleware.
10. Request logging.
11. Body parser (50 MB JSON; skips multipart).

### 7.2 IPC Channels (`electron-main.ts` / `preload.ts`)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `kiosk:unlock` | invoke | Admin PIN unlock with brute-force lockout |
| `kiosk:lock` | invoke | Enter kiosk lock |
| `dialog:openDirectory` | invoke | Native folder picker |
| `dialog:openFile` | invoke | Native file picker |
| `dialog:saveFile` | invoke | Native save picker |
| `printer:get-list` | invoke | Enumerate printers |
| `printer:print` | invoke | Print order/receipt |
| `updater:*` | invoke | Auto-updater check/download/install/status |
| `log:error` | invoke | Forward renderer logs to main |

Legacy `window.electron.ipcRenderer.invoke(channel, ...)` shape is still supported.

### 7.3 WebSocket Messages

Backend `initWebSocketServer` in `backend/services/websocket.ts`; client in `src/services/webSocketService.ts`.

Common message types:
- `DATA_UPDATE` / data-version broadcasts
- `ASSISTANCE_REQUEST` from Touch kiosks
- `OFFLINE_ORDER` queueing
- `KIOSK_STATUS` / fleet heartbeat

### 7.4 mDNS / LAN Discovery

- Master advertises via `bonjour-service` (`backend/server.ts`).
- Touch discovers Masters via mDNS (`touch/backend/services/mdnsDiscovery.ts`).

### 7.5 LAN Signing / HMAC

- `backend/shared/lanSigningMiddleware.ts` enforces private-IP-only + HMAC-SHA256.
- Payload canonicalized as sorted JSON; signature = `HMAC-SHA256(signingSecret, "kioskId:timestamp:method:path:body")`.
- 5-minute replay window via `x-timestamp`.

### 7.6 master-cpp Backend

- **Framework**: Drogon v6.0.0 target, but code still contains a legacy custom QTcpServer/Router layer.
- **Concurrency**: Drogon thread pool; dedicated C++ worker pools for faces, thumbnails, watermarks, folder sync, ML.
- **Services**: `AuthService`, `CloudSyncService`, `CollectionService`, `FulfillmentService`, `ImageProcessor`, `LedgerService`, `OrderService`, `PhotoService`, `QueueProcessor`, `RealtimeService`, `SyncService`, `VectorIndexService`.
- **Utilities**: `LanSigning.cpp`, `JwtHelper.cpp`, `PasswordHash.cpp`, `FileUtils.cpp`.

---

## 8. Database

### 8.1 Engine
- `better-sqlite3-multiple-ciphers` (Node backend) with SQLCipher encryption (`PRAGMA key`).
- `apps/master-cpp` targets SQLCipher-enabled SQLite3 via Drogon.

### 8.2 Core Schema (`001_initial_schema.sql`)

| Table | Purpose |
|-------|---------|
| `users` | Photographers/admins (hashed password, role, destination, payroll) |
| `albums` | Album metadata (photographer, room, status, categories) |
| `photos` | Photo records (album FK, URL/path, edits JSON) |
| `orders` | Orders (status, total, items JSON, photographer, destination) |
| `products` | Product catalog |
| `kiosks` | Paired kiosk records + signing secrets/settings |
| `settings` | Key-value JSON store |
| `destinations` | Licensed resort/venue records + feature flags |

### 8.3 Notable Master Migrations

- `003_add_kiosk_last_seen`, `004_add_kiosk_folder_paths`, `014_add_kiosk_signing_secret`, `019_add_kiosk_signing_secret`, `042_add_pairings_table`, `043_add_audit_tables`, `044_user_sessions`, `045_gdpr_compliance`.
- `025_photo_adjustments_stack`, `026_photo_quality_flags`, `033_photo_presets`.
- `017_sync_sequences_and_vector_clocks`, `035_sync_resilience_standardization`, `040_persistent_write_queue`.
- `055_add_fulfillment_queue_index`, `056_resort_analytics_indices`.

### 8.4 master-cpp Migrations

57 files including `001_initial_schema.sql`, `018_add_face_recognition.sql`, `035_add_order_rfid.sql`, `055_add_pairing_tokens.sql`, `057_resort_bi_metrics.sql`, `058_add_session_timing.sql`, `059/060_performance_indexes`. The Node and C++ migration histories have diverged; master-cpp has duplicate `001_*.sql` files and gaps.

---

## 9. Security Surface

| Concern | Implementation | Notes |
|---------|----------------|-------|
| **Auth** | Express session + JWT Bearer + bcrypt | `authMiddleware.ts`; session cookie + optional Bearer |
| **CSRF** | `csrfMiddleware.ts` + `backend/shared/csrf.ts` | CSRF token required for mutations |
| **Rate limiting** | `express-rate-limit` | Default 100/min, user 200/min, strict 5/5min; audit-logged |
| **CSP** | `helmet` | Dev is permissive (`localhost:*`, `ws://*:*`); prod restricts to self + `*.clickflash.photo` |
| **CORS** | Strict origin whitelist | `config.ALLOWED_ORIGINS` |
| **Pairing** | QR token + private-IP restriction + HMAC signing | Tokens single-use, 5-min expiry; replay protection |
| **Path traversal** | `validateImageMagicNumber.ts`, path normalization | Magic-number checks on uploads |
| **Audit logging** | `AuditLogger` + `mutationAuditMiddleware` | Logs auth failures, rate limits, mutations |
| **Input validation** | Zod schemas in `backend/schemas/` + `middleware/validate.ts` | Used on pairing, auth, domain routes |
| **Service token** | `SERVICE_SECRET` for `/api/files` | Replaces old IP-based `::1` bypass |
| **Admin PIN** | Electron main PIN with 5-attempt lockout | `ADMIN_SHORTCUT` + `kiosk:unlock` IPC |
| **Encryption** | SQLCipher PRAGMA key | Database-at-rest encryption |

### Gaps / Risks
- CSP `connectSrc` in dev allows `ws://*:*` and `http://*:*`, which is very broad.
- `imgSrc` allows `http:` and `https:` anywhere.
- C++ backend has two concurrent HTTP frameworks and incomplete middleware wiring in the custom router.

---

## 10. Testing

### 10.1 Frameworks
- **Unit/Integration**: Vitest v3.2 with jsdom, `@testing-library/react`, MSW mocks.
- **E2E**: Playwright v1.58 with Chromium + Electron project.
- **A11y**: `@axe-core/playwright`.

### 10.2 Master Test Inventory

| Suite | Count | Location |
|-------|-------|----------|
| Frontend unit/hook tests | 16 | `src/**/*.test.ts(x)` |
| Backend tests | 14 | `backend/**/*.test.ts`, `backend/tests/*.ts` |
| E2E specs | 52 | `tests/e2e/*.spec.ts` |
| Accessibility / Visual | 2 | `tests/a11y/*.spec.ts` |

Notable E2E files: `auth.spec.ts`, `albums.spec.ts`, `orders-full.spec.ts`, `photo-editing.spec.ts`, `editor-*.spec.ts`, `checkout-flow.spec.ts`, `kiosk-security.spec.ts`, `offline.spec.ts`, `memory-leak.spec.ts`, `performance.spec.ts`, `desktop-hardening.spec.ts`.

### 10.3 master-cpp Tests
- `CMakeLists.txt` enables `BUILD_TESTS` and `add_subdirectory(tests)`, but `apps/master-cpp/tests/` currently contains **0 files**.

### 10.4 Gaps
- No backend contract/API unit tests for most route modules.
- Very few unit tests for editor2 state and canvas engine.
- C++ backend is untested.
- E2E suite may be brittle because primary views use in-memory state rather than URL routes.

---

## 11. Architecture, Performance, Design System

### 11.1 Patterns
- **Local-first desktop app**: Electron spawns local Express server; UI loads from `http://localhost:8090`.
- **Thin routes, fat services**: Routes delegate to services in `backend/shared/` and `backend/container.ts`.
- **Feature-based folder structure** under `components/`.
- **Lazy loading** with `lazyWithRetry` utility for heavy views.
- **Error boundaries per feature**.
- **Permission gating**: `usePermissions` combines static role map with dynamic backend permissions.

### 11.2 Shared UI / Design System
- `packages/ui/` exports `Button`, `Card`, `Input`, `Modal`, `PhotoCard`, `Spinner`, `Toast`.
- Both Master and Touch Tailwind configs reference `../../packages/ui/src/**/*`.
- Master also maintains a local `components/ui/` mirror with nested `node_modules`.
- Design tokens: CSS variables for `--border`, `--background`, `--primary`, `--danger`, `--muted`, `--radius`; fonts `Inter`/`Outfit`; dark mode `class`.

### 11.3 Image Processing Workers
- `backend/workers/photoWorker.ts`: `sharp`-based worker thread; thumbnails/previews/tiny/watermarked images; EXIF extraction; magic-number validation.
- `backend/workers/folderWorker.ts`: Watches/import processes folders.
- C++ workers: `FaceWorker`, `FolderWorker`, `MLWorker`, `ThumbnailWorker`, `WatermarkWorker`, `WorkerPool`.

### 11.4 Memory & Performance
- Backend memory monitor logs warnings at 4 GB heap, errors at 6 GB; Electron `--max-old-space-size` set to 25% of RAM up to 4 GB.
- `VirtualGrid`/`VirtualList` for large photo lists.
- `sharp.cache(false)` to avoid Windows EBUSY file locks.
- `dataVersionManager` prevents thundering-refresh with throttling and conflict resolution.
- `BackgroundJobRunner` runs periodic sync/cleanup tasks.

---

## 12. Concrete Improvement Proposals

| Priority | Proposal | Rationale |
|----------|----------|-----------|
| **P0** | **Unify the C++ backend transport** | Drogon `main.cpp` and legacy custom `HttpServer.cpp`/`Router.cpp` are both present but not integrated. Pick one framework, remove dead code, register controllers consistently. |
| **P0** | **Add master-cpp tests** | `tests/` directory is empty. Add Drogon integration tests and service unit tests before production use. |
| **P1** | **Adopt React Query consistently** | Many components still fetch imperatively via `apiService`. Consolidate on `@tanstack/react-query` for caching and optimistic updates. |
| **P1** | **Harden development CSP** | Replace `ws://*:*` / `http://*:*` in dev CSP with explicit localhost/dev ports. |
| **P1** | **URL-based routing for views** | `MainLayout` uses in-memory `currentView`. Migrating to `react-router-dom` sub-routes enables deep-linking and E2E stability. |
| **P2** | **Consolidate duplicate UI packages** | `src/components/ui/` duplicates `packages/ui/` and has nested `node_modules`. Remove or make a proper workspace symlink. |
| **P2** | **Standardize migration numbering** | master-cpp has duplicate `001_*.sql` and gaps; master backend jumps to 055/056 after 045. Renumber sequentially and add a registry. |
| **P2** | **Improve path-traversal coverage** | Audit `files.ts`, `folderWorker.ts`, and C++ `FileUtils.cpp`; add canonicalization + allowlist tests. |
| **P2** | **Expand backend unit tests** | Only `pairing.test.ts`, `galleryCheckout.test.ts`, `photoProcessor.test.ts`, and integration tests exist. Add per-route `supertest` tests. |
| **P3** | **Extract editor2 into a package** | Large, self-contained; moving to `packages/editor` improves build/cache performance. |
| **P3** | **Add structured logging correlation** | Pass request/correlation IDs through context for easier tracing. |
| **P3** | **Reduce console.log usage** | Some handlers still use `console.log`/`console.error`; route all through `@clickflash/logger`. |

---

*End of Master Portal report.*
