# ClickFlash Touch Kiosk — Forensic Architecture Report

> Generated: 2026-06-22  
> Scope: `apps/touch/` (Electron + React 19 customer-facing kiosk + Express backend).  
> Method: Read-only code exploration (Glob/Grep/ReadFile/Shell).

---

## 1. Overview & Stats

| Item | Value |
|------|-------|
| **App name** | `clickflash-touch` v4.2.0 |
| **Stack** | Electron 39, React 19.2, TypeScript 5.9, Vite 7.3, Tailwind CSS 3.4, Express 5.2, better-sqlite3-multiple-ciphers 12.8 |
| **Ports** | Dev Vite `5174`; backend `8091`; master backend `8090`. Electron main uses `FRONTEND_PORT=8001`, `TOUCH_BACKEND_PORT=8091`. |
| **Build tools** | `vite`, `esbuild` (backend bundle), `tsc` (electron), `electron-builder`, `pnpm`/`npm`. |
| **Frontend source** | 43 `.tsx`, 55 `.ts` files under `apps/touch/src/`. |
| **Backend source** | 37 `.ts` files under `apps/touch/backend/`. |
| **Tests** | 6 unit tests in `src/`, 0 backend unit tests, 2 Playwright E2E specs in `tests/e2e/`, 1 spec in `e2e/`. |
| **Migrations** | 15 SQL migrations in `backend/shared/migrations/`. |

### Key Entry Points
- **Renderer**: `apps/touch/src/main.tsx` → `App.tsx` → `TouchPortal` → `KioskProvider`.
- **Electron main**: `apps/touch/main.ts` (forks `dist/backend/server.js`).
- **Backend**: `apps/touch/backend/server.ts`.

---

## 2. Folder/File Tree (Depth 3–4)

```
apps/touch/
├── src/
│   ├── components/
│   │   ├── common/                 # Button, Card, Input, Modal, Spinner, Toast, OfflineScreen, etc.
│   │   ├── error-boundaries/       # Feature/Global error boundaries
│   │   ├── touch/                  # Kiosk screens
│   │   │   ├── photo-selection/    # CategorySidebar, PhotoCard, SelectionHeader
│   │   │   ├── settings/           # Access, Connection, Identity, Security settings
│   │   │   ├── welcome/            # WelcomeButton, useRFIDScanner
│   │   │   ├── CheckoutScreen.tsx
│   │   │   ├── ConnectionStatusIndicator.tsx
│   │   │   ├── FaceSearchModal.tsx
│   │   │   ├── KioskSettingsModal.tsx
│   │   │   ├── NumericKeypad.tsx
│   │   │   ├── OnScreenKeyboard.tsx
│   │   │   ├── OrderConfigurationScreen.tsx
│   │   │   ├── PairingCodeModal.tsx
│   │   │   ├── PasswordModal.tsx
│   │   │   ├── PhotoPreviewScreen.tsx
│   │   │   ├── PhotoSelectionScreen.tsx
│   │   │   ├── RoomNumberModal.tsx
│   │   │   ├── SelectionCartBar.tsx
│   │   │   ├── ThankYouScreen.tsx
│   │   │   ├── TouchConnectionSetup.tsx
│   │   │   └── WelcomeScreen.tsx
│   │   ├── CurrencyContext.tsx
│   │   ├── DeviceSetup.tsx         # Initial kiosk mode/IP setup
│   │   ├── ThemeContext.tsx
│   │   └── ThemeToggle.tsx
│   ├── config/
│   │   └── kioskConfig.ts          # Default kiosk configuration
│   ├── constants.ts                # App constants (legacy kiosk ID, master port)
│   ├── constants/
│   │   └── timing.ts               # Idle / timeout values
│   ├── context/
│   │   └── KioskContext.tsx        # Kiosk state, idle timer, album hydration
│   ├── hooks/                      # useAlbums, useOrders, usePhotographers, useDebounce, etc.
│   ├── services/
│   │   ├── api/                    # authService, core, orderService, photoService, systemService
│   │   ├── apiService.ts           # Legacy unified client
│   │   ├── brandingService.ts
│   │   ├── cloudApiService.ts
│   │   ├── connectivityService.ts
│   │   ├── db.ts                   # Dexie IndexedDB schema
│   │   ├── faceRecognitionService.ts
│   │   ├── localSearchService.ts
│   │   ├── offlineAnalytics.ts
│   │   ├── OfflineQueue.ts         # v1 offline mutation queue
│   │   ├── OfflineQueueV2.ts       # v2 offline mutation queue
│   │   ├── offlineStorage.ts       # IndexedDB cache helpers
│   │   ├── offlineStressTest.ts
│   │   ├── orderService.ts
│   │   ├── pb.ts                   # PocketBase client
│   │   ├── pbTypes.ts
│   │   ├── performanceMonitor.ts
│   │   ├── rfidService.ts
│   │   ├── storageMonitor.ts
│   │   ├── syncCheckpointService.ts
│   │   ├── syncService.ts          # Master sync orchestrator
│   │   └── webSocketService.ts     # Real-time client
│   ├── styles/                     # base.css
│   ├── types/                      # TS types + electron.d.ts
│   ├── utils/                      # imageUtils, logger, validation
│   ├── App.tsx                     # Top-level view state machine
│   ├── main.tsx                    # Renderer entry + providers
│   └── permissions.ts              # Kiosk permission map
├── backend/
│   ├── routes/                     # auth, collections, faces, files, orderExport, orders, pairing, realtime, sync, system
│   ├── shared/                     # DB, auth, audit, logger, rate-limit, validation, photoProcessor
│   ├── services/                   # albumService, mdnsDiscovery, realtimeService, VectorIndexService, FaceIndexingWorker
│   ├── server.ts                   # Express bootstrap
│   └── migrations/                 # 15 SQLite migrations
├── main.ts                         # Electron main (secure kiosk mode)
├── preload.ts / preload.js         # Secure bridge
├── public/                         # favicon, logos, manifest, service-worker
├── tests/e2e/                      # Kiosk flow specs
└── e2e/                            # Additional Playwright spec
```

---

## 3. Screens / Pages / Routes

### 3.1 Frontend "Routes"

Touch does **not** use `react-router-dom`. `App.tsx` implements a view state machine:

| View | Component | Trigger |
|------|-----------|---------|
| Device setup | `DeviceSetup` | `isConfigRequired === true` |
| Welcome | `WelcomeScreen` | Default / idle reset |
| Photo grid | `PhotoSelectionScreen` | Browse photos / room number / RFID / face login |
| Photo detail | `PhotoPreviewScreen` | Photo click |
| Order config | `OrderConfigurationScreen` | Cart / "View Order" |

### 3.2 Backend API Routes (`backend/server.ts`)

Mounted under `/api`:

| Prefix | Module | Notes |
|--------|--------|-------|
| `/api/auth` | `auth.ts` | Login, session, password change |
| `/api/collections` | `collections.ts` | Generic CRUD proxy |
| `/api/sync` | `sync.ts` | Pull/push mutations with Master |
| `/api/files` | `files.ts` | File upload/download |
| `/api/orders` | `orders.ts` | Local orders + export |
| `/api/order-export` | `orderExport.ts` | Lab folder generation |
| `/api/faces` | `faces.ts` | Face detection/indexing |
| `/api/realtime` | `realtime.ts` | WebSocket upgrade endpoint |
| `/api/system` | `system.ts` | Health, info, settings |
| `/api/pairing` | `pairing.ts` | mDNS discovery, QR scan, complete pairing |

### 3.3 Master Communication

- Touch backend pairs to Master backend (`:8090`) via QR/mDNS.
- Sync endpoints pull albums/photos/products/packs and push offline orders.
- LAN-signed requests use `x-kiosk-id`, `x-timestamp`, `x-signature`.

---

## 4. UI Component Inventory

### 4.1 Kiosk Screens (`components/touch/`)

| Component | Purpose |
|-----------|---------|
| `WelcomeScreen.tsx` | Attractor screen; room/RFID/face entry; help request; settings/exit auth |
| `PhotoSelectionScreen.tsx` | Virtualized photo grid; category filter; face-search results; select-all |
| `PhotoPreviewScreen.tsx` | Single photo detail; add-to-cart |
| `OrderConfigurationScreen.tsx` | Cart review; product/pack selection; checkout |
| `CheckoutScreen.tsx` | Payment / order confirmation |
| `ThankYouScreen.tsx` | Post-checkout thank-you |
| `KioskSettingsModal.tsx` | Kiosk configuration (connection, identity, security, access) |
| `PairingCodeModal.tsx` | Manual pairing code entry |
| `RoomNumberModal.tsx` | Room number input |
| `FaceSearchModal.tsx` | Capture selfie for face-matching |
| `PasswordModal.tsx` | Admin password challenge |
| `NumericKeypad.tsx` | Touch numeric pad |
| `OnScreenKeyboard.tsx` | Touch text keyboard |
| `SelectionCartBar.tsx` | Floating cart summary |
| `ConnectionStatusIndicator.tsx` | Online/disconnected/offline badge |
| `TouchConnectionSetup.tsx` | Manual IP / master discovery UI |

### 4.2 Common Primitives (`components/common/`)

`Button`, `Card`, `Input`, `Modal`, `Spinner`, `Toast`, `OfflineScreen`, `SyncStatusIndicator`, `VirtualGrid`, `ErrorBoundary`, `GlobalErrorBoundary`.

### 4.3 Settings Sub-Panels (`components/touch/settings/`)

`AccessSettings.tsx`, `ConnectionSettings.tsx`, `IdentitySettings.tsx`, `SecuritySettings.tsx`.

### 4.4 Loading / Empty / Error / Success States

- **Loading**: `Spinner` full-screen overlays, `VirtualGrid` placeholders.
- **Empty**: "No Photos Available" screen with room-specific messaging; empty cart warnings.
- **Error**: `ErrorBoundary`, `GlobalErrorBoundary`, `FeatureErrorBoundary`, connection error banners.
- **Success**: `Toast` messages (`showToast` prop), `ThankYouScreen`.

### 4.5 Keyboard Shortcuts

- Admin override: `Ctrl+Shift+Alt+F12` triggers `window.close()` / `window.electron.exitKiosk()`.
- On-screen keyboard and numeric keypad replace physical keyboard.
- RFID tap is handled via `welcome/useRFIDScanner.ts`.

### 4.6 Responsive & Dark Mode

- **Dark mode**: `class` strategy; `ThemeContext` + `ThemeToggle`; `dark:bg-slate-900` utilities.
- **Responsive**: Full-screen kiosk layout; `h-screen w-screen`; viewport locked to 1920x1080 in E2E.
- **Touch**: Large buttons, `select-none`, `backdrop-blur`, hover states mapped to active/scale.

### 4.7 ARIA / Focus Notes

- `aria-label` on icon-only buttons (settings, fullscreen, help).
- Modal focus managed in `Modal.tsx`.
- Skip links not implemented (kiosk is full-screen single-user).
- Context menus disabled globally (`e.preventDefault()` on `contextmenu`).

---

## 5. Features & User Journeys

### 5.1 Customer Journey
1. **Attract**: `WelcomeScreen` shows branding, welcome message, connection banner.
2. **Identify**: Customer enters room number, taps RFID, or uses face login/search.
3. **Browse**: `PhotoSelectionScreen` displays filtered albums/photos by category or face match.
4. **Select**: Tap photos to open `PhotoPreviewScreen`; add to cart.
5. **Configure order**: `OrderConfigurationScreen` selects products/packs/quantities.
6. **Checkout**: `CheckoutScreen` collects customer details; order saved locally and queued for Master sync.
7. **Thank you**: `ThankYouScreen`; idle timer resets to welcome after timeout.

### 5.2 Staff / Admin Journeys
- **Pairing**: Staff opens `KioskSettingsModal` → connection settings; manual IP or QR scan to pair with Master.
- **Exit kiosk**: `PasswordModal` challenges admin password / `window.electron.exitKiosk()`.
- **Settings**: Access, connection, identity, security panels (password, auto-lock, idle timeout, feature toggles).

### 5.3 Offline Support
- `Dexie` IndexedDB caches albums, photos, products, packs, orders, conflicts.
- `OfflineQueue` / `OfflineQueueV2` queue mutations while disconnected.
- `syncService.ts` reconciles pending orders when Master comes back online.
- `offlineStorage.ts` records conflicts (`saveConflict`) for manual resolution.

### 5.4 Face Recognition
- `faceRecognitionService.ts` uses `@vladmandic/face-api` to detect faces and search local/remote index.
- `FaceSearchModal.tsx` captures selfie; results filtered by room/album.
- Touch backend `faces.ts` + `FaceIndexingWorker` / `VectorIndexService` handle local indexing.

### 5.5 RFID
- `useRFIDScanner.ts` listens for USB RFID reader input (keyboard-emulation) and maps RFID to room/album.

### 5.6 Real-Time
- `webSocketService.ts` connects to Master/Touch backend for `ASSISTANCE_REQUEST`, data updates, order status.

### 5.7 Photo Pipeline
- Albums/photos pulled from Master via sync; stored as blobs or URLs in IndexedDB.
- `KioskContext.hydrateKioskAlbum` converts Blob storage to object URLs.
- Local `photoProcessor.ts` generates thumbnails for uploaded/taken images.

---

## 6. State Management

| Layer | Technology | Notes |
|-------|------------|-------|
| **Global kiosk state** | React Context | `KioskContext.tsx` — kioskId, idle, albums, products, packs, connection status. |
| **View state** | `useState` in `App.tsx` | `touchView`, `activePhoto`, `activeAlbum`, `roomFilter`, `cart`. |
| **Cart persistence** | `localStorage` | `touch_cart` JSON saved/restored on mount. |
| **Settings persistence** | `localStorage` | `kioskSettingsV2`, `connectionSettings`. |
| **Offline cache** | Dexie / IndexedDB | `db.ts` defines `albums`, `photos`, `orders`, `conflicts`, `syncCheckpoints`. |
| **Server state** | Custom hooks | `useAlbums.ts`, `useOrders.ts`, `usePhotographers.ts` wrap sync/REST calls. |
| **React Query** | `@tanstack/react-query` v5 | Dependency present; used in `main.tsx` provider but less dominant than custom hooks. |
| **Real-time** | WebSocket client | `webSocketService.ts`. |

---

## 7. API / IPC / Backend

### 7.1 Express Middleware Chain (`backend/server.ts`)

1. `helmet` with kiosk CSP.
2. `cors()` from master shared middleware.
3. `cookieParser()`.
4. `createSessionMiddleware()` (shared with Master).
5. `csrfMiddleware` (shared with Master).
6. `rateLimiter` (`backend/shared/rateLimiter.ts`).
7. Body parsing (JSON + multipart-aware).
8. Route mounting.

### 7.2 Network Isolation (Electron main)

`main.ts` registers `onBeforeRequest` to block any request not matching:
- Hosts: `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`.
- Ports: `8000, 8001, 8090, 8091, 5173, 80, 443, 0`.
- Strips `Referer` headers.
- Enforces a restrictive CSP.

### 7.3 IPC Channels (`main.ts` / `preload.ts`)

| Channel | Purpose |
|---------|---------|
| `exit-kiosk` | Exit kiosk mode after password check |
| `enter-kiosk` | Enter kiosk mode |
| `kiosk:lock` | Lock screen |
| `kiosk:unlock` | Unlock with PIN (5-attempt lockout) |
| `get-app-version` | App version |
| `restart-app` | Restart application |
| `getPrinters` / `print` | Printer enumeration and silent print |
| `updater:*` | Auto-updater lifecycle |

### 7.4 Pairing & Sync

- `backend/routes/pairing.ts`: mDNS discovery, QR scan, complete pairing with Master.
- `backend/services/mdnsDiscovery.ts`: discovers Master services on LAN.
- `backend/routes/sync.ts`: pulls mutations from Master and pushes offline orders.
- `syncService.ts`: orchestrates periodic sync, conflict handling, and offline queue flushing.

### 7.5 LAN Signing

- Shared HMAC logic imported from Master (`master/backend/middleware/csrf`, `master/backend/middleware/session`).
- Touch signs outbound requests to Master with `x-kiosk-id`, `x-timestamp`, `x-signature`.

---

## 8. Database

### 8.1 Engine
- `better-sqlite3-multiple-ciphers` with SQLCipher encryption.
- Default DB: `pb_data/touch.db`.
- Directories created on boot: `uploads`, `backup`, `logs`, `audit_logs`, `orders`.

### 8.2 Core Schema (`001_initial_schema.sql`)

| Table | Purpose |
|-------|---------|
| `users` | Staff users (photographers/admins) |
| `albums` | Album metadata |
| `photos` | Photo records |
| `orders` | Local orders (includes `phone`, `source`, `albumId`, `roomNumber`) |
| `products` | Product catalog |
| `kiosks` | This kiosk record |
| `settings` | Key-value JSON store |
| `destinations` | Licensed destinations + features |

### 8.3 Notable Migrations

- `005_add_packs_and_bookings.sql`, `006_add_order_source.sql`
- `007_add_touch_integration_settings.sql`, `008_add_password_change_flag.sql`
- `009_add_kiosk_ready.sql`, `010_add_kiosk_sessions.sql`
- `011_add_face_recognition.sql`, `012_add_kiosk_sessions_lastSeen.sql`
- `013_add_performance_indexes.sql`, `014_harmonize_photos_schema.sql`

### 8.4 IndexedDB (Dexie)

Defined in `services/db.ts`: `albums`, `photos`, `orders`, `conflicts`, `syncCheckpoints`. Used by `offlineStorage.ts` for offline browsing and order queuing.

---

## 9. Security Surface

| Concern | Implementation | Notes |
|---------|----------------|-------|
| **Kiosk lockdown** | Electron kiosk mode + fullscreen + `onBeforeRequest` network isolation | Blocks external hosts and non-local ports |
| **Auth** | Express session + bcrypt password hashes | `backend/shared/auth.ts` |
| **CSRF** | Shared `csrfMiddleware` from Master | Required for mutations |
| **Rate limiting** | `express-rate-limit` | `backend/shared/rateLimiter.ts` |
| **Pairing** | QR token + private-IP + HMAC signing | Same mechanism as Master |
| **Exit protection** | `exit-kiosk` IPC password challenge + 5-attempt PIN lockout | `main.ts` |
| **CSP** | Strict in Electron main + helmet | `default-src 'self'`, `frame-src 'none'`, `object-src 'none'` |
| **Input validation** | Zod schemas + `backend/shared/validation.ts` | Login, request validation |
| **Audit logging** | `AuditLogger` class | Logs mutations to `pb_data/audit_logs/` |

### Gaps / Risks
- `App.tsx` uses `console.log('Admin Override Triggered')` and tries `window.close()` before checking Electron bridge — should route through logger and IPC.
- `KioskSettingsModal` stores/uses passwords; ensure constant-time comparison and no logging.
- Network isolation regex for private IPs can be bypassed by DNS rebinding if host resolves to private IP after initial check (Electron's `onBeforeRequest` sees resolved IP but hostname check is string-based).

---

## 10. Testing

### 10.1 Frameworks
- **Unit**: Vitest v3.2 with jsdom, `@testing-library/react`.
- **E2E**: Playwright v1.58 with Chromium in `--kiosk --fullscreen` mode.

### 10.2 Touch Test Inventory

| Suite | Count | Location |
|-------|-------|----------|
| Frontend unit tests | 6 | `src/**/*.test.ts` |
| Backend unit tests | 0 | — |
| E2E specs | 2 | `tests/e2e/*.spec.ts` |
| Legacy E2E | 1 | `e2e/touch-kiosk.test.ts` |

### 10.3 Gaps
- No backend unit tests for routes or sync logic.
- Very few component tests for the main kiosk screens.
- No offline/queue stress tests in CI (though `offlineStressTest.ts` exists as a manual script).
- No visual regression coverage for dark mode / branding variants.

---

## 11. Architecture, Performance, Design System

### 11.1 Patterns
- **Local-first kiosk**: Electron spawns local backend; Touch operates even when Master is unreachable.
- **View state machine**: `App.tsx` switches screens instead of URL routes.
- **Providers**: `KioskProvider`, `ThemeProvider`, `CurrencyProvider`, `ToastProvider`.
- **Error boundaries**: per-screen `ErrorBoundary` wrappers in `App.tsx`.

### 11.2 Shared UI / Design System
- Uses same `packages/ui/` primitives as Master.
- Tailwind config extends color tokens (`primary`, `danger`, `muted`, etc.) and adds kiosk animations (`pulse-slow`, `float`, `fade-in-down`).
- Font: `Outfit`.

### 11.3 Offline & Sync Architecture
- `syncService.ts` pulls down album/photo/product/pack data and persists to Dexie.
- `OfflineQueue` / `OfflineQueueV2` stores pending order mutations.
- `syncCheckpointService.ts` tracks last-sync timestamps to enable incremental sync.
- `storageMonitor.ts` watches IndexedDB / disk usage.

### 11.4 Performance
- `VirtualGrid` used for large photo grids.
- `useDebounce.ts` for RFID/keyboard input.
- Idle timer resets on any activity; context menu disabled to prevent right-click abuse.
- Blob URL cleanup in `KioskContext.hydrateKioskAlbum`.

---

## 12. Concrete Improvement Proposals

| Priority | Proposal | Rationale |
|----------|----------|-----------|
| **P0** | **Add backend unit tests** | `touch/backend` has 0 tests. Add route tests (pairing, sync, orders, files) with in-memory SQLite and mocked Master. |
| **P0** | **Consolidate OfflineQueue v1/v2** | Both `OfflineQueue.ts` and `OfflineQueueV2.ts` exist. Pick one, migrate callers, remove the other. |
| **P1** | **Replace `console.log` with logger** | `App.tsx` admin override and several error handlers still log to console. Use `@clickflash/logger` everywhere. |
| **P1** | **URL-based routing** | Like Master, Touch uses in-memory view state. Sub-routes (`/welcome`, `/photos`, `/photo/:id`, `/order`) improve testability and recovery. |
| **P1** | **Harden network isolation** | Add IP-level checks and certificate pinning for Master; restrict `connect-src` further to exact Master IPs. |
| **P2** | **Add service-worker offline shell** | `public/service-worker.js` exists but is minimal; implement precache + background sync for photos. |
| **P2** | **Expand E2E coverage** | Only 2 kiosk-flow specs. Add face-search, RFID, offline-checkout, admin-exit, and branding tests. |
| **P2** | **Standardize Touch migrations** | 15 migrations are fewer but still have duplicate `002_*.sql`; consolidate and add migration integrity tests. |
| **P2** | **Add conflict-resolution UI** | `offlineStorage.ts` records unresolved conflicts but no UI exposes them to staff. |
| **P3** | **Extract kiosk primitives to `packages/ui`** | `NumericKeypad`, `OnScreenKeyboard`, `SelectionCartBar`, `RoomNumberModal` could be reusable. |
| **P3** | **Add metrics dashboard** | `performanceMonitor.ts` and `offlineAnalytics.ts` collect data; expose a debug/telemetry view. |
| **P3** | **Reduce App.tsx size** | `App.tsx` is 293 lines and mixes view routing, cart logic, and setup handling; split into hooks/reducers. |

---

*End of Touch Kiosk report.*
