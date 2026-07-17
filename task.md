# ClickFlash v2.0 Execution Ledger

Status key: `[ ]` pending, `[/]` active, `[x]` evidenced complete, `[!]` blocked.

## Phase 0 — Baseline

- [x] Read and convert the supplied Opus 4.6 ecosystem prompt for GPT-5.6 Sol.
- [x] Load repository and model-specific operating guidance.
- [x] Capture the initial Git state without modifying existing user changes.
- [x] Confirm the workspace manifest and existing roadmap.
- [/] Inventory actual apps, packages, workers, services, commands, routes, and test surfaces (28 Turbo packages confirmed; route/handler protection inventory remains).

## Phase 1 — Plan and evidence model

- [x] Preserve and reuse `roadmap.md` rather than replacing it.
- [x] Create this execution ledger and `walkthrough.md`.
- [ ] Reconcile every roadmap claim with current source or test evidence.
- [ ] Add acceptance criteria and dependencies for each app workstream.
- [ ] Rank the audit backlog by severity, impact, and dependency order.
- [x] Add a repository-backed desktop application audit, Electron rebuild, packaging, installer, updater, and clean-machine verification program.

## Phase 2 — Baseline audit

- [/] Run secret and prohibited-integration scans with false-positive review (current-tree private key contained; credential rotation and Git-history purge remain).
- [ ] Audit route/API/IPC/WebSocket inventories and protection coverage.
- [x] Run workspace lint and record failures.
- [x] Run workspace typecheck and record failures.
- [x] Run focused tests, then the configured workspace test graph, and record failures/skips.
- [x] Run the configured build graph and record failures/warnings.
- [/] Audit security-sensitive database, auth, payment, upload, license, and admin paths.
- [x] Inventory and replace prohibited paid/external AI integrations in Gallery, Management, Management Worker, and Master.
- [/] Audit every desktop main/preload/renderer/backend boundary, IPC channel, native module, privileged operation, local-data path, updater, and packager configuration; the Stage A baseline and severity matrix are recorded in `docs/DESKTOP_APPLICATION_AUDIT_2026-07-16.md`.

## Phase 3 — Implementation workstreams

- [ ] Shared contracts, validation, logger, database, API, UI, and test utilities.
- [ ] Master: editor, jobs, SQLite, LAN sync, RBAC, print.
- [x] Master intelligence boundary: local content/coaching templates, explicit intent/BANT rules, local shoot ideas, and on-device culling tags with no image upload.
- [ ] Touch: touch UX, persistence, offline identity, secure admin flow.
- [ ] Management: context, fleet monitor, command palette, PixelFounder.
- [x] Management PixelFounder boundary: deterministic forecast/audit/chat/ideas service, metadata-only album suggestions, no provider credentials, and corrected `/api/ai/chat` routing.
- [/] Gallery (online-only): auth/download/checkout/proofing/cart-return boundaries and lightbox UX are hardened; the deployed browser Stripe test-mode E2E remains.
- [x] Gallery online-only boundary: removed IndexedDB kiosk/offline-order broker, local Master/Touch bridges, fabricated logins/orders, dead checkout/ZIP/Wallet routes, and unused local-only dependencies.
- [x] Gallery customer security: real PIN/magic-token verification, scoped JWTs, strict origins, D1 login throttling, staff-only generic REST, sanitized order payloads, purchase-bound signed R2 downloads, and live D1 product catalog.
- [x] Gallery proofing security: optimistic UI now persists through a customer-JWT endpoint scoped to the exact order and photo snapshot, with rollback on failure.
- [x] Gallery commerce recovery: Stripe returns to the real `/gallery/` app, stored customer sessions resume safely, D1/Stripe reconcile the exact Checkout Session, and carts clear only after confirmed payment.
- [x] Gallery abandoned carts: JWT-scoped snapshots accept only order-owned photos and active D1 products, calculate totals server-side, use cryptographic session IDs, and recover only for the owning email.
- [x] Gallery creative-ideas boundary: subscription-free browser rules with no external model SDK.
- [x] Gallery lightbox: working compare initialization, MoneyTrash photo opening, visible cart handoff, metadata panel, keyboard navigation, dialog semantics, focus trapping/restoration, and scroll locking.
- [x] MoneyTrash secure ingest: authenticated native handoff, bounded 5 MiB multipart R2 parts, D1 part tracking, exact file-size completion, office ownership, idempotent multi-photo galleries, and cancellation.
- [x] MoneyTrash online Gallery delivery: dedicated public Worker lookup, strict origins/rate limits, five-minute signed raster URLs, server-enforced expiry, hourly R2 purge, and no fabricated/offline Gallery fallback.
- [x] MoneyTrash B2B commerce: short-lived gallery purchase tokens, server-priced single-photo Stripe Checkout, idempotent webhook/status reconciliation, isolated browser carts, online return recovery, and paid-order-bound original downloads.
- [ ] Website: routes, metadata, accessibility, asset performance.
- [ ] Mobile, workers, and services discovered during inventory.
- [/] License generator and installer hardening: BrowserWindow, signing-key, IPC-sender, external-URL, semantic executable launch, protocol-privilege, permission, uninstall-data, runtime-package-boundary, full privileged-payload validation, network-schema/SSRF, OS-protected license persistence, transactional application configuration/rollback, separate Ed25519 payload verification, deterministic offline payload signing, and fail-closed artifact scans completed; production payload-key approval/bundle issuance, payload installation, and license-key rotation remain.

## Desktop application audit and rebuild program

### Scope and architecture decisions

- [ ] Freeze the supported desktop matrix: Windows 10/11 x64 as the mandatory baseline; explicitly decide Windows ARM64, macOS, and Linux support per app.
- [/] Inventory all executable processes and entrypoints for Master, Touch, Studio Installer, License Generator, MoneyTrash, local backends, workers, watchdogs, and updater helpers; canonical rebuild paths are selected and detailed native/helper closure remains.
- [ ] Preserve stable app IDs, data directories, database formats, license identity, fleet identity, and upgrade compatibility before replacing any shell.
- [ ] Decide MoneyTrash shell direction after parity measurement: migrate Tauri to the shared Electron foundation or retain/harden Tauri behind the same packaging, signing, update, and QA contract.

### Electron foundation audit

- [/] Consolidate Master's competing `electron-main.js`, `electron-main.ts`, and `electron-new/` implementations into one supported TypeScript main/preload architecture; `electron-main.ts`/`preload.ts` are selected as canonical pending parity proof.
- [/] Align Master, Touch, Installer, and License Generator on one supported Electron/electron-builder toolchain; all four now resolve to builder 26.8.1, while exact version ranges, native rebuild policy, and duplicate Master/Touch shell sources remain.
- [/] Enforce `contextIsolation`, renderer sandboxing, no renderer Node integration, strict navigation/window-open policies, explicit permission handling, CSP, and a minimal typed preload API; Installer and License Generator first pass completed, Master/Touch remain.
- [/] Build a complete IPC inventory with allowlisted channels, Zod validation, authorization, timeout/cancellation behavior, structured errors, and tests for malformed or unauthorized messages; Installer network/non-network privileged payloads and all canonical sender checks are covered, while Master/Touch payload schemas remain.
- [/] Audit secrets, tokens, license material, logs, crash dumps, temp files, protocol handlers, deep links, and external URL opening across main, preload, renderer, and helper processes; bundled License Generator private key removed, Installer workspace-package leakage fixed with a fail-closed artifact gate, persisted Installer license keys use OS protection, and legacy-key rotation remains blocked externally.
- [ ] Reproduce native dependency packaging for encrypted SQLite, Sharp, Canvas, bcrypt, serial ports, Bonjour/mDNS, printers, cameras, and hardware readers on clean machines.

### Application rebuild tracks

- [ ] Rebuild Master Electron around one lifecycle owner for the renderer, local backend, encrypted database, background workers, LAN services, printers, tray, shutdown, recovery, and auto-update.
- [ ] Rebuild Touch Electron as a hardened kiosk with reliable backend/watchdog startup, offline identity, pairing, camera/serial/RFID support, printer flow, controlled admin escape, crash recovery, and kiosk policy restoration.
- [/] Rebuild Studio Installer Electron with signed payload manifests, prerequisite checks, privilege separation, component selection, fleet/license provisioning, transactional install, health verification, repair, rollback, and safe uninstall; deterministic offline signing, strict signed local-bundle selection/re-verification, and transactional configuration/rollback are complete, while production key approval/bundle issuance, payload acquisition/copy, install/upgrade/repair, and binary rollback remain.
- [ ] Rebuild License Generator Electron as an operator-only offline utility with protected signing-key custody, auditable issuance/revocation/export, no bundled private production key, and deterministic package output.
- [ ] Execute the approved MoneyTrash shell track with upload-resume parity, secure filesystem permissions, removable-media handling, notification behavior, crash recovery, and installer/updater parity.

### Packaging, installers, and updates

- [ ] Define canonical package commands and artifact names for every desktop target; eliminate legacy scripts and configs after parity evidence is recorded.
- [/] Produce deterministic unpacked builds before installers; Studio Installer ASAR/runtime boundaries and `5.0.0` branding resources are evidenced, while native closure and the remaining apps still require proof.
- [/] Build per-app Windows installers plus the unified Studio Installer payload set with signed SHA-256 manifests, SBOMs, release notes, and reproducible checksums; the branded Studio Installer NSIS/EXE/ASAR proof, strict payload verifier, deterministic manifest signer, and hashes are complete, while authorized payload issuance, Authenticode, SBOM/reproducibility, payload assembly, and other apps remain.
- [ ] Make install/upgrade/repair/uninstall transactional and reboot-safe; preserve customer databases and configuration by default and require explicit confirmation before destructive removal.
- [ ] Implement signed stable/beta update channels, staged rollout, downgrade protection, interrupted-update recovery, offline update packages, and rollback to the last known-good version.
- [ ] Configure Authenticode code signing and trusted timestamping for installers, executables, DLLs, and update metadata; fail production packaging when signing is absent or invalid.

### Desktop verification and release gates

- [ ] Add focused main/preload/IPC/native-module tests and Playwright Electron journeys for startup, shutdown, restart, deep links, updates, permissions, offline operation, and renderer crash recovery.
- [ ] Run install, first launch, upgrade from the previous production version, repair, rollback, and uninstall on clean Windows 10/11 VMs using standard-user and administrator accounts.
- [ ] Test power loss, network loss, full disk, locked files, corrupt database, unavailable printer/camera/serial hardware, backend crash, and interrupted installation/update scenarios.
- [/] Verify no secrets/customer media leak into installers, logs, temp directories, crash reports, update feeds, uninstall remnants, or release archives; Studio Installer now scans raw ASAR bytes after every package and its corrected proof is clean.
- [/] Record binary hashes, signatures, installer logs, screenshots, test reports, rollback evidence, known limitations, and operator manuals in the final release package; current Installer hashes, `NotSigned` status, test/build evidence, and limitations are recorded.

## Phase 4 — Nine-layer verification

- [ ] Unit/integration, web E2E, desktop E2E, and cross-app sync.
- [ ] Load/stress and security testing.
- [ ] Visual regression and WCAG AA verification.
- [ ] Chaos, restart, retry, rollback, and resume verification.
- [ ] Clean-machine desktop install/upgrade/repair/uninstall and auto-update verification for every supported architecture.

## Phase 5 — Release gates

- [ ] Clean lint, typecheck, test, build, secret scan, and diff review.
- [ ] Complete migration, rollback, deployment, and smoke-test procedures.
- [ ] Build and verify `ClickFlash_Release_v2.0/` without secrets or customer data.
- [ ] Produce signed desktop binaries/installers, SHA-256 manifests, SBOMs, updater metadata, and rollback packages from a clean reproducible build.
- [ ] Obtain/confirm external-action authorization before push, merge, deploy, sign, or tag.
- [ ] Verify authorized live deployment health before declaring release complete.

## Active release blockers

- [!] Rotate the exposed JWT, Stripe, license-signing, and Google API credentials in their owning systems; current tracked/bundled values were removed but must be treated as compromised.
- [!] Purge `apps/cloud-backend/private_key.pem`, embedded Wrangler secrets, and the stale Management bundle's Google key from Git history using an approved, coordinated history rewrite.
- [!] Configure Cloudflare secrets for `JWT_SECRET`, `STRIPE_SECRET_KEY`, and `PRIVATE_KEY_PEM` before Worker deployment.
- [!] Apply `workers/gallery-worker/migrations/001_security_rate_limits.sql` to both `gallery-db` and `clickflash-website-db`, then apply `002_online_commerce.sql` to `gallery-db`, before deploying the hardened Gallery Worker.
- [!] Apply `workers/moneytrash-worker/migrations/001_secure_multipart_uploads.sql`, `002_gallery_expiration.sql`, and `003_b2b_commerce.sql` in order to `moneytrash-db` before deploying the MoneyTrash Worker.
- [!] Configure MoneyTrash `JWT_SECRET` (32+ random bytes), `MASTER_API_KEY`, `WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`; register `/api/stripe/webhook` in Stripe and remove the legacy `MT-TEST-01` office remotely if it was ever provisioned from the old schema.
- [!] Production desktop release requires an approved Authenticode certificate/signing service, timestamp authority, secure signing-key custody, and authorized updater repositories/channels.
- [!] Approve a payload-signing key under custody separate from the compromised license key, embed only its public key in packaged Installer builds, and use the completed offline signer to issue the first authorized Master/Touch release manifest; the current packaged trust table is intentionally empty and fails closed.
