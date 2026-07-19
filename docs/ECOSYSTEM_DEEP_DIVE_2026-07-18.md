# ClickFlash Ecosystem Deep-Dive

**Status:** Active baseline audit  
**Date:** 2026-07-18  
**Scope:** Entire repository, with Gallery remaining online-only

## Decision Boundaries

- Gallery is an online-only application and is not a desktop packaging target.
- Management, Website, Gallery, and Cloud Backend remain web/cloud-native unless
  later evidence proves that a scoped change is necessary.
- Desktop products are audited independently before any migration decision.
- External publishing, deployment, repository writes, and releases require
  explicit authorization.
- Existing uncommitted installer work must be preserved and reviewed as its own
  change set.

## Verified Repository Baseline

The root manifest identifies the repository as `clickflash-ecosystem` version
`2.0.0`, using pnpm 10, Turbo, and Node.js 20 or newer.

### Application Directories at Audit Start

| Directory | Current role inferred from repository structure | Target boundary |
| --- | --- | --- |
| `apps/master` | Main desktop application; Electron config present | Desktop audit |
| `apps/touch` | Touch/kiosk desktop application; Electron config present | Desktop audit |
| `apps/installer` | Studio installer; Electron config present | Installer platform |
| `apps/license-generator` | License utility; Electron config present | Desktop/security audit |
| `apps/moneytrash` | Uploader application; Tauri config present | Desktop migration decision |
| `apps/management` | Management web application | Web-native |
| `apps/gallery` | Customer gallery web application | Online-only |
| `apps/website` | Public website | Web-native |
| `apps/cloud-backend` | Unowned legacy Cloudflare backend | Retired after replacement proof |
| `apps/mcp-server` | MCP integration service | Service/tooling audit |
| `apps/mobile-customer` | Customer mobile application | Mobile boundary |
| `apps/mobile-staff` | Staff mobile application | Mobile boundary |
| `apps/docs` | Documentation application | Documentation boundary |
| `apps/pb_data` | PocketBase/runtime data directory | Data/runtime audit |

### Shared Packages

The live tree contains these shared package directories:

- `api`
- `config`
- `database`
- `licensing`
- `logger`
- `shared`
- `telemetry-web`
- `test-utils`
- `types`
- `ui`
- `validation`

### Standalone Workers

The live tree also contains four worker projects outside `apps/`:

- `workers/gallery-worker`
- `workers/management-worker`
- `workers/moneytrash-worker`
- `workers/update-server`

## Confirmed Build and Release Surfaces

Configuration discovery found:

- Electron Builder configurations for Master, Touch, Installer, and License
  Generator.
- A Tauri configuration for MoneyTrash.
- Cloudflare Wrangler configurations for the legacy Cloud Backend at audit start
  and the four canonical standalone workers.
- Vite configurations for Master, Touch, Installer, License Generator,
  Management, Gallery, and MoneyTrash.
- Next.js configuration for Website.

The root scripts directly cover Master, Touch, Management, Gallery, Website,
MoneyTrash, Installer, License Generator, and MCP Server. The root aggregate
lint and type-check scripts do not visibly include the mobile apps, docs app,
Cloud Backend, or standalone workers. This is a validation-coverage finding,
not yet proof that those projects lack their own checks.

## Existing Uncommitted Work

At baseline, the `main` branch matches `origin/main`, with uncommitted changes
limited to Installer implementation/tests and project documentation:

- Installer Electron main/preload and payload transaction modules
- Installer React flow, selection state, and installer types
- Installer pairing and IPC tests
- Installer package metadata
- Desktop audit, installer documentation, roadmap, task, and walkthrough files

These edits predate this ecosystem audit and must not be overwritten or mixed
with unrelated remediation.

## Installer Evidence Already Established

The current installer milestone has previously produced a Windows NSIS package
with transactional fresh-install and same-release repair behavior, rollback,
configuration preservation, link/junction rejection, and separate source and
destination verification. Its prior focused validation reported 59 passing
tests plus successful type checking and linting.

This evidence is useful but remains scoped to the Installer. It does not prove
ecosystem-wide readiness, desktop application correctness, update behavior,
uninstall behavior, signing, or deployment readiness.

## Initial Findings

### F-001: Root description is stale

The root manifest describes a six-app ecosystem, while the live repository has
14 application directories, 11 shared package directories, and four standalone
workers. Architecture and operational documentation must use the live topology.

### F-002: Desktop technology is inconsistent

Four projects expose Electron packaging configuration while MoneyTrash exposes
Tauri configuration. The target requirement calls for standardized designated
desktop apps on Electron, so MoneyTrash needs an evidence-based migration or
explicit exclusion decision.

### F-003: Aggregate validation coverage is incomplete

Root aggregate scripts visibly omit several active project directories. The
audit must map which projects are intentionally excluded, which have local
checks only, and which currently have no enforced validation.

### F-004: Worker ownership may overlap application backends

Gallery, Management, and MoneyTrash each have application projects plus named
standalone workers. Their ownership, deployment targets, API contracts, and
potential duplication must be traced before consolidation.

### F-005: Runtime data is stored under the application tree

`apps/pb_data` requires review for source-control hygiene, secrets, personal
data, backup rules, installer behavior, and separation between development and
production state.

## Evidence Still Required

- Complete package/dependency graph and workspace membership
- App entry points, runtime processes, ports, and ownership boundaries
- Electron security settings, IPC allowlists, preload APIs, and navigation rules
- API routes and client-to-service contract map
- Authentication, authorization, CSRF, rate-limiting, and session flows
- Stripe/payment, licensing, D1, R2, PocketBase, and local database flows
- Environment-variable and secret ownership matrix
- Worker routing and deployment topology
- Test inventory and actual pass/fail baseline for every project
- Release artifact inventory, update feeds, signing status, and checksums
- Install, repair, update, rollback, and uninstall smoke evidence per desktop app
- Data migration, compatibility, backup, and recovery behavior

## Completed Checkpoint: Cloud Pipeline

The first focused cloud checkpoint corrected canonical worker deployment and D1
migration wiring, hardened Management Worker production origins, and changed
the public access-code flow from fail-open to database-backed validation.
Website API ownership is now consolidated under Gallery Worker, which remains
an online-only backend/UI boundary. All changes were validated locally and
through non-deploying Wrangler dry runs.

The retired Cloud Backend and generated Website mirrors reduce the current tree
to 13 application directories and 28 pnpm workspace projects. Management and
Gallery remain independently deployed online applications.

Deployment ownership is also consolidated: CI performs validation only, Pages
and Workers deploy through separate workflows, cloud deployments no longer run
as a side effect of desktop releases, and unsafe local-file key rotation has
been replaced by explicit Wrangler secret provisioning.

Management billing now derives commercial fields from server-owned settings,
requires authenticated identity, and uses durable Stripe webhook idempotency.
The locally reconciled Management D1 chain applies all 42 migrations to a fresh
database. Read-only production inspection, however, found a migration ledger
stalled at migration 001 against a manually evolved schema, with current auth,
studio, licensing, and webhook tables absent. Management production migration
and deployment are blocked until an authorized backup and schema-adoption
window; the Worker deployment workflow is manual-only.

See [Cloud Pipeline Audit](audits/CLOUD_PIPELINE_AUDIT_2026-07-18.md) for the
evidence, remaining risks, and cloud-phase exit criteria. This checkpoint does
not establish full cloud or ecosystem readiness.

## Active Checkpoint: Desktop Runtime

Master packaged startup now trusts only its forked backend, its built updater is
loaded from the correct artifact path, and Master/Touch updater IPC is bound to
the live top frame. Touch's renderer-only server is loopback-only with contained
asset paths and navigation guards installed before loading.

License Generator signing has moved out of React into a narrow Electron
main/preload boundary. The audit caught a workspace-linked private PEM in the
first unpacked artifact; main/preload bundling, dependency exclusions, and a
mandatory after-pack key-custody scan now prevent recurrence. The corrected
Windows unpacked artifact passed, but remains unsigned and unreleasable.

Master startup licensing is now one protected Ed25519 contract: Installer-owned
`safeStorage` ciphertext, signed metadata, current-machine binding, and
expiration must all agree before the backend or renderer starts. A fresh Master
Windows unpacked artifact independently passed its ASAR/runtime boundary scan
with the required main, preload, desktop-license, updater, and Electron 39 ABI
evidence; Authenticode reports `NotSigned`. The backend now uses the same strict
signature/machine verifier and rejects legacy checksums. Stripe checkout creates
only a pending destination; authenticated issuance/provisioning requires the
actual OS UUID.

The historical trust root is proven compromised because its matching private
key was committed. The live tree no longer contains that private fixture,
Master/Installer no longer fall back to the public key, tests use ephemeral
keypairs, and the unused RSA/private-PEM CLI is retired. Release remains blocked
until an approved new Ed25519 public key is supplied as deterministic release
input. The workspace MCP's private-key-returning license tool, unscoped
migration shell, simulated deploy tool, path traversal, and shell log tail are
also removed; its build/tests pass.

The public-key release contract is implemented and fail-closed. Master and
Installer accept only a base64 32-byte Ed25519 public key through
`CLICKFLASH_LICENSE_PUBLIC_KEY`, atomically generate a public-only build
resource, package it under `resources/license-public-key.txt`, and validate it
again after packing. No approved rotated key has been supplied, so no new
release artifact is claimed.

Master and Touch now have one tracked TypeScript Electron shell and one canonical
builder contract each. Parallel JavaScript sources, `electron-new`, alternate
Master configs/scripts, and Touch's extra manifest are removed. Generic
renderer-controlled IPC invocation/listening is replaced by named kiosk,
dialog, print, updater, and scanner capabilities; strict main-process schemas
bound strings, filters, credentials, and print options. Touch admin access and
exit authentication now occur in main with shared lockout state instead of a
local-storage default password. Both renderer/Electron typechecks and builds
pass; Touch's full 13-file/105-test suite and Master's 7 IPC contract tests pass.

See [Desktop Runtime Audit](audits/DESKTOP_RUNTIME_AUDIT_2026-07-18.md) for the
runtime matrix, evidence, and next blockers. Gallery remains online-only.

## Next Audit Slice

1. Obtain authorization for the rotated public trust key, rebuild the current
   canonical artifacts, and run their mandatory custody/runtime scans.
2. Scaffold MoneyTrash Electron migration behind Tauri parity tests.
3. Preserve and independently validate the existing dirty Installer change set.
4. Replace advisory desktop release automation with signed, fail-closed package
   and update verification.
5. Prepare, but do not execute, the Management production D1 backup and
   migration-adoption runbook.

## Completion Standard

This document is a baseline, not a completion claim. The ecosystem goal is only
complete when every named surface has direct evidence for architecture,
security, validation, packaging, operations, and release readiness, and all
required remediations have been implemented and re-verified.
