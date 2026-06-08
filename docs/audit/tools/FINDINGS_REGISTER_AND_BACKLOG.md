# ClickFlash — Findings Register & Remediation Backlog
> **Generated:** June 2026  
> **Source:** Automated deep-dive scans (dependency, code quality, security, schema, tests)  
> **Constraint:** No files deleted or modified

---

## Executive Summary

| Severity | Count |
|----------|-------|
| P0 — Critical | 4 |
| P1 — High | 2 |
| P2 — Medium | 4 |
| P3 — Low | 2 |
| **Total** | **12** |

---

## Findings Register

### F-004 — 117 potential secret/password matches in source
- **Domain:** Security
- **Severity:** P0
- **Evidence:** Includes default passwords, JWT_SECRET values, test tokens
- **Impact:** Credential leakage, unauthorized access
- **Recommendation:** Audit every match; rotate exposed secrets; replace defaults with env-driven values

### F-005 — 16 potential API keys in source/env
- **Domain:** Security
- **Severity:** P0
- **Evidence:** RESEND_API_KEY, GALLERY_API_KEY, MONEYTRASH_API_KEY, HUB_API_KEY, CLOUD_API_KEY
- **Impact:** Service abuse, email/API quota theft
- **Recommendation:** Move all keys to vault/GitHub Secrets; rotate immediately; never commit real values

### F-006 — Stripe secret key pattern found in committed file
- **Domain:** Security
- **Severity:** P0
- **Evidence:** apps/management/backend/.env contains STRIPE_SECRET_KEY
- **Impact:** Payment data breach, PCI scope expansion
- **Recommendation:** Rotate Stripe key immediately; remove from git history

### F-012 — Gallery and Management have dual backend codebases (Express + Cloudflare Worker)
- **Domain:** Architecture
- **Severity:** P0
- **Evidence:** apps/gallery/backend/legacy/ and apps/management/backend/legacy/ coexist with Worker src/
- **Impact:** Confusion, duplicate security surface, build ambiguity, maintenance burden
- **Recommendation:** Archive legacy Express backends; route all traffic through CF Worker; update docs

### F-003 — 18 `.env` files present in repository (not examples)
- **Domain:** Security
- **Severity:** P1
- **Evidence:** .env; apps\gallery\.env; apps\gallery\backend\.env; apps\management\.env; apps\management\backend\.env...
- **Impact:** Risk of committed secrets; CI/CD exposure
- **Recommendation:** Add all .env files to .gitignore, rotate any exposed secrets, move to vault

### F-008 — 240 SQL migration files with duplicate prefixes across apps
- **Domain:** Data / Schema
- **Severity:** P1
- **Evidence:** master has 103 migrations with 24 duplicate prefixes; master-cpp has 57 with 6 duplicates
- **Impact:** Migration ordering conflicts, schema drift, failed deployments
- **Recommendation:** Consolidate to single migration source; use timestamp-based IDs; add reversibility tests

### F-001 — 13 production dependencies have version mismatches across apps
- **Domain:** Dependencies
- **Severity:** P2
- **Evidence:** Examples: lucide-react, @sentry/react, express, react-window, uuid, sharp
- **Impact:** Inconsistent behavior, duplicate bundles, harder security patching
- **Recommendation:** Align versions via pnpm catalog or workspace overrides; pin security-sensitive packages

### F-007 — 13 TODO/FIXME comments related to security/auth
- **Domain:** Security
- **Severity:** P2
- **Evidence:** Includes "TODO: Set up API authentication" and OAuth token staleness notes
- **Impact:** Known incomplete security controls
- **Recommendation:** Convert TODOs to tracked tickets; resolve P0/P1 security TODOs before release

### F-009 — 7 apps missing tsconfig.json
- **Domain:** Code Quality
- **Severity:** P2
- **Evidence:** gallery, installer, management, master, moneytrash, touch, website
- **Impact:** No TypeScript checking; runtime errors more likely
- **Recommendation:** Add tsconfig.json to every app; run tsc --noEmit in CI

### F-010 — 163 test files across entire monorepo
- **Domain:** Testing
- **Severity:** P2
- **Evidence:** master:86, management:15, gallery:13, touch:8, moneytrash:6
- **Impact:** Coverage likely below 70% target for several apps
- **Recommendation:** Add unit tests for services/utils; expand E2E to cover critical cross-app flows

### F-002 — 10 dev dependencies have version mismatches
- **Domain:** Dependencies
- **Severity:** P3
- **Evidence:** typescript, @types/react, eslint, playwright versions differ
- **Impact:** Inconsistent lint/typecheck behavior across CI jobs
- **Recommendation:** Centralize dev toolchain versions in root package.json

### F-011 — Repository bloat from runtime artifacts and duplicate images
- **Domain:** Infrastructure
- **Severity:** P3
- **Evidence:** 32MB MSI, 14MB log, duplicate 9MB portfolio images across website/master
- **Impact:** Slow clones, larger backups, CI cache pollution
- **Recommendation:** Add pb_data/, *.msi, *.log to .gitignore; deduplicate assets via shared package

---

## Remediation Backlog

| ID | Severity | Domain | Title | Effort | Owner | Status |
|----|----------|--------|-------|--------|-------|--------|
| F-004 | P0 | Security | 117 potential secret/password matches in source | 2 days | TBD | Open |
| F-005 | P0 | Security | 16 potential API keys in source/env | 1 day | TBD | Open |
| F-006 | P0 | Security | Stripe secret key pattern found in committed file | 0.5 day | TBD | Open |
| F-012 | P0 | Architecture | Gallery and Management have dual backend codebases (Express ... | 5 days | TBD | Open |
| F-003 | P1 | Security | 18 `.env` files present in repository (not examples) | 1 day | TBD | Open |
| F-008 | P1 | Data / Schema | 240 SQL migration files with duplicate prefixes across apps | 5 days | TBD | Open |
| F-001 | P2 | Dependencies | 13 production dependencies have version mismatches across ap... | 3 days | TBD | Open |
| F-007 | P2 | Security | 13 TODO/FIXME comments related to security/auth | 2 days | TBD | Open |
| F-009 | P2 | Code Quality | 7 apps missing tsconfig.json | 2 days | TBD | Open |
| F-010 | P2 | Testing | 163 test files across entire monorepo | 10 days | TBD | Open |
| F-002 | P3 | Dependencies | 10 dev dependencies have version mismatches | 1 day | TBD | Open |
| F-011 | P3 | Infrastructure | Repository bloat from runtime artifacts and duplicate images | 2 days | TBD | Open |

---

## Immediate Actions (Next 48 Hours)

1. **Rotate exposed secrets** (F-004, F-005, F-006)
2. **Remove `.env` files from git** and add to `.gitignore` (F-003)
3. **Decide on gallery/management backend source of truth** (F-012)
4. **Freeze migration numbering** and plan consolidation (F-008)
5. **Run `tsc --noEmit` and `pnpm audit` in CI** (F-009, F-001)

---

## Preservation Statement

> All findings were generated via read-only scans.
> No code, documentation, or runtime data was modified or deleted.
