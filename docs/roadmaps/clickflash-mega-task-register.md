# ClickFlash 360° Mega Task Register

As of: 2026-08-03  
Roadmap: [ClickFlash Mega Execution Roadmap](clickflash-mega-execution-roadmap.md)

Status: `[x]` evidenced narrow checkpoint, `[/]` active, `[ ]` open, `[!]` external/approval blocker. A checked item is not a production-readiness claim unless its release gate explicitly says so.

## A. Governance, inventory, and evidence

- [ ] GOV-001 Assign product, engineering, security, data, UX, accessibility, SRE, release, privacy, and support owners for every supported surface.
- [ ] GOV-002 Decide `qualify`, `experimental`, `archive`, or `remove` for every app, worker, package, native service, and deployable.
- [ ] GOV-003 Create the canonical deployable manifest: source, runtime, owner, domain, data stores, secrets, queues, artifacts, environments, rollback.
- [ ] GOV-004 Reconcile July audit findings against current code; preserve historical status and record explicit supersession evidence.
- [ ] GOV-005 Maintain one P0–P3 finding register with severity, confidence, exploit/user impact, owner, due date, dependency, and acceptance test.
- [ ] GOV-006 Record ADRs for bounded contexts, identity authority, schema/migration authority, update authority, mobile scope, MoneyTrash shell, and AI governance.
- [ ] GOV-007 Replace unsupported “complete,” “100%,” and “production-ready” claims with evidence/date/scope labels.
- [ ] GOV-008 Create an evidence index linking each claim to commands, reports, screenshots, artifact hashes, device IDs, and responsible reviewer.
- [ ] GOV-009 Define supported OS/browser/device/camera/printer/scanner/network and minimum-hardware matrices.
- [ ] GOV-010 Establish change-control boundaries for production, signing, DNS, secrets, migration, incident response, and destructive operations.

## B. Universal app/page/button/mechanism audit

- [ ] AUD-001 Inventory every route, page, tab, nested layout, dialog, drawer, popover, menu, deep link, and feature flag in every UI.
- [ ] AUD-002 Inventory every button, form, shortcut, gesture, scan action, camera action, print action, download, share, export, delete, and admin override.
- [ ] AUD-003 Classify each control as working, partial, mock, decorative, duplicate, unreachable, permission-hidden, or dead.
- [ ] AUD-004 Verify navigation reachability, browser/device back, refresh/restart restoration, deep-link denial, and unknown-route handling.
- [ ] AUD-005 Verify loading, empty, partial, stale, offline, validation, error, retry, cancel, timeout, recovery, and success states per action.
- [ ] AUD-006 Trace each state-changing action through UI → client → API/IPC → policy → transaction/outbox → ledger → projection → receipt/audit.
- [ ] AUD-007 Record actor/role/tenant/event/object/photographer authorization and positive/negative tests for each protected action.
- [ ] AUD-008 Verify keyboard, focus, screen reader, zoom/large text, contrast, reduced motion, touch target, switch access, and destructive confirmation.
- [ ] AUD-009 Remove or disable misleading controls; add owner/task links for intentional placeholders.
- [ ] AUD-010 Generate route/action coverage reports in CI and fail when an unclassified production surface appears.

## C. Shared packages, contracts, and data architecture

- [x] SHR-001 Shared strict command-center V1 contract uses self scope, half-open periods, explicit freshness, integer minor units, and currency exponent.
- [x] SHR-002 Immutable photographer event V1 contract covers order, capture, settlement, refund, attribution, commission, adjustment, payout, shift/break, reversal, and approval.
- [x] SHR-003 Master append-only event table/service rejects mutation, invalid schema/hash, idempotency conflicts, scope-crossing references, stale approvals, and unreconciled payouts; focused tests 10/10.
- [ ] SHR-004 Publish version/support/deprecation rules for every shared API, IPC, event, receipt, recipe, policy, and telemetry contract.
- [ ] SHR-005 Generate typed clients/validators from canonical contracts and prohibit local duplicate DTOs at boundaries.
- [ ] SHR-006 Inventory package consumers; assign maintainers and archive packages with no approved consumer.
- [ ] SHR-007 Consolidate validation, errors, logging/redaction, correlation IDs, time, currency, and idempotency primitives.
- [ ] SHR-008 Define datastore ownership, migration numbering, forward/rollback policy, checksum, lock, backup, and restore per database.
- [ ] SHR-009 Separate immutable facts, mutable projections, outboxes, retry state, caches, and audit records in every bounded context.
- [ ] SHR-010 Build clean install, N-1 upgrade, duplicate migration, interrupted migration, rollback, backup, and restore fixtures.
- [ ] SHR-011 Define conflict/version-vector rules for offline Master/Touch/Mobile sync; prove convergence and no silent last-write loss.
- [ ] SHR-012 Create canonical test factories and PII-free representative datasets across packages and apps.

## D. Identity, security, privacy, and abuse prevention

- [x] SEC-001 July remediation checkpoint added fail-closed Cloud service/JWT checks, route scoping, private object access, Stripe verification, and focused security tests; clean staging revalidation remains required.
- [ ] SEC-002 Build one explicit public-route registry; require authentication for every route not listed.
- [ ] SEC-003 Centralize policy decisions for role, tenant, event, object, device, photographer, and purpose; prohibit caller-selected scope.
- [ ] SEC-004 Generate allow/deny/ownership/expired/revoked/replay tests from the route/action registry.
- [ ] SEC-005 Complete desktop IPC capability inventory with top-frame sender checks, schemas, timeouts, cancellation, and least privilege.
- [ ] SEC-006 Threat-model camera USB, LAN discovery, pairing, receipts, webhooks, payments, downloads, printers, deep links, updater, installer, and support paths.
- [/] SEC-007 Command-center V2 now requires signed `CF-AEAD-V1` negotiation, rejects plaintext downgrade, binds the active pairing epoch, and returns a request-specific HKDF-SHA256/AES-256-GCM envelope verified by Android before JSON/schema parsing. Remaining scope: encrypt capture status/chunks/commit/receipts and legacy LAN sync; authenticate discovery/relocation; protect Master keys at rest; implement managed certificate identity/rotation, fail-closed TLS and release cleartext denial; then run restart, recovery, proxy, penetration, and physical-device tests.
- [ ] SEC-008 Implement secrets/key inventory, generation, custody, rotation, revocation, backup, access logging, break-glass, and leak response.
- [!] SEC-009 Classify/contain tracked sensitive artifacts and history through the approved restricted incident process; never expose contents in reports.
- [ ] SEC-010 Enforce CSP, CORS, CSRF, sessions/cookies, origin, navigation, external URL, SSRF, upload, archive/path, MIME, and rate-limit policies.
- [ ] SEC-011 Define consent, lawful purpose, minimization, retention, deletion, export, biometric alternative, and withdrawal propagation.
- [ ] SEC-012 Redact logs, traces, analytics, crash reports, support bundles, screenshots, training corpora, and fixtures.
- [ ] SEC-013 Run SAST, dependency/license, secret, IaC, container, SBOM, DAST, abuse, and independent penetration gates.
- [ ] SEC-014 Complete security/privacy incident drills with evidence preservation, notification decision, credential invalidation, and recovery.

## E. Master Studio application

- [ ] MAS-001 Reinventory Master renderer routes/pages/actions, backend routes, WebSockets, services, workers, cron, migrations, Electron main/preload, and native dependencies.
- [ ] MAS-002 Consolidate one supported Electron main/preload/backend lifecycle; remove or archive duplicate entrypoints/configurations.
- [ ] MAS-003 Validate BrowserWindow, sandbox/context isolation, navigation, protocol, permissions, external URL, file path, and IPC boundaries.
- [ ] MAS-004 Make startup, shutdown, crash recovery, worker ownership, database lock, single instance, and backend health deterministic.
- [ ] MAS-005 Trace albums/photos/collections from ingest through catalogue, edits, queues, archive, retention, export, and deletion.
- [ ] MAS-006 Trace every order status and require explicit operational vs capture vs settlement vs refund semantics.
- [ ] MAS-007 Emit idempotent order and attribution events through a transaction/outbox; never infer payment from `Completed`.
- [ ] MAS-008 Replace legacy floating-major-unit ledger writes with approved event producers/projections; retire or protect the unmounted legacy route.
- [ ] MAS-009 Reconcile gallery gratuity, discounts, taxes, refunds, commissions, adjustments, and payouts against immutable facts.
- [ ] MAS-010 Complete print/printer discovery, spool, cancellation, duplicate prevention, layout, color profile, error, restart, and receipt flows.
- [ ] MAS-011 Harden LAN pairing/discovery/sync, offline queues, conflict resolution, backpressure, replay, revocation, and wrong-device denial.
- [ ] MAS-012 Validate album/editor/order/dashboard/settings/management pages for all UI, accessibility, permission, offline, and error states.
- [ ] MAS-013 Establish SQLite performance/index budgets and test representative 10k/100k photo/order workloads on minimum hardware.
- [ ] MAS-014 Prove encrypted database lifecycle, backup/restore, corruption recovery, migration failure, retention, and secure export.
- [ ] MAS-015 Package native dependencies deterministically and run unpacked/ASAR/installed smoke without dev-tree fallbacks.

## F. Android Photographer, Nikon D7000, and field workflow

- [x] AND-001 Android-only identity, USB/PTP module, foreground tether service, safe atomic JPEG/NEF import, capture ledger, storage admission, and RAW+JPEG pairing have software checkpoints.
- [x] AND-002 Resumable authenticated Mobile→Master transfer, re-key recovery, corrupt receipt handling, durable receipt verification, and focused tests are implemented.
- [x] AND-003 Camera capability registry exposes read-only state and keeps remote writes locked behind certification.
- [x] AND-004 Administrator-selected one-use pairing binds a device to a photographer; signed paired-device command center and Android performance UI are implemented.
- [x] AND-005 Narrow Metro's monorepo watch set, bind IPv4 localhost for ADB reverse, load the JavaScript bundle, and runtime-verify the unpaired Performance route on Pixel 8 API 35. Paired data-state coverage remains AND-015.
- [ ] AND-006 Build connection wizard for OTG, cable direction, camera mode, permission, card, format, detach, and troubleshooting.
- [!] AND-007 Physically certify D7000 firmware/phone/cable/OTG matrix and record reproducible device evidence.
- [ ] AND-008 Prove physical shot detection, no missed/duplicate imports, burst, folder rollover, large card, RAW+JPEG, NEF-only, corrupt/truncated object, and ambiguous pairing.
- [ ] AND-009 Prove screen-off/background, detach/reconnect, app/phone/camera restart, low/full storage, battery, thermal, wake-lock, and long-shift behavior.
- [ ] AND-010 Reconcile camera object count/hash/sequence against phone originals and prohibit automatic card deletion.
- [ ] AND-011 Certify remote shutter/exposure/focus/live-view capabilities per model/firmware; fail unsupported operations closed and visibly.
- [ ] AND-012 Build assignment/today/route/patrol/spot resolution, safe check-in, gear preflight, handoff, and shift closeout.
- [ ] AND-013 Authenticate shift events from paired identity; add offline outbox, corrections, supervisor approval, and causal/replay tests.
- [ ] AND-014 Complete Kiosk and Cloud destination workers with independent auth, resume, checksum receipt, retry, expiry, restart, and storage-pressure behavior.
- [ ] AND-015 Runtime-test revenue/performance loading, self scope, periods, TND/JPY formatting, stale/offline/error, unavailable values, and denial.
- [ ] AND-016 Complete TalkBack, large text, contrast, reduced motion, switch access, touch targets, sunlight/glove, one-hand, and interruption checks.
- [!] AND-017 Reconcile root overrides/lockfile and prove frozen offline install without broad unsafe regeneration of user work.
- [!] AND-018 Obtain approved Android upload-key custody; build/inspect signed AAB, Play data safety/policy, staged rollout, rollback, and upgrade recovery.

## G. Professional automatic editor and governed intelligence

- [ ] EDT-001 Inventory every current Canvas/Sharp/WASM/mobile edit path, parameter unit, order, crop/mask behavior, output format, and consumer.
- [ ] EDT-002 Define one versioned non-destructive recipe with original/derivative hashes, engine/model/profile versions, confidence, guard results, and approvals.
- [ ] EDT-003 Preserve immutable original and deterministic re-render; prohibit overwrite and undocumented destructive export.
- [ ] EDT-004 Implement color-management policy for JPEG/RAW, profiles, bit depth, white balance, tone, gamut, orientation, and metadata.
- [ ] EDT-005 Build mobile quick-edit budget that always yields to capture and can cancel/defer under heat, memory, storage, or backlog.
- [ ] EDT-006 Build Master high-quality RAW/JPEG engine with session consistency, protected subject/skin masks, crop/straighten, denoise/sharpen, and local corrections.
- [ ] EDT-007 Add hard clipping, color, face/skin naturalness, artifact, crop, mask, output-decode, and checksum guards.
- [ ] EDT-008 Add confidence routing: auto-approve only approved low-risk cases; otherwise original, review, or bounded fallback.
- [ ] EDT-009 Build before/after, synchronized zoom, history, batch propagation, override, compare, approval, rollback, and export UX.
- [ ] EDT-010 Create licensed representative golden corpus across skin tones, lighting, venues, lenses, formats, groups, motion, and failure cases.
- [ ] EDT-011 Run blind expert review, objective measures, subgroup analysis, override/error taxonomy, and release thresholds.
- [ ] EDT-012 Record explicit photographer/manager feedback as governed events; prohibit silent live retraining or deployment.
- [ ] EDT-013 Version, sign, evaluate, canary, monitor, demote, and roll back spot/editor profiles with complete provenance.
- [ ] EDT-014 Prove minimum-device p50/p95/p99, memory, battery, thermal, backlog, crash, and 1,000-shot soak budgets.

## H. Touch Kiosk

- [ ] TCH-001 Inventory all routes/tabs/dialogs/buttons/gestures/admin paths, backend routes, IPC, hardware, storage, and kiosk policies.
- [ ] TCH-002 Harden pairing identity, certificate/secret rotation, revocation, wrong-Master denial, discovery spoofing, and offline recovery.
- [ ] TCH-003 Reconcile album/photo receipt state; never display or sell a destination before its durable authorized receipt.
- [ ] TCH-004 Complete browse/search/filter/favorites/compare/cart/empty/error/offline/restart flows with large catalogue performance.
- [ ] TCH-005 Make pricing, discounts, taxes, tips, currency, cart idempotency, order receipt, and payment handoff server-authoritative.
- [ ] TCH-006 Complete help/assistance, accessibility, timeout/privacy reset, session separation, and customer-data clearing.
- [ ] TCH-007 Prove print, RFID/scanner/camera/serial/printer failure, device disconnect, paper/ink, cancel, duplicate, and recovery.
- [ ] TCH-008 Harden admin escape/override with step-up identity, cooldown, audit, policy restoration, and no local-storage trust.
- [ ] TCH-009 Prove kiosk lockdown, watchdog, crash/reboot/network loss, backend lifecycle, auto-start, update interruption, and rollback.
- [ ] TCH-010 Run packaged minimum-hardware, touch, screen reader, zoom, contrast, sunlight, cleaning, and long-session soak.

## I. Gallery and customer commerce

- [ ] GAL-001 Inventory routes/pages/dialogs/actions, auth entry, tokens, cart, checkout, proofing, share, download, deletion, and error states.
- [ ] GAL-002 Unify magic-link/QR/email-PIN/session rules with bounded expiry, replay denial, event/object scope, revocation, and privacy reset.
- [ ] GAL-003 Require private scoped raster/original access; test IDOR, guessed IDs, expired links, hotlinking, cache, and download limits.
- [ ] GAL-004 Complete grid/lightbox/compare/metadata/favorites/proofing/share/download accessibility and mobile/browser behavior.
- [ ] GAL-005 Make catalogue availability follow authenticated asset/edit/destination receipts and consent/retention policy.
- [ ] GAL-006 Make prices/discount/tax/tip/currency server-owned and cart/checkout idempotent across refresh, duplicate click, and return.
- [ ] GAL-007 Emit verified payment-capture events from signed idempotent webhooks; never trust browser success redirects.
- [ ] GAL-008 Add settlement, refund, partial refund, dispute/chargeback, webhook reorder/replay, and reconciliation producers.
- [ ] GAL-009 Bind paid original downloads to order/item/customer scope, short expiry, single-purpose tokens, audit, and abuse limits.
- [ ] GAL-010 Reconcile standard and MoneyTrash commerce without cross-gallery token, cart, order, object, or entitlement leakage.
- [ ] GAL-011 Test abandoned cart, email failure, payment failure, cancellation, delayed webhook, duplicate webhook, and fulfillment recovery.
- [ ] GAL-012 Meet WCAG complete-process, responsive, Core Web Vitals, image performance, SEO/noindex, consent, and browser matrices.

## J. Management, photographer finance, and operations

- [ ] MGT-001 Inventory every dashboard/page/report/form/button/export/destructive action plus Worker route, role, query, job, and data source.
- [ ] MGT-002 Remove hard-coded mock payroll and every synthetic metric from decision/payable paths; label demos explicitly or delete them.
- [ ] MGT-003 Replace `status != 'Cancelled'` revenue logic with governed operational/captured/settled/refunded/net definitions.
- [ ] MGT-004 Consume immutable projections for order, capture, settlement, refund, attribution, commission, adjustment, approval, payout, and shifts.
- [ ] MGT-005 Define versioned commission/salary/bonus/deduction/overtime/tip/tax policy, effective dates, rounding, caps, and currency.
- [ ] MGT-006 Implement separation of duties for policy, adjustment, reconciliation approval, payout, reversal, and export.
- [ ] MGT-007 Build correction/appeal workflows with reasons, evidence, supervisor/finance decisions, audit, and non-retaliatory handling.
- [ ] MGT-008 Show freshness, source, completeness, provisional/final/unavailable, variance, and drill-through on every KPI.
- [ ] MGT-009 Make photographer command center self-scoped; Management comparisons role-scoped, explainable, controllable, and non-punitive.
- [ ] MGT-010 Complete fleet/desk/hotel hierarchy, assignments, users/roles, equipment, expenses, warehouse, settings, and reporting journeys.
- [ ] MGT-011 Secure CSV/PDF/export, formulas, PII, large queries, injection, download expiry, audit, and least-privilege access.
- [ ] MGT-012 Profile nulls, duplicates, orphans, late events, attribution coverage, source variance, freshness percentiles, and zero-variance fixtures.

## K. MoneyTrash, Website, and secondary mobile products

- [x] MT-001 July remediation records bounded native paths, session isolation, cancellation, partial-failure truth, durable multipart uploads, and no mixed-success claim.
- [ ] MT-002 Prove packaged file/folder picker and drag/drop use one bounded streaming descriptor path with no renderer whole-file read.
- [ ] MT-003 Test huge files/batches, removable-device detach, permission loss, disk pressure, network loss, retry, resume, cancel, restart, checksum, and ownership.
- [ ] MT-004 Keep originals until verified object plus ledger receipt; test duplicate, corrupt part, expiry, purge, cancellation, and restore.
- [ ] MT-005 Complete office/gallery/customer isolation, signed raster/original links, retention, deletion, paid entitlement, and reconciliation.
- [ ] MT-006 Complete approved Electron/Tauri decision, native closure, signing, update, install, crash recovery, and clean-machine proof.
- [ ] WEB-001 Inventory all website routes, links, forms, CTAs, locale/metadata/sitemap/robots, 404/500, consent, and analytics boundaries.
- [ ] WEB-002 Replace stale/dead links and placeholder claims; verify contact/lead flows, spam controls, email failure, privacy, and CRM ownership.
- [ ] WEB-003 Migrate from deprecated Cloudflare adapter path, then prove supported build, preview, staging, custom domain, cache, and rollback.
- [ ] WEB-004 Run responsive/browser/WCAG/Core Web Vitals/image/font/SEO/security-header validation with evidence.
- [ ] MOB-001 Decide product status for `mobile-customer`, `mobile-staff`, and `mobile-client`; archive starters or create owner/release plans.
- [ ] MOB-002 For qualified apps, audit identity, permissions, offline data, biometric/QR handling, deep links, notifications, privacy, accessibility, signing, stores, updates, and deletion.

## L. Cloud Backend and product Workers

- [ ] CLD-001 Define Cloud Backend, Gallery Worker, Management Worker, MoneyTrash Worker, and Update Server bounded contexts and mutation ownership.
- [ ] CLD-002 Build complete route/method/auth/role/tenant/event/object/rate-limit/schema/data/side-effect registry from source.
- [ ] CLD-003 Generate positive and negative tests for public, user, photographer, manager, admin, service, revoked, expired, cross-tenant, and cross-object cases.
- [!] CLD-004 Supply approved staging bindings for D1/R2/KV/queues/AI bindings/domains/secrets and validate source-to-config completeness.
- [ ] CLD-005 Consolidate schema/migration ownership per datastore; prove local/staging clean, N-1, failure, rollback, backup, and restore.
- [ ] CLD-006 Make objects private by default with scoped short-lived access, content disposition, range/cache policy, and access audit.
- [ ] CLD-007 Implement durable idempotent outboxes/consumers, DLQ, replay authorization, poison handling, ordering, concurrency, and observability.
- [ ] CLD-008 Verify Stripe signature, raw body, event idempotency, ordering, capture, settlement, refund, dispute, and reconciliation flows.
- [ ] CLD-009 Verify email/SMS callbacks, retries, suppression, unsubscribe/consent, template injection, PII, bounce, and provider outage.
- [ ] CLD-010 Verify cron/retention/purge/export/deletion jobs are scoped, idempotent, observable, reversible where required, and legally approved.
- [ ] CLD-011 Reconcile regional routing/residency/replication/conflict/failover with real bindings and approved data policy.
- [ ] CLD-012 Load-test hot queries, object delivery, webhook bursts, queues, rate limits, Worker CPU/memory, cost, and degraded modes.
- [ ] CLD-013 Charter one update authority with signed metadata and rollback, or remove the placeholder Update Server from deploy scope.

## M. Desktop, installer, licensing, signing, and update

- [x] DSK-001 Desktop audit and July hardening checkpoints identify canonical shells, secure IPC boundaries, payload trust, and release gaps.
- [ ] DSK-002 Align supported Electron/Node/TypeScript/Vite/builder/updater versions and one version source per desktop product.
- [ ] DSK-003 Create shared secure BrowserWindow/preload/IPC/lifecycle/error/log/update foundations without broad product rewrites.
- [ ] DSK-004 Build deterministic native ABI rebuild/unpack/ASAR closure for SQLite, Sharp/Canvas, bcrypt, serial, mDNS, printers, cameras, and helpers.
- [ ] DSK-005 Make installer prerequisite/component/provision/install/verify/repair/upgrade/rollback/uninstall transactional and least-privileged.
- [ ] DSK-006 Verify signed payload manifest, source/destination containment, same-volume staging, atomic swap, interruption, rollback, and safe data preservation.
- [ ] DSK-007 Isolate license private keys offline; implement issuance, hardware binding, expiry, revocation, rotation, backup, dual-control, and audit.
- [!] DSK-008 Obtain approved signing keys/certificates and CI custody; never generate or embed production private material locally.
- [ ] DSK-009 Produce reproducible unpacked apps/installers with Authenticode, SBOM, provenance, hashes, malware/secret scans, and immutable promotion.
- [ ] DSK-010 Test fresh install, N-1 upgrade, repair, interrupted upgrade, rollback, downgrade/tamper denial, uninstall, retained data, and reinstall on clean machines.
- [ ] DSK-011 Prove updater metadata/signature/TLS/channel/cohort/min-version/rollback and remove dev-tree or unsigned fallbacks.

## N. UI, UX, design system, and accessibility

- [ ] UX-001 Inventory tokens, themes, typography, spacing, icons, motion, breakpoints, components, duplicate implementations, and platform variants.
- [ ] UX-002 Define accessible primitives for button, input, select, dialog, menu, toast, table, grid, tabs, date/time, upload, image viewer, and chart.
- [ ] UX-003 Audit information architecture, terminology, navigation depth, breadcrumbs/back, role-specific home, search, and command palettes.
- [ ] UX-004 Audit visual hierarchy, density, consistency, contrast, focus, feedback, empty/error states, skeletons, forms, tables, charts, and destructive patterns.
- [ ] UX-005 Complete customer journeys with keyboard/screen reader/zoom/touch; field journeys with TalkBack/sunlight/gloves/one hand; kiosk journeys with timeout/privacy reset.
- [ ] UX-006 Validate localization, RTL readiness, timezone, calendar, plural, number/currency scale, truncation, and long translated text.
- [ ] UX-007 Add automated axe/static checks plus manual assistive-technology evidence; do not treat automation alone as WCAG proof.
- [ ] UX-008 Add visual regression for critical states at supported sizes/themes while protecting customer media and secrets.
- [ ] UX-009 Measure task success/time/error/recovery with representative photographers, staff, managers, and customers under approved research consent.
- [ ] UX-010 Consolidate duplicate UI only after behavior/accessibility contracts and consumer regression tests pass.

## O. Testing, performance, reliability, and production operations

- [ ] QA-001 Generate CI matrix from the canonical deployable/package manifest; fail on missing or extra production surfaces.
- [ ] QA-002 Make unit/contract/integration tests hermetic, deterministic, parallel-safe, PII-free, and clean-tree preserving.
- [ ] QA-003 Require lint/type/test/build/security/migration/package gates with no fail-open or unreviewed `continue-on-error` path.
- [ ] QA-004 Build ecosystem E2E for camera→Mobile→Master/Kiosk/Cloud, Master→Touch order, upload→Gallery, checkout→download, management→approval/payout, and install→update.
- [ ] QA-005 Add negative matrices for authorization, IDOR, replay, duplicate, stale, wrong destination, wrong currency/timezone, invalid state, malformed media, and injection.
- [ ] QA-006 Add network loss/captive portal/latency, process kill, power loss, disk full, database busy/corrupt, queue poison, provider outage, and clock-skew chaos.
- [ ] QA-007 Define representative workloads and p50/p95/p99 budgets for startup, ingest, edit, grid, search, upload, webhook, query, print, sync, and battery/thermal.
- [ ] QA-008 Run load/soak on minimum and target hardware; track memory/handle/thread/file-descriptor leaks and long-session degradation.
- [ ] QA-009 Establish coverage thresholds by risk and mutation/contract quality; do not optimize for percentage alone.
- [ ] QA-010 Run clean-checkout and clean-machine reproducibility; record environment, command, duration, artifacts, hashes, and skipped gates.
- [ ] OPS-001 Define dev/test/staging/pilot/production isolation, configuration ownership, secret sources, promotion, and drift detection.
- [ ] OPS-002 Implement redacted logs, metrics, traces, correlation IDs, audit retention, queue/sync health, business reconciliation, and device fleet telemetry.
- [ ] OPS-003 Define SLO/SLI/error budgets and alerts for capture loss, receipt lag, payment variance, auth denial anomalies, queue age, crashes, and resource pressure.
- [ ] OPS-004 Create dashboards and runbooks with symptoms, diagnosis, safe action, escalation, rollback, evidence capture, and owner.
- [ ] OPS-005 Prove encrypted backup, restore integrity, RPO/RTO, failed migration, regional outage, lost device, lost key, and ransomware/disaster recovery.
- [ ] OPS-006 Establish support intake, privacy-safe bundles, entitlement, remote assistance boundaries, known issues, escalation, and customer communication.
- [ ] OPS-007 Rehearse security, payment, data-loss, camera, kiosk, updater, deployment, and regional incidents with accountable participants.
- [!] REL-001 Obtain explicit approval before production writes, deployment, signing, DNS/secrets changes, store submission, or customer pilot.
- [ ] REL-002 Build immutable signed release candidates with SBOM/provenance and independent artifact/content review.
- [ ] REL-003 Execute staging smoke, data migration, backup, rollback, accessibility, performance, security, hardware, and support readiness gates.
- [ ] REL-004 Canary by bounded tenant/event/device cohort with automated health stop/rollback and reconciliation before expansion.
- [ ] REL-005 Run independent Go/No-Go; publish known risks, owners, rollback criteria, monitoring window, and final evidence index.

## P. Immediate dependency-ordered queue

1. `SEC-007` extend the evidenced command-center AEAD slice across capture uploads and legacy LAN flows, then complete authenticated relocation, managed certificate/key rotation, fail-closed TLS, release cleartext denial, and recovery/attack testing.
2. `MAS-007`, `GAL-007`, `GAL-008`, `MGT-004`, and `AND-013` connect real producers/outboxes to the immutable event foundation.
3. `EDT-001` through `EDT-004` establish editor provenance/recipe/color contracts before advanced AI work.
4. `AND-014` complete independent Kiosk/Cloud workers and receipts.
5. `AND-015` and `AND-016` complete paired financial-state runtime and Android accessibility/field acceptance.
6. `AND-007` through `AND-010` run physical D7000 durability certification.
7. `AND-017`, `QA-001` through `QA-003` restore frozen install and clean full validation.
8. `SEC-009`, `CLD-004`, `DSK-008`, and `REL-001` remain owner/authority blockers, not assumptions the coding agent may invent.

The queue advances only when the preceding evidence gate passes or a documented owner accepts a bounded alternate dependency.
