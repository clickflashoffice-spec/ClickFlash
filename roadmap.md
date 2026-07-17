# ClickFlash Photography Ecosystem — 360° Systematic Execution Roadmap

> **Architectural & Security Mandate**: 100% Custom / Zero Paid SaaS (No Vercel, Auth0, Clerk, Pusher, Algolia, OpenAI, Adobe, or paid analytics).
> **Target Version**: `v2.0.0-production`
> **Execution Status (2026-07-15)**: Started. `task.md` is the live status source and `walkthrough.md` holds reproducible evidence. Existing completion and pass-count statements are provisional until revalidated in this run.

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
- **Online-only boundary**: Authentication, media, proofing, and commerce require the deployed Workers; browser storage is session/cache state only and never a local Gallery database.
- **Custom Authentication**: Zero-SaaS passwordless Magic Links (`?token=`), QR sessions, and Email/PIN.
- **Media Delivery**: Swipeable, keyboard-accessible Framer lightbox with working comparison, metadata, focus management, and edge R2 image delivery for both standard and MoneyTrash galleries.
- **Payments & Cart**: Custom Stripe checkout integration & abandoned cart D1 synchronization.

### 6. `apps/moneytrash` (Port 3000 | RAW/JPEG SD Ingestor Next.js + Tauri)
- **Ingest Pipeline**: Authenticated native ingestion with 5 MiB R2 multipart parts, concurrent D1 part tracking, exact-size completion, resumable retry semantics, and office-scoped cancellation.
- **Online Delivery**: The browser Gallery reads the dedicated MoneyTrash Worker through access-code-scoped queries and short-lived signed raster URLs; 30-day expiry and R2 deletion are enforced server-side.
- **Dedicated B2B Commerce**: Short-lived gallery-scoped purchase tokens authorize server-priced single-photo Stripe Checkout; D1 idempotency, verified webhooks, status reconciliation, browser return recovery, and 15-minute paid-order original-download links remain isolated from standard Gallery orders.

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

## Part 3: Desktop Application Audit, Electron Rebuild & Installer Program

### Target inventory

| Target | Current shell | Rebuild outcome |
|---|---|---|
| `apps/master` | Electron 39 with competing legacy/new main-process implementations | One TypeScript main/preload/runtime, secure IPC, deterministic native-module packaging, lifecycle-owned backend/workers, signed installer and updater |
| `apps/touch` | Electron 39 with builder 26.8.1 and kiosk/native hardware integrations | Shared secure Electron foundation, hardened kiosk/watchdog, packaged SQLite/Sharp/bcrypt/serial/mDNS dependencies, signed installer and updater |
| `apps/installer` | Electron 39 unified setup wizard with one canonical builder YAML | Canonical transactional Studio Installer with verified payloads, elevation boundaries, repair/rollback, safe uninstall, health checks, and signed output |
| `apps/license-generator` | Electron 39 offline operator utility | Hardened offline signing workstation app with protected key custody, issuance audit, deterministic signed installer, and no production private key in artifacts |
| `apps/moneytrash` | Tauri 2 uploader | Evidence-based Electron migration decision; either replatform with full ingest parity or retain Tauri under the same security, packaging, signing, update, and clean-machine gates |

### Stage A — Full desktop audit

- Map every main, preload, renderer, backend, worker, helper, protocol, service, native dependency, filesystem path, database, device integration, and updater process.
- Reconcile duplicate entrypoints/configurations and identify the single supported runtime path for each product.
- Audit BrowserWindow/WebPreferences, IPC validation/authorization, navigation, permissions, CSP, external URLs, secrets, logs, crash data, temp files, and local-data ownership.
- Freeze stable application IDs, version sources, install locations, user-data locations, database compatibility, license/fleet identity, and supported OS/architecture matrix.

**Checkpoint 1 complete; signed payload verification and deterministic release signer added (2026-07-17):** `docs/DESKTOP_APPLICATION_AUDIT_2026-07-16.md` records the canonical runtime paths, process/native inventory, severity-ranked findings, toolchain drift, hardening evidence, and Stage B order. Installer IPC/navigation/CSP, semantic launch/config contracts, bounded network responses, static cloud origins, private-address pinning, OS-protected license persistence, transactional Master/Touch configuration rollback, and a separate Ed25519 payload trust domain are hardened. Local bundle selection verifies the signed raw manifest, canonical root/Master/Touch layout, exact file inventory, size/SHA-256, safe paths, and minimum Installer version again before configuration and launch. A separate offline tool now creates stable manifests, rejects secret/private material, signs with an external operator-supplied Ed25519 key, writes atomically, and self-verifies; it is excluded from the shipped ASAR. The packaged trust table remains intentionally empty pending an approved public key, so unsigned/current payload folders fail closed. Authorized bundle issuance, acquisition/install/repair, shell consolidation, Authenticode, native closure, and clean-machine proof remain. Gallery remains an online-only web application and is excluded from desktop packaging.

### Stage B — Shared secure Electron foundation

- Standardize supported Electron, Node, TypeScript, Vite, electron-builder, updater, logging, crash handling, and test versions across all Electron targets.
- Provide a minimal typed preload bridge with `contextIsolation`, sandboxed renderers, disabled Node integration, allowlisted IPC, Zod payloads, structured errors, cancellation, and timeouts.
- Centralize lifecycle management for local backends, workers, native helpers, tray/kiosk behavior, single-instance/deep-link handling, shutdown, restart, and crash recovery.
- Establish deterministic native rebuild/unpack rules for encrypted SQLite, Sharp/Canvas, bcrypt, serial ports, Bonjour/mDNS, printers, cameras, and hardware readers.

### Stage C — Product rebuilds

- **Master OS**: consolidate all legacy/new shells; preserve encrypted data and LAN compatibility; rebuild editor jobs, local backend/workers, printing, tray, recovery, and staged update behavior.
- **Touch Kiosk**: rebuild kiosk lockdown, watchdog/backend lifecycle, pairing/offline identity, RFID/camera/serial/printer paths, admin escape, restart recovery, and policy restoration.
- **Studio Installer**: use signed payload manifests and least-privilege elevation; make prerequisite checks, component selection, provisioning, install, health verification, repair, rollback, and uninstall transactional.
- **License Generator**: isolate operator-only signing, key custody, hardware binding, issuance/revocation audit, backup/export, and offline verification from distributable application code.
- **MoneyTrash**: measure Tauri/Electron parity and execute the approved shell decision without regressing resumable upload, filesystem/media access, removable storage, notifications, or crash recovery.

### Stage D — Packaging, signing, installers, and updates

- Replace overlapping builder scripts/configs with one canonical build/package command and one version source per app.
- Build clean unpacked applications first, then per-app Windows installers and the unified Studio payload bundle; validate ASAR/resources/icons/native binaries/runtime closure before packaging.
- Generate SHA-256 manifests, SBOMs, release notes, update metadata, offline update packages, and last-known-good rollback packages for every release.
- Preserve databases, media, configuration, licenses, and fleet identity across upgrade/repair/uninstall by default; destructive cleanup requires explicit operator choice.
- Authenticode-sign and timestamp executables, DLLs, installers, and update metadata. Production packaging fails closed when signatures or verification are missing.

### Stage E — Clean-machine proof

- Use clean Windows 10/11 VMs and both standard/admin users to verify install, first launch, hardware/native modules, offline mode, upgrade from the prior release, repair, rollback, uninstall, and reinstall.
- Exercise power/network loss, interrupted installs/updates, full disk, locked files, corrupt databases, backend/renderer crashes, unavailable devices, and reboot boundaries.
- Scan installed files, logs, temp data, crash reports, uninstall remnants, payload archives, and update feeds for secrets or customer data.
- Release only when binary hashes/signatures, installer logs, desktop E2E reports, rollback proof, screenshots, known limitations, and operator manuals are archived in the delivery package.

---

## Part 4: 9-Layer Production QA Gauntlet

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

## Part 5: DevOps Release & Final Delivery Package (`ClickFlash_Release_v2.0/`)

1. **Build & Typecheck Verification**: 0 warnings/errors across all 6 monorepo apps and standalone tools.
2. **Handoff Release Package Structure**:
   - `/01_Installation_Manuals`: Complete setup manuals for Studio & Cloud.
   - `/02_User_Manuals`: Operator & Customer user guides.
   - `/03_Production_Builds`: Compiled binaries and edge release targets.
   - `/04_Assets_and_Config`: Clean `.env.example` and base SQLite schema.
   - `/05_Desktop_Release_Evidence`: Signed hashes, SBOMs, installer/update logs, clean-VM results, rollback packages, and code-signing verification.
3. **Git Release Tagging**: Tag workspace as `v2.0.0-production`.
