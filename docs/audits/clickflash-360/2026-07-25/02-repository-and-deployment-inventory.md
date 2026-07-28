# 02 — Repository and Deployment Inventory

## Verified inventory

| Area | Current count | Manifest/runtime signals | Truth-reconciliation result |
|---|---:|---|---|
| `apps/` | 17 dirs | 15 `package.json`; ride-node `pyproject.toml`; `pb_data` no manifest | README's six products are not repository scope |
| `workers/` | 4 dirs | four Worker packages + Wrangler configs | only Cloud Backend and Update Server are in Worker deploy workflow |
| `packages/` | 13 dirs | 13 packages | six packages have no external manifest consumer |
| `services/` | 2 dirs | master-cpp CMake; platform empty | C++ has no caller/CI/deploy; platform is orphaned |
| `.github/workflows` | 11 files | CI/CD/release/security/nightly | primary CI fails YAML parse |
| tracked files | 4,887 at initial baseline | TypeScript/SQL/TSX dominate | repository includes generated/archived/local artifacts |

See file 00 for the canonical lifecycle classification of every unit.

## Product/runtime identities

| Path | Manifest identity/version | Runtime/entrypoint | Deploy/build evidence | Owner role |
|---|---|---|---|---|
| `apps/master` | `clickflash-master@2.0.0` | Electron `electron-main.ts`, React, Express/SQLite backend | root scripts/release workflows/local artifacts | Desktop platform |
| `apps/touch` | `clickflash-touch@2.0.0` | Electron `main.ts`, React kiosk, Express/SQLite backend | root scripts/release workflows/local artifacts | Kiosk platform |
| `apps/moneytrash` | `moneytrash-uploader@2.0.0` | Electron + Vite React | root build/local artifact; no canonical release workflow | Media ingest |
| `apps/management` | `star-master-management@2.0.0` | Vite React | Cloudflare Pages CD | Cloud operations |
| `apps/gallery` | `star-master-customer@2.0.0` | Vite React | Cloudflare Pages CD | Gallery commerce |
| `apps/website` | `main-website@2.0.0` | Next App Router | Cloudflare Pages CD/release workflow | Marketing |
| `apps/cloud-backend` | `cloud-backend@1.0.0` | Hono Worker `src/index.ts` | production Worker matrix | Cloud API |
| `apps/installer` | `clickflash-installer@5.0.0` | Electron wizard | release workflow compile; local installer | Release engineering |
| `apps/license-generator` | `clickflash-license-generator@2.0.0` | Electron operator tool | package scripts only | Licensing/security |
| `apps/mcp-server` | `clickflash-mcp@2.0.0` | MCP stdio `src/index.ts` | root build/dev only | Developer tooling |
| `apps/docs` | `@clickflash/docs@2.0.0` | Docusaurus | workspace build; no deploy workflow | Documentation |
| mobile four | versions 1.0/2.0 | Expo Router | attempted release only for two; filter/config drift | Mobile product |
| `apps/ride-node` | `clickflash-ride-node@0.1.0` | Python hardware daemon | no CI/deploy | Capture hardware |
| `services/master-cpp` | CMake `6.0.0` | Drogon/Qt/SQLite C++ service | no CI/deploy/caller | Desktop platform R&D |
| Workers | version 2.0.0 | Cloudflare Workers | only Update Server deployed by current matrix; frontend consumers evidence other three | Cloud API owners |

## Workspace/package truth

`pnpm-workspace.yaml` includes `apps/**`, `packages/*`, `workers/*`, and
`services/*`, excluding MoneyTrash's staging directory. It also admits data and
non-Node app directories; workspace membership therefore does not prove a valid
package.

Six additional `package-lock.json` files coexist with root `pnpm-lock.yaml`
(Mobile Client, Mobile Photographer, MoneyTrash, Gallery Worker, licensing, and
logger). Gallery uses `file:` links for UI/types while most consumers use
`workspace:*`, increasing install/release drift.

No external manifest/source consumer was found for `@clickflash/api`,
`@clickflash/database`, `@clickflash/errors`, `@clickflash/test-utils`, or
`@clickflash/utils`; `@clickflash/shared` is used only by orphaned API. Logger is
the strongest shared package (165 reference files). UI is consumed selectively
while app-local primitives duplicate it.

## Deployment truth

| Control plane | What current source does | Gap |
|---|---|---|
| `cd.yml` | builds/deploys Website, Gallery, Management Pages | no backend migration/contract gate |
| `deploy.yml` | remote-migrates and deploys Cloud Backend; deploys Update Server | omits Gallery/Management/MoneyTrash Workers |
| `release.yml` | attempts desktop/web/mobile/package releases | compiles rather than packages Master/Installer; nonexistent Gallery/Mobile Photographer filters; output mismatch |
| `production-auto-loop.yml` | lint, E2E, Master package, deployment echo | does not prove deployment, signing, rollback, or complete surface coverage |
| local `wrangler.toml` files | D1/R2/KV/binding declarations | production bindings/secrets/migration state unverified |

## Data/generated/archive classification

- Migration/schema-related tracked files: 843. Live families exist under Cloud
  Backend, three Workers, Master, Touch, master-cpp, and `packages/database`;
  archived copies exist under `docs/archive`.
- 110 identical SQL groups span multiple owners. Master explicitly runs both
  `backend/database/migrations` and `backend/migrations`.
- `packages/ui/storybook-static` (62 files) and
  `packages/validation/coverage` (17 files) are tracked generated output.
- `apps/cloud-backend/src/refactor.py` is a tracked source-writing refactor script
  with an absolute local path; it is not a Worker entrypoint and was not executed.
- Ignored releases total about 1.65 GB. Metadata only was inspected.
- Local database/log/report/result paths are sensitive/generated. Their contents
  were excluded.

## Largest documentation/source contradictions

1. README: “complete 6-app platform” and “6/6 Apps Complete (100%)” versus 36
   direct surface directories and unverified production controls.
2. Root and CI aggregates cover a subset; mobile/Workers/services/docs/MCP are
   missing or no-op.
3. Ledgers mark credential rotation/history purge complete while the key path
   remains tracked; runbooks/scripts are not execution evidence.
4. Prior cloud audit describes canonical four-Worker deployment, while current
   `deploy.yml` has two entries.
5. Tauri remains documented for MoneyTrash although current desktop bridge is
   Electron and legacy naming masks the transition.
