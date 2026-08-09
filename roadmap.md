# ClickFlash Photography Ecosystem — 360° Systematic Execution Roadmap

> [!NOTE]  
> **AI Agent Notice:** This document is the long-term strategic compass. For immediate execution tasks, refer to `task.md` or `.clickflash-plans/`. Do not parse this entire file into your context window unless you are doing architectural planning.

> **2026-08-03 control plane:** Use the [ClickFlash 360° Mega Execution Roadmap](docs/roadmaps/clickflash-mega-execution-roadmap.md) for the consolidated ecosystem plan and the [Mega Task Register](docs/roadmaps/clickflash-mega-task-register.md) for granular app/page/action/mechanism work. This historical roadmap retains specialist detail and prior checkpoints.

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
- **Offline Editor Baseline**: Local Canvas/Sharp/WASM paths provide manual controls, global auto-exposure/contrast/color heuristics, face-aware crop, derivatives, and before/after history.
- **Flagship Automatic Editor Target**: Consolidate those paths into one color-managed, non-destructive, confidence-gated JPEG/RAW engine with D7000 calibration, session look consistency, protected subject/skin masks, deterministic recipes, quality guards, review, and rollback. See the [Master Automatic Editor and Nikon D7000 Mobile Tether Roadmap](docs/roadmaps/master-auto-editor-nikon-d7000-mobile.md).
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

### 9. `apps/mobile-photographer` (Expo React Native | Android tether target)
- **Android-Only Product Boundary**: Version 1 targets Android only, uses the stable package identity `com.clickflash.photographer`, requires API 26+, and regenerates its native Android host from source-controlled Expo configuration and Kotlin modules.
- **Nikon D7000 Cable Import**: Replace the simulated DSLR button with an Android USB Host/PTP native module that detects each new camera object, imports JPEG/NEF safely, pairs RAW+JPEG, survives detach/restart, and never deletes the camera-card original.
- **Roaming Capture-to-Delivery Automation**: While the photographer moves between shooting spots, resolve event/spot context, run an immediate confidence-gated JPEG quick edit, preserve a deterministic recipe and untouched original, then fan out through independent authenticated Mobile→Kiosk, Mobile→Master, and Mobile/Master→Cloud queues with checksum-bound receipts.
- **Shooting-Spot Intelligence**: Learn privacy-safe lighting, exposure, quality, edit-delta, routing, and outcome patterns per approved venue spot; provide explainable coaching and signed versioned profiles without using face identity or protected traits.
- **Execution Program**: Hardware matrix, architecture, UX, security, phases, quality corpus, latency targets, fault injection, and release gates are defined in the [Master Automatic Editor and Nikon D7000 Mobile Tether Roadmap](docs/roadmaps/master-auto-editor-nikon-d7000-mobile.md).
- **Field Operations Program**: The complete roaming workflow, per-destination ledger, Kiosk/Cloud behavior, spot resolver, learning system, privacy model, pilot, and acceptance gates are defined in the [Roaming Photographer, Shooting-Spot AI, Kiosk, and Cloud Plan](docs/roadmaps/roaming-photographer-spot-ai-kiosk-cloud.md).

---

## Part 2: Flagship Automatic Editor and Nikon D7000 Tether Program

The cross-app program joins `apps/mobile-photographer` capture with `apps/master`
professional development while keeping every camera original immutable:

`D7000 shot → Android PTP detection → verified mobile copy → spot resolution → quick JPEG edit → authorized Kiosk preview + Master/Cloud durable delivery → Master RAW/JPEG develop → quality guard → operator review/gallery/print → controlled spot-profile learning`

Execution order:

1. Prove the D7000 on real Android USB-OTG hardware and freeze the supported matrix.
2. Build the shared capture/edit/receipt contracts, secure pairing, and durable ingest ledger.
3. Deliver automatic shot detection and import before adding image intelligence.
4. Add the bounded Mobile Quick Edit path without delaying or risking capture.
5. Consolidate Master into one high-bit-depth non-destructive engine and review workflow.
6. Calibrate quality, run the 1,000-shot durability soak, sign artifacts, and qualify production.
7. Pilot privacy-safe shooting-spot recommendations and promote only profiles that pass
   offline evaluation, controlled canary, and rollback gates.

**Implementation checkpoint — 2026-07-30:** The import-only software slice is implemented
in `apps/mobile-photographer`: an autolinked `camera-tether` Expo module, correct Android
USB Host/attach configuration, runtime permission flow, serialized MTP access, recursive
object-delta polling, restart-aware baseline recovery, atomic app-private JPEG/NEF import,
size/SHA-256 verification, durable SQLite sessions/capture objects, retry/deduplication,
automatic JPEG editor handoff, RAW retention, and live field-screen tether state. The app
is now Android-only in Expo configuration with stable package identity
`com.clickflash.photographer`; direct web dependencies and scripts are removed. TypeScript,
lint, Expo config introspection, module Kotlin, and host-app Kotlin validation pass. After
USB access, a non-exported Android `connectedDevice` foreground service supplies an ongoing
notification and tether-scoped partial wake lock, while deterministic detach/failure/stop/
teardown paths release both and the non-sticky lifecycle avoids false recovery state. A
two-stage storage-admission gate now preserves a 512 MiB/5% reserve (capped at 2 GiB),
rechecks at the native copy boundary, records `BLOCKED_STORAGE` without consuming blind
camera retries, and exposes capacity, blocked count, storage management, and explicit retry
on the field screen while leaving the D7000 card original untouched. Native policy unit
tests cover allowed, warning, blocked, and overflow cases. A
separate durable RAW+JPEG companion ledger now consumes the MTP sequence number and
64-bit object size, matches normalized Nikon basenames with capture-time safeguards,
allows late companions after a 60-second standalone transition, and locks ambiguous
matches for Master review without delaying JPEG quick editing. The Studio screen now
shows the untouched checksum-verified JPEG before the edit; quick edits leave cache through
a verified staging copy into app documents and become immutable SHA-256 assets. Separate
destination-intent and receipt tables create one required pending Master intent per
verified original, reject unauthenticated or content-mismatched receipts, and reserve
`READY` for destination-specific durable proof. Thirteen capture/pairing/preview/schema/
delivery tests cover these contracts. A
four-ABI debug APK (`arm64-v8a`, `armeabi-v7a`, `x86`, and `x86_64`) assembles after
relocating Reanimated, Worklets, and Expo Modules Core CMake staging below the Android
project and selecting the duplicate Worklets JNI input. The inspected artifact targets API
36 with minimum API 26, contains camera-tether, Expo Crypto, and the Nikon USB filter, and is
debug-signed. Release hardening is source-controlled: regenerated Android projects replace
Expo's debug-signed release default with an environment-only keystore contract, reject
partial signing configuration, and fail every release task when approved signing is absent.
An `android:aab` command and secret-custody runbook are present, but no release artifact was
created or signed. The current debug APK is 305,145,843 bytes with SHA-256
`9A72A08AC99A03B2E2DDA9B613EFBA3B621C60B773FDEBC3ECE0D6005770A03F`.
This is not Phase 0 completion: approved upload-key custody, signed AAB
inspection/distribution, physical D7000/phone/cable testing, burst and restart
reconciliation, screen-off battery/thermal qualification, physical low-storage recovery,
physical RAW+JPEG pairing/ambiguity proof, authenticated Master transfer/receipt, real
Kiosk/Cloud delivery lanes, and Spot AI remain.

No phase may claim completion from simulation. Hardware evidence, immutable-original proof,
checksum receipts, blind image review, and recovery tests are mandatory. The detailed plan is
[here](docs/roadmaps/master-auto-editor-nikon-d7000-mobile.md).
The roaming delivery and learning extension is
[here](docs/roadmaps/roaming-photographer-spot-ai-kiosk-cloud.md).

---

## Part 3: Standalone Infrastructure Tools (`apps/installer` + `apps/license-generator`)

### 1. Offline License Generator (`apps/license-generator`)
- **Cryptography**: Ed25519 detached digital signatures (`tweetnacl`).
- **Hardware Binding**: Hardware fingerprint locking (CPU + Motherboard UUID + MAC address hash).
- **Dashboard**: Full admin dashboard for generating offline activation tokens.

### 2. All-In-One Setup & Packaging Wizard (`apps/installer`)
- **App Selection Wizard**: Interactive `AppSelectionStep` allowing operators to select which components (`master`, `touch`, background services) to install.
- **DevOps**: Clean bundling setup and uninstaller safeguarding local SQLite databases.

---

## Part 4: Desktop Application Audit, Electron Rebuild & Installer Program

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

**Checkpoint 1 complete; signed payload install and same-release repair added (2026-07-17):** `docs/DESKTOP_APPLICATION_AUDIT_2026-07-16.md` records the canonical runtime paths, process/native inventory, severity-ranked findings, toolchain drift, hardening evidence, and Stage B order. Installer IPC/navigation/CSP, semantic launch/config contracts, bounded network responses, static cloud origins, private-address pinning, OS-protected license persistence, transactional Master/Touch configuration, and a separate Ed25519 payload trust domain are hardened. The wizard separately approves a signed source and an existing destination, re-verifies the exact release, copies it into a same-volume stage, verifies the stage, atomically swaps the destination root, verifies the installed copy, and restores the prior root on failure. Same-release repair replaces missing/corrupt binaries while preserving only authenticated Installer-owned configuration; unmanaged destinations and version-changing upgrades fail closed. The offline deterministic signer remains excluded from the shipped ASAR. The packaged trust table remains intentionally empty pending an approved public key, so unsigned/current payload folders fail closed. Authorized bundle issuance, version-changing upgrade/reboot recovery/uninstall, shell consolidation, Authenticode, native closure, and clean-machine proof remain. Gallery remains an online-only web application and is excluded from desktop packaging.

**Checkpoint 2 active; runtime trust, IPC, and shell convergence hardened (2026-07-18):** Packaged Master now trusts only its forked backend and loads the updater from the built path; Master/Touch updater IPC is top-frame-bound. Touch renderer assets are loopback-only and path-contained. License Generator private-key selection/signing moved into Electron main, its renderer no longer bundles signing logic, and the first workspace-linked `private.pem` leak is blocked by bundled privileged code plus a mandatory after-pack custody scan. Master startup and backend now share one strict, OS-protected, hardware-bound Ed25519 contract; Stripe creates only a pending destination until real OS-UUID issuance. The committed historical private key proves the old trust root compromised: fixtures use ephemeral keys, Master/Installer fail closed without an approved configured key, and unsafe legacy license/MCP paths are retired. Release-time public trust provisioning is now deterministic and fail-closed: a valid base64 32-byte public key is atomically embedded and verified after packing, while private custody remains offline. Master/Touch generic IPC is replaced by narrow named APIs with strict main-process validation; Touch admin/exit authentication no longer trusts local storage. Duplicate JS shells, `electron-new`, alternate configs/scripts, and Touch's second manifest are deleted; canonical Electron builds pass and Touch's full 105-test suite is green. A prior Electron 39/ABI 140 Master artifact remains only historical proof and is unsigned. MoneyTrash is approved for Electron migration behind ingest/resume parity tests. Authorized trust-key input, current artifact proof, Authenticode/update trust, release automation, and clean-machine lifecycle proof remain. Evidence: `docs/audits/DESKTOP_RUNTIME_AUDIT_2026-07-18.md`.

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

## Part 5: 9-Layer Production QA Gauntlet

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

## Part 6: DevOps Release & Final Delivery Package (`ClickFlash_Release_v2.0/`)

1. **Build & Typecheck Verification**: 0 warnings/errors across all 6 monorepo apps and standalone tools.
2. **Handoff Release Package Structure**:
   - `/01_Installation_Manuals`: Complete setup manuals for Studio & Cloud.
   - `/02_User_Manuals`: Operator & Customer user guides.
   - `/03_Production_Builds`: Compiled binaries and edge release targets.
   - `/04_Assets_and_Config`: Clean `.env.example` and base SQLite schema.
   - `/05_Desktop_Release_Evidence`: Signed hashes, SBOMs, installer/update logs, clean-VM results, rollback packages, and code-signing verification.
3. **Git Release Tagging**: Tag workspace as `v2.0.0-production`.
