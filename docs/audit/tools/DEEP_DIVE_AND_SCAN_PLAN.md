# ClickFlash — Deep Dive & Scan Plan
> **Generated:** June 2026  
> **Scope:** Every file, folder, app, package, script, doc, test, and configuration artifact  
> **Constraint:** NON-DESTRUCTIVE — no files deleted or modified by this plan

---

## 1. Ecosystem Inventory Summary

### 1.1 Top-Level Structure
| Area | Files | Source Lines | Notes |
|------|-------|--------------|-------|
| `apps/` | 4,360 | ~389,972 | 8 apps including master-cpp and runtime pb_data |
| `docs/` | 192 | ~45,512 | Audit artifacts, runbooks, architecture docs |
| `packages/` | 16 | ~1,743 | Shared `@clickflash/types` + `@clickflash/ui` |
| `scripts/` | 25 | ~2,130 | Build, deploy, secret rotation, simulation |
| `tests/` | 9 | ~1,585 | Ecosystem + installer + performance tests |
| `(root)` | 76 | ~59,653 | Manifests, Docker, Compose, CI configs, bat files |

### 1.2 Application Inventory
| App | Files | Lines | Stack | Role |
|-----|-------|-------|-------|------|
| **master** | 2,475 | 147,784 | Electron + Express + SQLite + React/Vite | Local photo processing, face recognition, cloud sync gateway |
| **management** | 474 | 81,261 | React + Vite + CF Worker backend | Fleet/analytics hub |
| **gallery** | 431 | 58,046 | React + Vite + dual backend legacy | Customer gallery + Stripe |
| **touch** | 295 | 36,714 | Electron + Express + SQLite + React/Vite | Kiosk ordering + face search |
| **website** | 295 | 14,732 | Next.js 15 + Tailwind + CF Pages | Marketing site + SEO |
| **moneytrash** | 124 | 30,931 | Next.js + Tauri + Rust + CF Worker | Bulk uploader |
| **installer** | 34 | 3,943 | Electron + React + Vite | 1-click setup wizard |
| **master-cpp** | 229 | 19,273 | C++ (CMake) + SQL migrations | High-performance native master rewrite |

### 1.3 File-Type Landscape (Top 20)
| Extension | Count | Notes |
|-----------|-------|-------|
| `.ts` | 2,451 | Primary source language |
| `.tsx` | 1,471 | React components |
| `.jpg` | 1,386 | Portfolio / photo assets (largest bloat source) |
| `.md` | 341 | Documentation |
| `.js` | 277 | Legacy backend / config |
| `.sql` | 255 | Schema migrations |
| `.json` | 125 | Config / manifests |
| `.bat` | 87 | Windows automation |
| `.h` | 86 | C++ headers |
| `.cpp` | 80 | C++ source |

### 1.4 Largest Files / Bloat Hotspots
- `apps/touch/node-v24.11.1-x64.msi` — 32 MB (should not be committed)
- `apps/master/pb_data/logs/info-2026-05-23.log` — 14 MB (rotate / gitignore)
- Duplicate 9 MB `MAR_0396.JPG` in master uploads + website public (3+ copies)
- Multiple 6–7 MB portfolio images duplicated across `website/public/images/portfolio` and `website/public/portfolio`
- `apps/master/public/logo.png` 6.8 MB duplicated in touch + website

### 1.5 Shared Packages
- `@clickflash/types` — 5 files, 847 lines, minimal surface
- `@clickflash/ui` — 11 files, 896 lines, 7 components + tokens

---

## 2. Deep Dive Methodology

### Phase A — Structural Scan (Days 1–2)
1. **File inventory** — every file under `apps/`, `packages/`, `scripts/`, `tests/`, `docs/`
2. **Line counts** by language and app (already captured in `per_app_stats.json`)
3. **Dependency graph** — parse every `package.json`, identify:
   - duplicate dependencies across apps
   - version mismatches
   - unused / deprecated packages
   - security-sensitive packages (bcrypt vs bcryptjs, jsonwebtoken, sharp, etc.)
4. **Binary / asset audit** — identify oversized images, duplicate assets, runtime artifacts

### Phase B — Code Quality Scan (Days 3–4)
1. **TypeScript strictness check** per app (`tsc --noEmit`)
2. **Lint pass** (`eslint` with each app's config)
3. **Secret scan** — grep for:
   - `password\s*=` / `secret\s*=` / `api[_-]?key\s*=`
   - `Bearer ` tokens in comments
   - `.env` files committed
4. **Dead code detection** — `unimported` or `knip` analysis on TS apps
5. **C++ code review** for `master-cpp` (CMake, memory safety, SQL injection)

### Phase C — Configuration & Infra Scan (Days 5–6)
1. **Environment variables** — map every `.env.example` to actual usage
2. **Docker / Compose** — validate health checks, secret handling, port mappings
3. **CI/CD workflows** — review `.github/workflows` for pins, secrets, caching
4. **Cloudflare configs** — `wrangler.toml` per app, route bindings, D1/R2/KV usage
5. **Electron security** — preload scripts, `contextIsolation`, CSP, auto-updater

### Phase D — Data & Schema Scan (Days 7–8)
1. **Migration inventory** — 100+ `.sql` files across apps; identify:
   - duplicate migration numbering
   - conflicting schema changes
   - irreversible migrations
2. **Schema diff** — master vs touch vs gallery vs management vs master-cpp
3. **Runtime data** — `pb_data/`, `backend/data/`, SQLite files in repo

### Phase E — Test & Docs Scan (Days 9–10)
1. **Test inventory** — Jest, Playwright, Vitest, k6
2. **Coverage mapping** — which critical paths have tests vs not
3. **Documentation completeness** — README per app, API.md sync, ARCHITECTURE.md currency

---

## 3. Scan Deliverables

| Deliverable | Location | Owner |
|-------------|----------|-------|
| File inventory JSON | `docs/audit/tools/deep_inventory.json` | Auto-generated |
| Per-app stats JSON | `docs/audit/tools/per_app_stats.json` | Auto-generated |
| Dependency alignment report | `DEPENDENCY_ALIGNMENT_REPORT.md` (update) | Engineering |
| Secret scan report | `docs/audit/04_assessment/security_assessment_*.md` | Security |
| Migration reconciliation sheet | `docs/audit/tools/migration_matrix.csv` | DBA |
| Asset bloat report | `docs/audit/tools/asset_bloat_report.md` | DevOps |
| TypeScript/lint report | `docs/audit/tools/code_quality_report.md` | Engineering |

---

## 4. Risk Register (Scan Phase)

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| SD-001 | Runtime logs/data in repo bloat clones | High | Medium | Add to `.gitignore`, rotate logs |
| SD-002 | Duplicate 6–9 MB images across apps | High | Medium | Deduplicate via shared assets package |
| SD-003 | Dual backend in gallery/management causes confusion | High | High | Archive legacy Express backend |
| SD-004 | master-cpp migrations drift from TS apps | Medium | High | Create unified migration source |
| SD-005 | `.env` files committed with secrets | Medium | Critical | Secret scan + rotate if found |

---

## 5. Preservation Rule

> **No files are deleted by this plan.** All scan activities are read-only.
> If cleanup is recommended, it is tracked in the Remediation Backlog and executed only after explicit approval.
