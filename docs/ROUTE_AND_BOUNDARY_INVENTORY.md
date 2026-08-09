# Ecosystem Route and Boundary Inventory

This document compiles the route, IPC, and native boundary inventory across the ClickFlash ecosystem (Desktop, Mobile, Cloud), fulfilling AUD-001 and AUD-002 requirements.

## Desktop Applications (`apps/master`, `apps/touch`, `apps/installer`)

### `apps/master`
*   **Routes (`react-router`)**: `/audit`, `/dashboard`, `/albums`, `/bookings`, `/orders`, `/printqueue`, `/clients`, `/photographers`, `/settings`, `/growth`, `/localresortdashboard`
*   **Exposed APIs**: `window.electron`
*   **IPC Channels**: `kiosk:unlock`, `kiosk:lock`, `dialog:openDirectory`, `dialog:openFile`, `dialog:saveFile`, `printing:getPrinters`, `printing:print`, `updater:check`, `updater:download`, `updater:install`, `updater:status`
*   **Native Module Boundaries**: Uses natively compiled modules (`@napi-rs`, `@img`). Invokes Python/native bindings via `backend/workers/aiStudioWorker.ts` and `GenerativeMediaEngine.ts` (FFmpeg).

### `apps/touch`
*   **Routes**: No dynamic `react-router` paths found (relies on conditional component rendering, e.g., `<WelcomeScreen />`).
*   **Exposed APIs**: `window.electron`, `window.touchApp`
*   **IPC Channels**: Inherits standard `kiosk:*`, `dialog:*`, `printing:*`, and `updater:*` channels.
*   **Native Module Boundaries**: Same core bindings as `master` (managed via `scripts/ensure-native-deps.js`), including `better-sqlite3-multiple-ciphers`, `sharp`, and `bindings`.

### `apps/installer`
*   **Routes**: No dynamic `react-router` paths found (single-page wizard structure).
*   **Exposed APIs**: `window.installerApi`
*   **IPC Channels**: Extensive system-level channels mapped under `installer:*`, including `checkPrerequisites`, `openOAuth`, `testCloudflareToken`, `validateLicense`, `requestDeviceCode`, `registerWithHub`, `launchApps`, `installPayload`, `discoverMasters`, `scanLan`

## Mobile Applications (`apps/mobile-*`)

### `apps/mobile-photographer`
*   **Navigation**: Uses `expo-router` with experimental `NativeTabs` (`expo-router/unstable-native-tabs`).
*   **Tabs**: `index` (Studio), `schedule`, `scout`, `pos`, `approvals`, `performance`.
*   **Standalone Routes**: `coach`, `enroll-face`, `explore`, `kiosks`.
*   **Android PTP Module Bindings**: The D7000 Android Tether logic is implemented as a local Expo module (`camera-tether`). Bound methods include `getStatus()`, `getStorageStatus()`, `listDevices()`, `startSession()`, `importObject()`.

### `apps/mobile-customer`
*   **Navigation**: Standard `expo-router` `Stack` and `Tabs`.
*   **Root Stack Routes**: `index`, `selfie`, `(tabs)`.
*   **Tabs Routes**: `face-search`, `gallery`, `orders`.

### `apps/mobile-staff`
*   **Navigation**: Standard `expo-router` `Stack` and `Tabs`.
*   **Root Stack Routes**: `index`, `scanner`, `(tabs)` (Mounts `initDb()` offline SQLite hook).
*   **Tabs Routes**: `approvals`, `ingestion`, `kiosks`, `pos`, `schedule`, `scout`, `search`, `studio`.

## Cloud Applications (`apps/gallery`, `apps/management`, `apps/moneytrash`, `apps/website`)

### Zero-Paid SaaS Compliance
*   **Compliance Achieved**: No active usage of Vercel, Supabase Cloud, Firebase, or AWS proprietary services. All apps utilize Cloudflare (Pages, Workers, R2).

### `apps/gallery` (Vite + React 19 SPA)
*   **Web Routes**: Controlled by state in `App.tsx` (`CustomerLogin`, `CustomerLayout`, `OfflineScreen`).
*   **Stripe Boundaries**: `CheckoutModal.tsx` integrates Stripe. It calls `/api/checkout` (Cloud backend) or `moneyTrashService.createCheckout` and handles redirection via `window.location.assign(url)`.

### `apps/management` (Vite + React 19 SPA)
*   **Web Routes**: Conditionally renders `/activate` or `ManagementLayout`. `ManagementLayout` contains 18 string-based view states (e.g., `executive_dashboard`, `orders_sales`).

### `apps/moneytrash` (Next.js 16 + Tauri 2)
*   **Cloud Integrations**: Uses `@aws-sdk/client-s3` (`s3StorageService.ts`) configured to support S3-compatible endpoints like Cloudflare R2.

### `apps/website` (Next.js 15)
*   **Infrastructure**: Relies on `@cloudflare/next-on-pages` and `wrangler.toml`, deployed to Cloudflare Pages.
