# ClickFlash Photography Ecosystem — 360° Systematic Execution Roadmap

> **Architectural & Security Mandate**: 100% Custom / Zero Paid SaaS (No Vercel, Auth0, Clerk, Pusher, Algolia, OpenAI, Adobe, or paid analytics).
> **Target Version**: `v2.0.0-production`

---

## Part 1: Monorepo Apps Audit & Feature Implementation (`apps/*` + `packages/*`)

### 1. Shared Packages (`packages/*`)
- **`@clickflash/logger`**: Zero `console.log` compliance; structured logging across all apps.
- **`@clickflash/validation`**: 100% test coverage (44/44 passing) for strict Zod input schemas (`can("view...")` RBAC, POS orders, RFID auth).
- **`@clickflash/types`**: Unified domain contracts across Master, Touch, Management, Gallery, and Mobile.
- **`@clickflash/ui`**: Consistent Tailwind CSS dark mode & glassmorphism tokens.

### 2. `apps/master` (Port 8090 | Local Studio Core Electron + React 19)
- **100% Custom Offline Auto Photo Editor**: Local HTML5 Canvas / WASM image processing engine (auto-exposure, contrast, cropping, before/after slider).
- **Resilience & Operations**: Non-blocking `BackgroundJobRunner`, `ThermalMonitor`, and optimized SQLite queries without N+1 bottlenecks.
- **Local Network Engine**: High-performance LAN WebSocket server for real-time sync with Touch Kiosks.
- **Print Layout**: Pixel-perfect `@media print` layouts for customer receipts and photo sheets.

### 3. `apps/touch` (Port 8091 | Customer Kiosk Electron + React 19)
- **Touch-First UI**: Dark glassmorphism, Framer Motion grid-to-preview transitions, and local storage cart persistence.
- **Offline Authentication**: Local RFID / Wristband scanning & Face detection authentication.
- **Admin Security**: Tamper-proof Admin Override trigger (`Ctrl+Shift+Alt+F12`).
- **Unit Suite**: 100% passing Vitest suite (95/95 tests).

### 4. `apps/management` (Cloud Hub Vite + React 19)
- **Context Management**: Global vs. Hotel station selector without prop drilling.
- **Fleet Monitor**: Live online/offline ping monitor for studio Master nodes.
- **Command Palette & AI**: Custom `Cmd+K` palette and local/D1-backed "PixelFounder" query assistant.
- **Type Safety**: Clean TypeScript compilation (`CommandBar.tsx`).

### 5. `apps/gallery` (Client Portal Vite + React 19)
- **Custom Authentication**: Zero-SaaS passwordless Magic Links (`?token=`), QR sessions, and Email/PIN.
- **Media Delivery**: Swipeable Framer Lightbox with edge R2 image delivery.
- **Payments & Cart**: Custom Stripe checkout integration & abandoned cart D1 synchronization.

### 6. `apps/moneytrash` (Port 3000 | RAW/JPEG SD Ingestor Next.js + Tauri)
- **Ingest Pipeline**: Multi-threaded ingestion engine for bulk SD card folder drops with chunked R2 upload and granular progress bars.

### 7. `apps/website` (Port 3001 | Marketing Site Next.js 15 App Router + Tailwind 4)
- **Performance & SEO**: 100/100 Lighthouse score, dynamic native sitemap, and OpenGraph tags.

### 8. `apps/mobile-customer` & `apps/mobile-staff` (Expo React Native)
- **Customer Mobile**: Expo SDK 51+ `CameraView` with on-device TensorFlow.js 128D face vector extraction.
- **Staff Mobile**: QR ticket scanner and offline verification.

---

## Part 2: Standalone Infrastructure Tools (`apps/installer` + `apps/license-generator`)

### 1. Offline License Generator (`apps/license-generator`)
- **Cryptography**: Ed25519 detached digital signatures (`tweetnacl`).
- **Hardware Binding**: Hardware fingerprint locking (CPU + Motherboard UUID + MAC address hash).
- **Dashboard**: Full admin dashboard for generating offline activation tokens.

### 2. All-In-One Setup & Packaging Wizard (`apps/installer`)
- **App Selection Wizard**: Interactive `AppSelectionStep` allowing operators to select which components (`master`, `touch`, background services) to install.
- **DevOps**: Clean bundling setup and uninstaller safeguarding local SQLite databases.

---

## Part 3: 9-Layer Production QA Gauntlet

- **Layer 1 (Unit & API Integration)**: 100% passing suites (`packages/validation` 44/44, `apps/touch` 95/95).
- **Layer 2 (Web E2E)**: Playwright verification of Management Hub, Gallery Magic Links, and Website routes.
- **Layer 3 (Desktop E2E)**: Electron IPC channel verification across Master and Touch.
- **Layer 4 (Cross-App Sync Gauntlet)**: mDNS Bonjour discovery (`clickflash-touch`) and LAN WebSocket order propagation.
- **Layer 5 (Load & Stress)**: Offline SQLite transaction batching and queue ingestion.
- **Layer 6 (Security & Pen-Testing)**: Zero third-party SaaS verification & Ed25519 offline license tamper-proofing.
- **Layer 7 (Visual Regression)**: Responsive Tailwind dark mode & glassmorphism across all viewports.
- **Layer 8 (Accessibility)**: ARIA labels, contrast ratios, and keyboard/touch navigation.
- **Layer 9 (Chaos & Recovery)**: Queue retry logic and SQLite transaction rollback upon sudden network loss.

---

## Part 4: DevOps Release & Final Delivery Package (`ClickFlash_Release_v2.0/`)

1. **Build & Typecheck Verification**: 0 warnings/errors across all 6 monorepo apps and standalone tools.
2. **Handoff Release Package Structure**:
   - `/01_Installation_Manuals`: Complete setup manuals for Studio & Cloud.
   - `/02_User_Manuals`: Operator & Customer user guides.
   - `/03_Production_Builds`: Compiled binaries and edge release targets.
   - `/04_Assets_and_Config`: Clean `.env.example` and base SQLite schema.
3. **Git Release Tagging**: Tag workspace as `v2.0.0-production`.
