# ClickFlash 360° Ecosystem Audit — Master Prompt

Use this prompt from the ClickFlash repository root with Codex or Claude Code. It is designed for a source-read-only audit: the agent may create the evidence pack in the designated audit-output directory, but it must not change application code, configuration, migrations, dependencies, generated releases, or external systems.

The repository seed below was observed on 2026-07-25. It is a discovery aid, not a source of truth. The auditing agent must re-inventory the checkout at the start of every run.

---

## START OF PROMPT

You are the lead auditor for the complete ClickFlash photography ecosystem. Operate simultaneously as:

- a principal full-stack and distributed-systems engineer;
- a product and photography-workflow auditor;
- an application-security and privacy architect;
- a desktop, mobile, web, kiosk, and accessibility UX reviewer;
- an SRE, release engineer, database reviewer, and incident-readiness assessor;
- a QA lead responsible for realistic, risk-based coverage; and
- a skeptical technical-program lead responsible for a sequenced remediation and rearchitecture roadmap.

Your task is to perform a repository-aware, evidence-driven, source-read-only 360° audit and produce the complete Markdown evidence pack defined below. Do not implement remediations in this run.

Apply flagship-class long-horizon execution: maintain durable coverage and evidence state, recover carefully from inconclusive tool results, challenge your own conclusions, and favor completeness and accuracy over superficial speed.

### 1. Mission and success standard

Determine what ClickFlash actually contains, how its parts really connect, which behaviors are verified, where its documentation and implementation disagree, and what prevents each surface and the connected ecosystem from being safely operated in production.

A successful audit:

1. discovers every relevant tracked and material untracked surface rather than trusting the README or this prompt;
2. assesses every discovered surface independently and in its ecosystem context;
3. backs every material conclusion with reproducible evidence;
4. separates verified facts, evidence-backed inference, hypotheses, and unknowns;
5. traces critical user actions across UI, API/IPC/network, business logic, persistence, feedback, telemetry, retry, and recovery;
6. identifies immediate blockers without exposing credentials or customer data;
7. produces a deduplicated, prioritized, dependency-aware roadmap with testable acceptance criteria; and
8. finishes with an explicit completeness check against this prompt and the discovered coverage ledger.

Do not optimize for a quick verdict. Optimize for correctness, traceability, coverage, and useful sequencing. Keep private reasoning private; publish concise evidence, decision rationale, uncertainties, and results, never hidden chain-of-thought.

### 2. Non-negotiable operating contract

#### 2.1 Plan and checkpoint first

- Read all applicable `AGENTS.md`, `CLAUDE.md`, repository rules, and tool/skill instructions before auditing.
- Begin with a written plan and a live coverage ledger.
- Record the audit commit, branch, dirty-tree baseline, operating system, runtime/tool versions, and audit timestamp.
- Preserve all pre-existing user changes. Never absorb, rewrite, revert, stage, or delete them.
- Re-plan when discovery reveals additional surfaces or invalidates the initial topology.
- If the full audit cannot fit in one session, leave every artifact internally consistent and every coverage-ledger row marked `Complete`, `Partial`, `Blocked`, or `Not started`. Never silently omit work.

#### 2.2 Source-read-only boundary

The only permitted repository writes are new or updated audit artifacts below:

`docs/audits/clickflash-360/<YYYY-MM-DD>/`

If that directory already contains user-authored work, create a new timestamped sibling instead of overwriting it. Do not edit anything outside the chosen audit-output directory.

Prohibited actions include:

- changing source, tests, snapshots, lockfiles, manifests, configurations, migrations, docs outside the audit pack, or generated releases;
- dependency installation or upgrade;
- `--fix`, snapshot updates, format writes, code generation, database initialization, migrations, seeds, cleanup scripts, signing, packaging, or release assembly;
- commit, stage, branch, push, pull-request, merge, tag, publish, deploy, DNS, Cloudflare, Stripe, email/SMS, webhook, queue, object-storage, production database, or other external mutation;
- destructive Git/filesystem/database commands, including automatic rollback of files changed by a validation command; and
- opening or exercising production endpoints, accounts, tenant data, payment flows, hardware, or customer media without separate explicit authorization.

Read-only Git inspection, static analysis, and carefully gated local validation are allowed. A build or test is allowed only after its script and configuration are inspected and shown not to mutate tracked source or contact real external systems. Prefer existing dependencies and isolated synthetic fixtures. Capture `git status --short` before and after each dynamic validation batch. If a command unexpectedly changes tracked files, stop that validation path, preserve evidence, do not revert automatically, and report the exact paths.

#### 2.3 Secret and sensitive-data safety

- Never print, copy, summarize, hash into the report, or expose the contents of `.env*`, `*.pem`, private keys, credentials, tokens, signing material, local databases, customer photos, biometric data, logs containing personal data, or production exports.
- Inventory secret-shaped files using path, tracking status, ignore status, permissions where safe, and references—not values.
- Use `git ls-files`, `git check-ignore`, configuration references, and redacted scanner summaries. Do not `cat`, `Get-Content`, `type`, or otherwise open secret-bearing files.
- Treat database files and media directories as sensitive until proven synthetic. Prefer schemas and migrations over live/local database contents.
- Redact authorization headers, cookies, query secrets, account identifiers, emails, phone numbers, room numbers, device fingerprints, payment identifiers, signed URLs, and tenant/customer data from all logs and artifacts.
- If a tool cannot guarantee redaction, do not run it. Record the skipped check and the safer validation procedure required.
- At the 2026-07-25 seed snapshot, `payload_private_key.pem` was returned by `git ls-files`. Re-verify only its path/tracking history and safe references; do not open it. Treat confirmed repository exposure of real private signing material as a potential critical blocker requiring revocation/rotation and history remediation, not merely file deletion.

#### 2.4 Evidence discipline

Every material statement must be one of:

- **Verified fact** — directly supported by current source/configuration, a reproducible command, or a safely observed local runtime;
- **Evidence-backed inference** — the evidence strongly suggests the conclusion, but runtime or external validation is missing;
- **Hypothesis** — plausible and important enough to test, with a stated validation method;
- **Unknown** — evidence is missing, contradictory, inaccessible, sensitive, or outside authorization.

Never convert an inference, TODO, test name, type definition, migration, mock, screenshot, README claim, previous audit finding, or commented code into a claim that production behavior exists.

Use stable evidence IDs (`EVID-0001`, `EVID-0002`, ...). Each evidence record must include:

- exact repository-relative path and tight line number(s), or exact command and relevant redacted output;
- evidence type and capture date;
- applicable commit/dirty-state context;
- what the evidence proves;
- what it does **not** prove; and
- linked surface, journey, interface, and finding IDs.

For runtime observations, include environment, prerequisites, route/action, test data class, expected result, actual result, and cleanup state. Cite secondary documents only as claims to reconcile against primary evidence.

### 3. Repository baseline seed to verify, expand, and classify

Do not assume these counts or roles remain correct. Re-run discovery, add missing surfaces, and explain all count differences.

#### 3.1 Seed surfaces observed on 2026-07-25

| Area | Seed inventory | Mandatory audit treatment |
|---|---|---|
| `apps/` | 17 directories: `cloud-backend`, `docs`, `gallery`, `installer`, `license-generator`, `management`, `master`, `mcp-server`, `mobile-client`, `mobile-customer`, `mobile-photographer`, `mobile-staff`, `moneytrash`, `pb_data`, `ride-node`, `touch`, `website` | Classify and assess each directory; do not assume every directory is an app or that every app has `package.json`. |
| `workers/` | 4 directories: `gallery-worker`, `management-worker`, `moneytrash-worker`, `update-server` | Treat every Worker as an independent deployable until evidence proves otherwise. |
| `packages/` | 13 directories: `api`, `config`, `database`, `errors`, `licensing`, `logger`, `shared`, `telemetry-web`, `test-utils`, `types`, `ui`, `utils`, `validation` | Audit public contracts, actual consumers, boundary violations, duplication, ownership, build/test health, and version drift. |
| `services/` | `master-cpp` plus an observed empty `platform` directory | Audit the C++ service, CMake/vcpkg/Docker surfaces, migrations, parity/duplication, and callers. Classify empty/generated placeholders explicitly. |
| Root/supporting areas | `.github/workflows`, `docs`, `e2e`, `tests`, `test-suite`, `scripts`, root build/release scripts and configs, `ClickFlash_Release_v2.0`, `ClickFlash_Release_v3.0`, `.baseline`, `.clickflash-plans`, `pb_data`, `Test`, `TunnelManager`, `tools` | Distinguish tracked source, operational tooling, test assets, plans, generated output, local state, archives, and orphaned material. |

Known seed technologies and contradictions to verify rather than repeat:

- `README.md` describes a “6-App Ecosystem,” while the tree contains materially more application, service, worker, mobile, tooling, documentation, and release surfaces.
- Fifteen `apps/` directories had `package.json`; `apps/ride-node` had Python/`pyproject.toml`; `apps/pb_data` appeared data-bearing.
- `pnpm-workspace.yaml` included `apps/**`, `packages/*`, `workers/*`, and `services/*`, while other root test/support projects also existed.
- Electron/Vite/React surfaces, Expo/React Native clients, Cloudflare Workers, Next.js, a Docusaurus docs app, a TypeScript MCP server, a Python ride-node, and a C++ master service were all represented.
- Multiple migration/schema families existed under app backends, workers, `packages/database`, services, and `docs/archive`; determine canonical ownership and ordering.
- Eleven GitHub workflow files were observed. Re-inventory their triggers, permissions, gates, secrets, environments, artifacts, and deployment ownership.
- Existing audits under `docs/audits/`, ADRs under `docs/ADR/`, archived backends/migrations under `docs/archive/`, and the root orchestrator prompt are secondary evidence. Revalidate their claims against the current checkout.
- The checkout was dirty when this prompt was authored. Always establish a fresh baseline and distinguish pre-existing changes from audit outputs.

#### 3.2 Discovery scope

Inventory at minimum:

- tracked, ignored, generated, untracked, vendored, archived, release, fixture, cache, log, database, and media-bearing directories;
- all language/build manifests, workspace membership, lockfiles, package names, versions, scripts, runtime constraints, path aliases, and dependency edges;
- application entrypoints, processes, windows, preload scripts, IPC exposure, native modules, background jobs, scheduled tasks, startup behavior, and update mechanisms;
- browser routes, nested routes, redirects, loaders/actions, navigation, deep links, error boundaries, print routes, and unreachable screens;
- every user-visible page/screen, menu, button, link, form, dialog, table action, context action, bulk action, keyboard shortcut, empty/loading/error/offline state, and placeholder;
- HTTP/RPC/MCP APIs, Worker routes, middleware, WebSockets, SSE, LAN discovery, queues, events, webhooks, IPC channels, native bridges, and third-party integrations;
- SQLite/D1 schemas, migration ledgers, seeds, indexes, triggers, object storage, cache/KV, local files, backups, retention/deletion jobs, and data ownership;
- authentication, authorization, sessions, licensing, device identity/pairing, signing, payments, uploads, sync, analytics, telemetry, notifications, and updates;
- Docker, Electron Builder, Tauri/native, Expo/mobile, CMake, Cloudflare/Wrangler, Vercel/Pages, CI/CD, release scripts, installer assets, signing, checksums, and deployment targets;
- unit, component, integration, contract, E2E, visual, accessibility, performance, resilience, security, migration, installer, update, backup/restore, and smoke tests;
- root scripts, one-off migrations/fixes, operational tools, generated code dumps, release bundles, plans, audit reports, documentation, runbooks, and ownership signals; and
- Git references/imports/script callers/config bindings needed to determine whether a surface is live, duplicated, dead, or unknown.

Use targeted discovery (`rg`, manifest parsing, Git file lists, focused AST/framework searches where available). Exclude dependency caches and generated output from source analysis only after documenting and justifying the exclusion. Do not mistake ignored or untracked state for irrelevance.

### 4. Truth reconciliation and lifecycle taxonomy

Create a row for every discovered surface and classify it as exactly one primary state:

- **Active** — current user/business behavior or deployment is evidenced;
- **Supporting** — directly supports an active surface but is not independently user-facing;
- **Experimental** — intentional trial/prototype with evidence;
- **Generated** — derived output with a reproducible source;
- **Duplicate** — overlapping implementation with a more authoritative owner;
- **Legacy** — superseded but still referenced or needed for compatibility;
- **Archived** — intentionally retained and excluded from current execution;
- **Orphaned** — no credible caller, owner, build, deploy, or retention rationale found;
- **Unknown** — evidence is insufficient or contradictory.

For each classification record purpose, users, owner role if known, entrypoint, build/test/deploy evidence, callers/consumers, data owned, last relevant evidence, confidence, contradictions, and the validation needed to change the classification.

Reconcile at least:

- source vs manifests vs workspace configuration;
- imports/callers vs declared dependencies;
- routes vs navigation vs tests;
- migrations vs runtime schema initialization vs deployment scripts;
- environment variable definitions vs usage vs CI/deploy configuration;
- README/ADR/deployment/runbook claims vs current code;
- release bundles vs source/build provenance;
- duplicated backend/API/schema implementations;
- inconsistent product/package/service names and versions;
- CI “success” vs commands that suppress, continue after, or fail to gate errors;
- local, staging, and production topology;
- test coverage claims vs executable assertions and realistic fixtures; and
- declared ownership vs actual mutation authority for shared data and contracts.

Log every contradiction in the documentation-drift register even when it does not become a defect finding.

### 5. Audit units and required per-surface assessment

Audit every discovered app, worker, service, package, deployable, and material support surface independently. At minimum, create explicit scorecard rows for:

- Master Portal;
- Touch Kiosk;
- MoneyTrash uploader/desktop surface;
- Management;
- Gallery;
- Website;
- Cloud Backend;
- Installer;
- License Generator;
- MCP Server;
- Docusaurus docs app;
- `mobile-client`, `mobile-customer`, `mobile-photographer`, and `mobile-staff`;
- Python `ride-node`;
- C++ `master-cpp`;
- every Cloudflare Worker;
- every shared package;
- CI/CD and release/installer tooling as an operational surface; and
- every additional deployable or runtime discovered during inventory.

For each surface, document:

1. **Identity and purpose** — intended users, business capability, lifecycle class, owner, runtime, entrypoints, deployment target, and production evidence.
2. **Feature reality** — promised, implemented, reachable, tested, deployed, placeholder, duplicated, broken, misleading, or unknown capabilities.
3. **Routes and controls** — every page/screen/route and user action, including states, permissions, validation, side effects, feedback, recovery, and test evidence.
4. **Interfaces** — inbound/outbound APIs, IPC, WebSockets, events, files, native bridges, databases, storage, third parties, versioning, and error contracts.
5. **State and data** — ownership, persistence, schema, migrations, caching, offline behavior, synchronization, retention, deletion, backups, and privacy.
6. **Security** — trust boundaries, authn/authz, validation, injection, secrets, sandboxing/hardening, abuse controls, tenant isolation, logging, and update trust.
7. **UX and accessibility** — information architecture, consistency, responsive/touch behavior, keyboard/focus/semantics, feedback, errors, localization, and photography workflows.
8. **Performance and resilience** — startup, bundle/resource cost, queries, rendering, image processing, concurrency, retries, idempotency, timeouts, backpressure, recovery, and limits.
9. **Quality evidence** — test types, realism, determinism, assertions, gaps, CI execution, skipped/flaky tests, and requirements-to-test traceability.
10. **Operations** — configuration, health, telemetry, alerts, SLOs, deploy/rollback, signing, reproducibility, backups/restore, incident response, and supportability.
11. **Maintainability** — cohesion, coupling, dependency direction, duplication, god modules, unsafe types, conventions, dead code, documentation, and upgrade risk.
12. **Readiness decision** — local, staging, and production readiness; blockers; conditional gates; residual risk; and the minimum evidence needed for a changed verdict.

### 6. Route, page, and action trace protocol

Assign stable IDs to routes/screens (`ROUTE-<surface>-NNN`) and controls/actions (`ACT-<surface>-NNN`). Build the inventory from source and then reconcile it with navigation, tests, runtime observations, and documentation.

For every material action trace:

`actor → visible control/trigger → client validation → state transition → API/IPC/native/network boundary → server/handler validation → authorization → business rule → persistence/side effect → response → UI feedback → telemetry/audit → retry/idempotency → recovery/compensation`

Record:

- route/screen and action label;
- reachability and preconditions;
- role/permission;
- input and validation;
- handler/call chain with evidence;
- data read/written and owner;
- success, loading, empty, validation-error, server-error, offline, timeout, duplicate, cancellation, and partial-failure behavior;
- user feedback and accessible announcement/focus behavior;
- telemetry/audit evidence;
- tests and observed result;
- status: `Verified working`, `Likely working`, `Broken`, `Unreachable`, `Duplicate`, `Placeholder`, `Misleading`, `Insecure`, `Untested`, or `Unknown`; and
- linked findings.

Do not mark an action “working” because a button renders, a mock succeeds, a handler exists, or a test file is named after it.

### 7. Cross-ecosystem contracts and journeys

Audit shared behavior across all producers and consumers:

- identity, login, sessions, refresh/revocation, RBAC/resource authorization, tenant/studio/hotel scoping;
- offline licensing, device identity, hardware binding, key rotation/recovery, installer trust, application signing, updates, and rollback;
- Master/Touch pairing, LAN discovery, IPC/WebSocket contracts, kiosk provisioning, authentication, liveness, and reconnect;
- capture/import, media metadata, thumbnails, high-resolution originals, color profiles, culling/editing, watermarking, transfer, gallery publication, retention, and deletion;
- albums, destinations, sessions, bookings, customers, staff, photographers, inventory, pricing, taxes, discounts, orders, tips, payments, payroll/ledger, and analytics;
- cloud synchronization, schema/contract versions, sequence/vector-clock logic, queues, retries, idempotency, conflict resolution, tombstones, duplicate events, partial failure, and clock drift;
- resumable/multipart uploads, cancellation, checksum/integrity, quotas, signed URLs, R2/D1/KV/cache use, and orphan cleanup;
- Gallery auth/proofing/favorites/cart/checkout/fulfillment/refunds/webhooks;
- telemetry, audit trails, diagnostics, fleet health, notifications, support workflows, and privacy requests; and
- compatibility across desktop, mobile, web, Worker, Python, C++, archived, and release-bundled implementations.

Create end-to-end journey maps for:

1. photographer setup, capture/import, cull/edit, publish, sell, and fulfill;
2. studio staff operations, bookings, customer assistance, order/payment handling, and closeout;
3. kiosk customer identification, photo review, selection, order, payment/handoff, and privacy exit;
4. online gallery customer access, proofing, favorites, cart, payment, delivery, and support;
5. administrator provisioning, roles, pricing, fleet, analytics, payroll, privacy, and incident actions;
6. installer/operator initial install, license activation, pairing, upgrade, rollback, backup, restore, and uninstall;
7. mobile photographer/staff/customer workflows and degraded-connectivity recovery; and
8. support personnel diagnosis, safe remediation, audit evidence, and escalation.

For each journey include normal, authorization failure, invalid input, offline/connectivity loss, timeout, duplicate submission, process restart, partial persistence, retry, cancellation, recovery/compensation, observability, privacy, and security-abuse paths. Explicitly identify handoff gaps and incompatible contracts.

### 8. Architecture and rearchitecture assessment

Produce evidence-backed current-state diagrams before recommending a target state:

- system context;
- containers/runtimes;
- source/package dependency graph;
- API/IPC/WebSocket/event integrations;
- database/storage ownership;
- trust boundaries and privileged operations;
- deployment topology; and
- critical media/order/payment/sync data flows.

Use Mermaid where it remains readable; split diagrams by domain when needed. Mark unknown or inferred edges visually and cite an evidence table below each diagram.

Evaluate:

- modularity, cohesion, coupling, dependency direction, state/data ownership, interface versioning, portability, scalability, and maintainability;
- frontend/backend/Desktop/Electron/Tauri/native/mobile/Cloudflare/Python/C++ overlap;
- duplicate services, schemas, migrations, contracts, validation, domain types, UI systems, and deployment owners;
- god modules, circular dependencies, hidden runtime coupling, cross-package source imports, ad hoc shared folders, and configuration drift;
- offline-first boundaries, consistency model, sync authority, failure domains, and recovery;
- whether consolidation reduces risk or would create an unsafe big-bang migration; and
- build/release reproducibility, platform assumptions, and long-term support burden.

For every target-architecture recommendation label the action:

`Retain`, `Repair`, `Consolidate`, `Extract`, `Replace`, `Deprecate`, or `Delete after verification`.

Include rationale, affected surfaces, prerequisites, contract/compatibility constraints, incremental migration steps, data migration/dual-read-write implications, rollback, observability, test gates, effort, expected value, regression risk, and the evidence that would prove completion. Do not recommend consolidation solely because code looks similar.

### 9. UI, UX, accessibility, and photography workflow audit

Inspect source, styles, component states, tests, and safe local runtime behavior where available. Assess:

- information hierarchy, navigation, discoverability, terminology, workflow length, error prevention, undo/recovery, and consistency;
- typography, spacing, color, contrast, icons, density, component variants, dark mode, responsive behavior, viewport overflow, and visual states;
- loading, skeleton, empty, no-results, offline, degraded, validation, permission, error, success, progress, cancellation, and retry states;
- desktop keyboard shortcuts, kiosk touch targets/ergonomics/privacy, web responsive behavior, mobile safe areas/gestures, and print layouts;
- WCAG 2.2 AA semantics, names/roles/values, headings/landmarks, labels/instructions, keyboard order, focus visibility/traps/restoration, screen-reader announcements, contrast, zoom/reflow, reduced motion, timeouts, authentication, and target size;
- localization, pluralization, dates/numbers/currency/time zones, text expansion, and RTL readiness; and
- high-resolution media performance, aspect/orientation, EXIF/privacy, ICC/color-sensitive presentation, thumbnails, comparison, zoom, selection/favorites, bulk operations, upload progress, interruption recovery, duplicate handling, and destructive confirmations.

Inventory component libraries, tokens, duplicate primitives, app-specific needs, and accessibility behaviors. Produce a measured design-token and reusable-component consolidation plan without forcing kiosk, mobile, desktop, and marketing experiences into inappropriate identical layouts.

### 10. Security, abuse, and privacy audit

Build a threat model containing assets, actors, entry points, trust boundaries, attacker goals, abuse cases, security controls, evidence gaps, and mitigations. Distinguish:

- **confirmed exploitable defect**;
- **confirmed unsafe control/configuration**;
- **suspected risk requiring validation**;
- **hardening opportunity**; and
- **out-of-scope/unverified external control**.

Audit at minimum:

- authentication, session lifecycle, passwordless/device flows, account recovery, authorization/IDOR, tenant isolation, admin overrides, and least privilege;
- CSRF, CORS, CSP, XSS/output encoding, SQL/command/template injection, SSRF, open redirect, path traversal, prototype pollution, deserialization, and request smuggling assumptions;
- uploads, MIME/content validation, archives, image parsers, EXIF/GPS/metadata leakage, decompression bombs, malware handling, signed URLs, quotas, and object ownership;
- Electron context isolation, sandbox, `nodeIntegration`, preload/API allowlists, navigation/window controls, permissions, protocol handlers, local servers, IPC sender validation, and updater trust;
- Tauri/native/plugin permissions if actually present; mobile permissions, deep links, local storage, certificate/network assumptions, and screenshot/clipboard/privacy exposure;
- LAN discovery, pairing, WebSockets, replay, impersonation, message authentication, origin checks, rate limiting, network exposure, and hostile-local-network behavior;
- secrets in current tree/history/config/logs/releases, signing-key custody, credential rotation, CI secret use, environment separation, and developer tooling;
- licensing forgery/tampering/replay, hardware-binding privacy and recovery, clock manipulation, revocation, grace periods, key rollover, and fail-open behavior;
- payment price authority, Stripe client/server boundaries, webhook signature and replay/idempotency, fulfillment, refund/dispute, audit, and test/live isolation;
- Worker routes/bindings, D1/R2/KV access, CORS, rate limits, durable consistency assumptions, error leakage, and provider permissions;
- supply chain, lockfile integrity, lifecycle scripts, actions pinning, artifact provenance, code signing/notarization, update signing, release checksums, and dependency vulnerabilities;
- logging/telemetry minimization, sensitive-field redaction, audit integrity, access, retention, alerts, and incident forensics; and
- customer-photo/biometric/payment/staff privacy: lawful purpose, consent where applicable, minimization, tenant isolation, encryption, local protection, retention, deletion, export, backups, restore copies, subprocessors, and audit trails.

Map applicable findings to OWASP ASVS, OWASP API Security Top 10, Electron security guidance, WCAG security-adjacent requirements, and relevant privacy principles. If current official references are unavailable, state the version/date limitation. Do not claim legal compliance; identify evidence and specialist review needed.

Every Critical or High security item must state exploit preconditions, affected trust boundary, likely impact, current evidence, safe reproduction/validation method, immediate containment, durable remediation, regression tests, rotation/history-cleanup need, and production-blocker decision.

### 11. Quality, reliability, performance, and operations

#### 11.1 Test and failure-mode audit

Inventory all test projects/configurations and map them to surfaces, routes, interfaces, journeys, requirements, and failure modes. Evaluate assertion quality, realism, isolation, determinism, fixtures, mocks, time/network assumptions, cleanup, flaky behavior, skipped/disabled tests, coverage exclusions, CI parity, and false-confidence risk.

Create a missing-test matrix covering:

- unit, component, integration, contract, API/IPC/WebSocket, database/migration, and E2E;
- visual regression and WCAG automated/manual checks;
- authn/authz/tenant isolation, upload/payment/webhook/licensing/update security;
- offline, reconnect, retry, idempotency, duplicate, conflict, clock drift, partial failure, restart, disk-full, corruption, and recovery;
- performance/load/soak, D1 contention/Worker limits, large galleries/media, memory/CPU, and backpressure;
- installer/upgrade/downgrade/uninstall, signing/update, backup/restore/disaster recovery; and
- production smoke and synthetic monitoring.

Prioritize tests by business/security risk, not coverage percentage alone.

#### 11.2 Performance

Assess bundle/chunk sizes, startup and time-to-interactive, Electron memory/process behavior, React render churn, list virtualization, image decode/transform/cache, thumbnail strategy, database query/index/pagination behavior, N+1 patterns, sync batching, WebSocket lifecycle, upload concurrency/memory/retries, Worker CPU/memory/subrequest limits, D1/R2/KV patterns, mobile battery/network/storage, and C++/Python service resource behavior.

Use measurements only when safely reproducible. Otherwise label bottlenecks as static risks and provide a measurement plan, datasets, budgets, and pass/fail thresholds. Never invent Lighthouse, latency, throughput, memory, or coverage numbers.

#### 11.3 Production and operational readiness

Assess:

- environment/configuration inventory, validation, defaults, separation, and ownership;
- CI triggers, permissions, concurrency, caching, artifact trust, failure gates, branch/environment protections, and secret exposure;
- deployment targets, owners, ordering, migrations, compatibility, health checks, smoke tests, feature flags, canaries, rollback, and verification;
- installer/release reproducibility, dependency pinning, signing, checksums, SBOM/provenance, version consistency, update channels, and downgrade safety;
- database/object-store backups, restore procedure and testing, retention, disaster recovery, RPO/RTO evidence, and data reconciliation;
- structured logs, metrics, traces, audit events, dashboards, alerts, SLO/SLI definitions, on-call ownership, incident playbooks, support diagnostics, and privacy-safe telemetry;
- capacity, quotas, rate limits, cost risks, provider limits, dependency updates, vulnerability response, certificate/key rotation, and end-of-life tracking; and
- local-development readiness, staging fidelity, and production readiness as separate verdicts.

Generate a release gate for every deployable surface and for the connected ecosystem. A green build alone is never sufficient.

### 12. Safe validation protocol

Before running any command:

1. inspect its manifest/script/config implementation;
2. classify expected filesystem, network, process, database, and external effects;
3. verify it does not require or consume real credentials/customer data;
4. record the pre-command dirty state;
5. prefer the smallest focused check;
6. set a reasonable timeout and avoid persistent background processes unless safely managed; and
7. record exact command, cwd, environment assumptions, exit code, duration, redacted result, generated artifacts, and post-command dirty state.

Normally safe candidates after inspection include type checks, non-fixing lint, focused unit tests, test enumeration, static route/interface extraction, and local builds directed to already ignored output. Commands named `deploy`, `release`, `publish`, `migrate`, `seed`, `init`, `setup`, `clean`, `fix`, `sign`, `package`, `install`, `update`, or `prod` are prohibited unless their implementation is proven harmless **and** separate explicit authority is obtained; in this audit, default to not running them.

Do not run production-configured Playwright suites, Stripe calls, Wrangler deploy/tail/secret commands, update clients, SMTP/SMS, webhook delivery, LAN broadcast/discovery, native hardware access, or local DB tests against non-synthetic files. Use mocks and synthetic isolated data only when already available and safe.

For every skipped validation, state:

- why it was unsafe, unavailable, too costly, or inconclusive;
- what evidence was still obtained;
- the exact safe environment/fixture/authorization needed; and
- the proposed command or procedure for a future validation.

### 13. Scoring, severity, confidence, effort, and verdicts

#### 13.1 Per-surface scoring

Score each dimension from 0 to 5 and cite evidence:

`Functionality`, `Architecture`, `UI consistency`, `UX/workflow`, `Accessibility`, `Performance`, `Security/privacy`, `Testing`, `Maintainability`, `Operations`, `Documentation`, `Production readiness`.

Anchors:

- **0 — Absent/unsafe:** no credible implementation or an unacceptable known condition;
- **1 — Initial:** fragments/placeholders, severe gaps, or little reliable evidence;
- **2 — Weak:** partially implemented with material defects and limited validation;
- **3 — Adequate:** core behavior exists, with manageable known gaps and meaningful tests;
- **4 — Strong:** comprehensive implementation and validation with minor residual risk;
- **5 — Proven:** current, reproducible, production-representative evidence supports the requirement.

Use `N/A` only with a reason. Do not use an average to hide a blocker. Show raw dimension scores, evidence strength, blocker count, and verdict.

#### 13.2 Finding severity

- **Critical:** likely catastrophic confidentiality/integrity/availability, safety, payment, signing/update, tenant-wide, irreversible data-loss, or immediately exploitable production risk; normally a production blocker.
- **High:** serious user/business/security/reliability failure with broad or likely impact; usually blocks the affected surface or journey.
- **Medium:** material but bounded defect, operational burden, or control gap with a workaround or lower likelihood.
- **Low:** limited-impact quality, consistency, maintainability, or hardening issue.
- **Info:** observation, debt signal, or improvement with no current demonstrated defect.

Also record:

- **confidence:** `Verified`, `High`, `Medium`, or `Low`;
- **production blocker:** `Yes`, `Conditional`, or `No`, with affected surface/journey and release gate;
- **impact:** user, business, security/privacy, technical, and operational;
- **effort:** `XS` (<1 day), `S` (1–3 days), `M` (4–10 days), `L` (2–6 weeks), `XL` (>6 weeks), always with uncertainty;
- **regression risk:** `Low`, `Medium`, or `High`; and
- **priority:** dependency-aware order based on severity, exposure, blast radius, unblock value, effort, and migration risk.

#### 13.3 Readiness verdicts

For local, staging, and production, use:

- **No-Go:** one or more unaccepted blockers or insufficient evidence for a critical control;
- **Conditional:** usable only under explicit constraints with named gates, owners, and expiry;
- **Ready:** all applicable gates have current representative evidence and residual risks are explicitly accepted by an authorized owner.

“Unknown” evidence for a critical control cannot yield `Ready`.

### 14. Finding and backlog schemas

Use stable finding IDs:

`CF360-<DOMAIN>-NNN`, where domain is one of `DISC`, `FUNC`, `ARCH`, `DATA`, `SYNC`, `UX`, `A11Y`, `SEC`, `PRIV`, `PERF`, `TEST`, `OPS`, `DOC`, or another documented stable code.

Every finding must contain:

| Field | Required content |
|---|---|
| ID and title | Stable ID and concise problem statement |
| Status | Open, needs validation, accepted, superseded, or duplicate-of |
| Affected scope | Surfaces, versions/configurations, roles, routes/actions, interfaces, journeys, data |
| Category and classification | Domain plus confirmed defect/risk/hardening/drift as applicable |
| Severity / confidence / blocker | Definitions above, with rationale |
| Evidence | Evidence IDs with exact path/line or command result |
| Fact vs uncertainty | Verified facts, inference, unknowns, and contradictory evidence |
| Reproduction/validation | Safe prerequisites and deterministic steps; no secret/customer data |
| User/business impact | Who is affected and how |
| Technical/security/operational impact | Failure mode, trust boundary, blast radius, and downstream effects |
| Root cause | Evidence-backed cause or explicit hypothesis |
| Immediate containment | Reversible risk reduction, especially for Critical/High |
| Durable remediation | Smallest credible fix plus alternatives/tradeoffs |
| Dependencies and sequencing | Prerequisites, consumers, compatibility, data/deploy order |
| Effort and regression risk | Range, uncertainty, and risky areas |
| Acceptance criteria | Observable, testable completion conditions |
| Required tests/telemetry/rollback | Regression, migration, detection, and recovery proof |
| Suggested owner role | Role, not an invented person |
| Standards mapping | Applicable OWASP/WCAG/Electron/privacy/control references |

Deduplicate findings by root cause. Use `duplicate-of` links and preserve all affected evidence rather than inflating counts.

Every roadmap/backlog item must link findings and include outcome, scope, non-goals, dependencies, implementation outline, migration/rollback, acceptance criteria, validation, owner role, effort, risk, and target phase.

### 15. Required Markdown evidence pack

Create the following files inside the chosen audit-output directory:

| File | Required contents |
|---|---|
| `README.md` | Audit identity, commit/dirty-state, scope, operating constraints, artifact index, status, and navigation |
| `00-audit-charter-and-coverage.md` | Plan, definitions, exclusions, coverage ledger for every discovered surface, completeness status, and self-audit checklist |
| `01-executive-audit-report.md` | Executive verdict, ecosystem readiness, top systemic risks, business impact, decision points, and go/no-go summary |
| `02-repository-and-deployment-inventory.md` | Verified directories, apps, workers, packages, services, entrypoints, manifests, technologies, owners, classifications, deploy targets, and truth reconciliation |
| `03-surface-scorecards.md` | Independent per-surface scores, readiness verdicts, blockers, evidence strength, and minimum next gates |
| `04-route-page-action-matrix.md` | Routes/screens, navigation, pages, buttons, links, forms, dialogs, tables, actions, states, permissions, traces, status, tests, and evidence |
| `05-interface-data-inventory.md` | APIs, IPC, WebSockets/SSE, MCP/native bridges, queues/events/webhooks, databases/schemas/migrations, R2/KV/files/cache, third parties, versions, auth, owners, and consumers |
| `06-current-architecture.md` | Current system-context, container, dependency, data ownership, trust-boundary, deployment, and critical-flow diagrams with evidence/unknowns |
| `07-user-journeys-and-data-flows.md` | All required personas/journeys, normal and failure/recovery paths, handoffs, data lifecycle, and linked findings |
| `08-ui-ux-accessibility.md` | Per-surface findings, WCAG 2.2 AA assessment, kiosk/mobile/desktop/web distinctions, photography workflows, component/token inventory, and consolidation plan |
| `09-security-privacy-threat-model.md` | Assets, actors, boundaries, abuse cases, vulnerability/control register, privacy lifecycle, standards map, blockers, and safe validation gaps |
| `10-quality-reliability-test-matrix.md` | Test inventory, requirements/routes/interfaces/journeys-to-tests mapping, failure modes, results, flakiness/skips, false confidence, and risk-based strategy |
| `11-performance-operations-release-readiness.md` | Measurements/static risks, budgets, CI/CD, config, deploy/migrations, observability, SLOs, backup/restore/DR, installer/update/signing, per-deployable release gates |
| `12-documentation-drift-register.md` | Contradictory/stale/missing claims, primary evidence, impact, canonical owner, and correction recommendation |
| `13-master-finding-register.md` | Deduplicated findings in the mandatory schema, ordered by dependency-aware priority |
| `14-immediate-blockers-and-quick-wins.md` | 0–72-hour containment/blockers, safe quick wins, owners, gates, and explicit items that must not be rushed |
| `15-30-60-90-day-remediation-program.md` | Sequenced workstreams, capacity assumptions, dependencies, milestones, gates, expected outcomes, and rollback/continuity constraints |
| `16-target-architecture-roadmap.md` | Recommended architecture, retain/repair/consolidate/extract/replace/deprecate/delete decisions, incremental migration waves, compatibility, tests, telemetry, and rollback |
| `17-prioritized-backlog.md` | Testable backlog items with linked findings, acceptance criteria, owners, effort, dependencies, risk, and phase |
| `18-limitations-open-questions-evidence-index.md` | Limitations, unresolved questions, external/manual validation, evidence registry, assumption log, and residual uncertainty |
| `19-command-and-validation-log.md` | Exact safe commands, cwd, timestamps, expected effects, exit/duration, redacted results, before/after dirty state, generated artifacts, skips, and environment limits |

Keep a single canonical finding record in `13-master-finding-register.md`; other artifacts link to it. Keep a single canonical evidence index in file 18. This prevents contradictory duplicates.

If an artifact becomes too large, split it into a same-named directory with an index while preserving the required top-level file as the summary/navigation page.

### 16. Execution phases

#### Phase 0 — Guardrails and baseline

- Read instructions and define the permitted audit-output directory.
- Capture Git identity/dirty state and sensitive-data constraints.
- Inspect root manifests/scripts before any command.
- Create the artifact skeleton, coverage ledger, evidence index, assumption log, and command log.

Exit gate: operating boundary is documented; no source files changed; pre-existing work is protected.

#### Phase 1 — Discovery and truth map

- Inventory all tracked/material untracked surfaces and exclusions.
- Parse manifests/workspaces/configuration and build the initial dependency/deployment map.
- Classify every surface and reconcile counts/roles with README, ADRs, CI, releases, and prior audits.
- Add newly discovered work to the coverage ledger before deeper assessment.

Exit gate: no discovered surface lacks a classification row and audit disposition.

#### Phase 2 — Independent surface audits

- Audit every app, worker, service, package, and operational surface using the common template.
- Extract route/page/action and interface/data inventories.
- Create preliminary scorecards/findings without final ecosystem conclusions.

Exit gate: every in-scope surface is Complete, Partial with explicit gaps, or Blocked with validation needs.

#### Phase 3 — Cross-ecosystem traces

- Trace shared domain contracts and all required journeys.
- Reconcile producer/consumer schemas, error models, auth, versions, sync, media, orders, payments, licensing, updates, telemetry, and privacy lifecycle.
- Build current architecture, trust-boundary, deployment, and data-flow maps.

Exit gate: every critical journey and integration edge has evidence, a status, or an explicit unknown/blocker.

#### Phase 4 — Safe validation

- Select focused checks based on unresolved high-risk questions.
- Apply the safe validation protocol and record exact results.
- Challenge static false positives and tests that create false confidence.

Exit gate: no dynamic check changed source/external state; skipped checks have actionable validation plans.

#### Phase 5 — Synthesis and adversarial review

- Deduplicate by root cause and link all evidence.
- Reassess severity, exploitability, confidence, blockers, and readiness.
- Actively seek counterevidence for every Critical/High finding and every `Ready`/`No-Go` verdict.
- Separate current defects from target-architecture preferences.

Exit gate: all Critical/High items have counterevidence review, containment, durable remediation, acceptance tests, and owner role.

#### Phase 6 — Target state and program

- Design incremental target architecture and migration waves.
- Produce immediate containment, quick wins, 30/60/90-day program, long-term roadmap, and prioritized backlog.
- Preserve operational continuity and rollback at each wave.

Exit gate: every recommendation links to evidence/findings and has dependencies, acceptance criteria, and rollback.

#### Phase 7 — Final completeness audit

- Re-read this prompt and compare every requirement with the coverage ledger and artifact index.
- Verify all discovered surfaces, routes/actions, critical interfaces, journeys, deployables, and findings are represented.
- Check citations, stable IDs, cross-links, count consistency, redaction, and unsupported language.
- Confirm `git status` shows no audit-caused changes outside the audit-output directory.
- Mark limitations honestly; do not call an incomplete audit complete.

Exit gate: the evidence pack is internally consistent, safely redacted, navigable, and explicit about every gap.

### 17. Required challenge questions

Before finalizing, answer with evidence:

1. What exists that the “6-app” narrative omits?
2. Which surfaces are actually built, tested, deployed, or used, and which merely exist?
3. Which backend, schema, migration, auth, licensing, media, payment, and sync implementations compete for authority?
4. Can each critical UI action be traced to a real, authorized, durable effect and user-visible recovery?
5. What happens during network loss, duplicate events, retries, restart, partial failure, clock drift, schema skew, and rollback?
6. Where can customer photos, metadata, biometric identifiers, staff data, payment data, credentials, or signing material leak or outlive policy?
7. Which tests genuinely exercise production contracts, and which mocks or CI behaviors create false confidence?
8. Which release/deployment paths are reproducible, signed, reversible, observed, and actually enforced?
9. Which proposed consolidations reduce risk, and which would create a dangerous big-bang migration?
10. What evidence would change each No-Go or Conditional verdict?
11. What did the audit not inspect, and could any omission reverse the executive conclusion?
12. Did the audit itself expose sensitive data or modify anything outside its evidence directory?

### 18. Communication and completion rules

- Give concise progress updates after each phase, including discovered scope changes, completed artifacts, material blockers, and next work.
- Do not stop at a preliminary inventory when unblocked audit work remains.
- Do not ask the user to choose obvious safe read-only steps. Ask only when access, sensitive data, external runtime validation, or a materially different scope requires new authority.
- Never claim “secure,” “production-ready,” “fully tested,” “100%,” or “complete” without current representative evidence and satisfied gates.
- Never bury a Critical/High blocker in averages or long prose.
- Avoid alarmism: state exploitability, prerequisites, confidence, and counterevidence.
- Do not turn recommendations into code changes in this run.

The final response must state:

1. audit output directory and audited commit/dirty-state;
2. verified surface counts and the largest truth-reconciliation differences;
3. ecosystem and per-deployable go/no-go summary;
4. Critical/High blockers and immediate containment;
5. highest-value 30-day actions and target-architecture direction;
6. validations run, failed, skipped, and why;
7. material limitations that could change the verdict; and
8. confirmation that no files outside the audit-output directory or external systems were modified.

Then link every evidence-pack artifact.

### 19. Start instruction

Begin now from the repository root.

First read the governing instructions, capture the non-secret baseline, inspect existing audit/planning artifacts without trusting them, choose a collision-free audit-output directory, and create the plan plus coverage ledger. Re-inventory the entire checkout before accepting any count or role in this prompt. Do not run tests/builds until their scripts and side effects have been reviewed. Do not open secret-shaped or customer-data-bearing files.

Continue phase by phase until every requirement is complete or explicitly marked Partial/Blocked with evidence and a concrete validation path.

## END OF PROMPT
