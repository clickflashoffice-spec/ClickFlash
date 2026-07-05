# ClickFlash Monorepo Reorganization & Safe Cleanup Plan

## 1. Current State

ClickFlash is a `pnpm` + `Turborepo` monorepo (`clickflash-ecosystem` v4.2.0) containing 7 core applications, shared packages, workers, and extensive documentation/tests.

Key pain points identified during the 360° review:

- **Package-name drift:** App `package.json` `name` fields did not match the `@clickflash/<app>` filters used in root scripts and CI.
- **CI package-manager inconsistency:** Some workflows/scripts used `npm` while the repo uses `pnpm`.
- **Migration duplication:** `packages/database/migrations/` contained 241 files with duplicated app migrations and overlapping sequence numbers.
- **Committed build artifacts:** `.exe` installers, `.turbo` cache, and stray `package-lock.json` files were tracked in the repo.
- **Missing infrastructure files:** Root `jest.config.js` referenced a missing `test-suite/setup.ts`; the root `Dockerfile` referenced a missing `scripts/start-production.js`.
- **Workspace pollution:** `apps/master-cpp/` (C++ backend) and `apps/pb_data/` (data directory) were included by the `apps/**` workspace glob.

These issues have been resolved as part of this finalization (see Phase 0/2 deliverables).

## 2. Target Monorepo Structure

```text
ClickFlash/
├── .baseline/                  # Working-tree snapshots (not committed)
├── .github/workflows/          # CI/CD pipelines (pnpm-only)
├── apps/                       # 7 core applications
│   ├── master/                 # Electron + React 19 + Express backend
│   ├── master-cpp/             # Drogon C++ dual backend (excluded from pnpm workspace)
│   ├── touch/                  # Electron + React 19 kiosk
│   ├── moneytrash/             # Next.js 16 / Tauri uploader
│   ├── management/             # React + Vite + Cloudflare Worker
│   ├── gallery/                # React + Vite + Cloudflare Worker
│   ├── website/                # Next.js 15 marketing site
│   └── installer/              # Electron 9-step setup wizard
├── packages/                   # Shared packages
│   ├── config/                 # ESLint, Prettier, Tailwind, CSP/security headers
│   ├── database/               # SQLite/D1 schemas + migrations
│   ├── logger/                 # Winston logger + audit helpers
│   ├── test-utils/             # Vitest/Playwright helpers
│   ├── types/                  # Global TypeScript definitions
│   ├── ui/                     # Shared React component library
│   └── validation/             # Zod schemas
├── workers/
│   └── update-server/          # Electron OTA update manifest worker
├── tools/
│   └── scripts/                # One-off tooling
├── scripts/                    # Build, deploy, cleanup, provisioning
├── tests/                      # Cross-app E2E + standalone verification scripts
├── test-suite/                 # Categorized test suites
├── docs/                       # Professional documentation suite
├── e2e/                        # Playwright global setup/teardown
├── docker-compose*.yml         # Local + production Docker stacks
├── Dockerfile                  # Production container (pnpm-based)
├── package.json                # Root orchestration
├── pnpm-workspace.yaml         # Workspace definition
└── turbo.json                  # Pipeline + caching
```

## 3. Special C++ Backend Handling

`apps/master-cpp/` is the high-performance Drogon C++ alternative backend for the Master Portal.

- **Build:** CMake 3.20+ + vcpkg; separate CI job; not part of the pnpm workspace.
- **Artifacts:** Compiled binary published as a GitHub Release asset and consumed by the installer.
- **Parity:** Route contracts must mirror the Node Express backend (`apps/master/backend`). Differences are tracked in `docs/ADR/001-dual-backend.md`.
- **Legacy code:** The older Qt-based HTTP server headers still present in `master-cpp` should be removed once Drogon parity is verified.

## 4. Shared Packages Elevation

The following duplication hotspots should be progressively consolidated into shared packages:

| Concern | Current Duplication | Target Package |
|---------|--------------------|----------------|
| Zod schemas | Per-app auth/order/payment schemas | `@clickflash/validation` |
| Type definitions | Per-app API/DB types | `@clickflash/types` |
| UI primitives | `apps/*/src/components/ui/` + `@clickflash/ui` | `@clickflash/ui` |
| Logger | Per-app console.log / custom loggers | `@clickflash/logger` |
| API clients | Per-app fetch wrappers | New `@clickflash/api-client` (future) |
| CSP/security headers | Inline Helmet configs | `@clickflash/config` |

## 5. Migration Reconciliation

A reconciliation script (`scripts/reconcile-migrations.mjs`) has been executed against `packages/database/migrations/`.

**Results:**

- 239 SQL files scanned.
- 225 canonical migrations retained.
- 14 duplicates archived to `packages/database/migrations/archive/`.
- 1 content conflict flagged for manual review (`touch_001_initial_schema`).

**Action required:** Review `packages/database/migrations/archive/20260101035100_touch_001_initial_schema.sql.CONFLICT-REVIEW` and decide whether the canonical or duplicate version is correct.

## 6. Safe Cleanup List

Only the following non-source items are eligible for deletion:

| Item | Location | Rationale |
|------|----------|-----------|
| `.turbo/cache` | Root | Build cache |
| `dist/`, `.next/`, `out/`, `release/` | Per app | Build outputs |
| `node_modules/.cache` | All apps + root | Cache |
| `*.tsbuildinfo` | All apps | TS incremental build info |
| `package-lock.json` | `packages/types/`, `packages/ui/` | Wrong package manager |
| `docs/archive/**/node_modules` | `docs/archive/` | Embedded dependencies |
| `.exe` / `.blockmap` / release metadata | `release/`, `RELEASES/`, app `release/` | CI-generated artifacts |

**Script:** `scripts/safe-cleanup.sh` (and `scripts/safe-cleanup.ps1` for Windows).

## 7. Migration Script

```bash
# Run from repository root
node scripts/reconcile-migrations.mjs
bash scripts/safe-cleanup.sh
```

## 8. Verification Checklist

- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] `pnpm run build:all` succeeds.
- [ ] `pnpm run test:all` succeeds (or pre-existing failures documented).
- [ ] `pnpm run lint:all` succeeds (or pre-existing failures documented).
- [ ] `pnpm run typecheck:all` succeeds (or pre-existing failures documented).
- [ ] CI workflows use `pnpm` consistently.
- [ ] `apps/master-cpp/` and `apps/pb_data/` are excluded from pnpm workspace.
- [ ] `packages/database/migrations/archive/` contains only archived duplicates.
- [ ] `release/` and `RELEASES/` no longer contain committed `.exe` files.
