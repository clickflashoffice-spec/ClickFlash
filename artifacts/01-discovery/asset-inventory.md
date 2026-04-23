# Asset Inventory - ClickFlash Ecosystem

**Version:** 1.0  
**Date:** 2026-04-08  
**Audit Phase:** Phase 1 - Discovery  
**Prepared By:** Audit Lead  

---

## 1. Repository Overview

| Attribute | Value |
|-----------|-------|
| Repository | C:\Users\alamo\Desktop\ClickFlash |
| Git Status | Git repository (confirmed) |
| Monorepo | Yes (pnpm workspace) |
| Total Apps | 7 (6 + 1 COP clone) |

---

## 2. Application Inventory

### 2.1 Master Portal

| Attribute | Value |
|-----------|-------|
| Location | `apps/master/` |
| Type | Desktop (Electron) |
| Stack | Electron + React 19 + Express + SQLite |
| Port | 8090 |
| Build Config | `electron-builder.yml` |
| Frontend | `src/` (React) |
| Backend | `backend/` (Express) |
| Tests | `tests/e2e/` (Playwright) |
| State | Active |

### 2.2 Touch Kiosk

| Attribute | Value |
|-----------|-------|
| Location | `apps/touch/` |
| Type | Desktop (Electron) |
| Stack | Electron + React 19 + Express + SQLite |
| Port | 8091 |
| Frontend | `src/` (React) |
| Backend | `backend/` (Express) |
| Tests | `tests/e2e/` (Playwright) |
| State | Active |

### 2.3 MoneyTrash

| Attribute | Value |
|-----------|-------|
| Location | `apps/moneytrash/` |
| Type | Desktop (Tauri) |
| Stack | Next.js 16 + Tauri + React 18 |
| Port | 3000 |
| Build Config | `src-tauri/tauri.conf.json` |
| Frontend | `src/` (Next.js) |
| Native | `src-tauri/` (Rust) |
| Tests | `tests/e2e/` (Playwright), `__tests__/` (Vitest) |
| State | Active |

### 2.4 Management Hub

| Attribute | Value |
|-----------|-------|
| Location | `apps/management/` |
| Type | Web (Cloud) |
| Stack | React 19 + Vite + Express |
| Port | 5173 |
| Frontend | `src/` (React) |
| Backend | `backend/` (Express) |
| Tests | `tests/e2e/` (Playwright), Unit tests |
| State | Active |

### 2.5 Customer Gallery

| Attribute | Value |
|-----------|-------|
| Location | `apps/gallery/` |
| Type | Web (Cloud) |
| Stack | React 19 + Vite + Express + Stripe |
| Port | 5174 |
| Frontend | `src/` (React) |
| Backend | `backend/` (Cloudflare Workers) |
| Tests | Jest (backend), Playwright (frontend) |
| State | Active |

### 2.6 Main Website

| Attribute | Value |
|-----------|-------|
| Location | `apps/website/` |
| Type | Web (Static) |
| Stack | Next.js 15 + Tailwind 4 |
| Port | 3001 |
| Frontend | `src/app/` (Next.js pages) |
| Deployment | Cloudflare Pages |
| Tests | E2E (Playwright) |
| State | Active |

### 2.7 COP Master Clone

| Attribute | Value |
|-----------|-------|
| Location | `apps/master-cpp/` |
| Type | Desktop (Electron - C++ Port) |
| Stack | C++/Qt (Qtractor-based rewrite) |
| Note | Full C++ rewrite, NOT a simple clone |
| Frontend | C++ Qt UI components |
| Backend | C++ HTTP server |
| State | Active |

---

## 3. Technology Stack Summary

| Technology | Version | Apps Using |
|-----------|--------|-----------|
| Node.js | 20.x | All except master-cpp |
| TypeScript | 5.x | All except master-cpp |
| React | 19.x | Master, Touch, Management, Gallery |
| React | 18.x | MoneyTrash |
| Electron | 29.x | Master, Touch |
| Tauri | 2.x | MoneyTrash |
| Next.js | 15-16.x | MoneyTrash, Website |
| Vite | 7.x | Management, Gallery |
| Tailwind CSS | 3.x/4.x | Touch, Gallery, Website |
| SQLite | 3.x | Master, Touch (better-sqlite3) |
| Express.js | 4.x/5.x | Master, Touch, Management |
| Zod | 3.x/4.x | Validation |
| React Query | 5.x | Server state |
| Jest | 29.x/30.x | Unit testing |
| Playwright | 1.50+ | E2E testing |
| Stripe | 14.x | Gallery |
| C++/Qt | Qtractor | master-cpp |

---

## 4. Infrastructure Components

### 4.1 CI/CD

| Component | Location | Status |
|-----------|---------|--------|
| GitHub Actions | `.github/workflows/` | Present |
| Build Scripts | Per-app `*.bat` files | Present |

### 4.2 Docker

| Component | Location | Status |
|-----------|---------|--------|
| docker-compose.yml | Root | Present |
| Dockerfile | Gallery app | Present |

### 4.3 Cloud Services

| Service | Integration | Evidence |
|---------|-------------|----------|
| Cloudflare | CDN/DNS | Dashboard access |
| Stripe | Payments | Dashboard (Gallery) |
| Supabase | Database | Service (Management) |

---

## 5. Code Structure Observations

### 5.1 Shared Patterns

- Path aliases: `@/*` configured in tsconfigs
- Logger utility: `src/utils/logger.ts` (most apps)
- API services: `src/services/api*.ts` pattern
- Type definitions: `src/types.ts` or `src/types/*.ts`

### 5.2 Backend Routes

**Master Portal (21 routes):**
- `/api/auth` - Authentication
- `/api/collections` - CRUD operations
- `/api/cloud` - Cloud sync
- `/api/orders` - Order management
- `/api/faces` - Face recognition
- `/api/culling` - Photo culling
- `/api/pairing` - Kiosk pairing
- `/api/sync` - Offline sync
- `/api/files` - File upload
- `/api/system` - Health/diagnostics
- `/api/realtime` - SSE events

**Touch Kiosk (8 routes):**
- `/api/auth` - Local authentication
- `/api/collections` - Local CRUD
- `/api/orders` - Order creation
- `/api/orders/:id/export-to-master` - HMAC-signed export

### 5.3 Key Dependencies

| Package | Purpose | Apps |
|---------|---------|------|
| better-sqlite3 | Local database | Master, Touch |
| @tanstack/react-query | Server state | Most apps |
| zod | Schema validation | Most apps |
| stripe | Payments | Gallery |
| @tensorflow/facelapi | Face recognition | Master |
| electron-builder | Packaging | Master, Touch |

---

## 6. Notable Findings

| ID | Finding | App | Impact |
|----|---------|-----|--------|
| A-001 | master-cpp is C++ rewrite, not simple clone | master-cpp | Requires separate architecture review |
| A-002 | electron-builder.yml missing preload.js (reported) | Master | Build configuration issue |
| A-003 | Build output directory mismatch | Master | release\ vs release_v4\ |
| A-004 | TypeScript errors present | Management, Gallery | Technical debt |
| A-005 | No dedicated backend folder | Website | Static-only deployment |

---

## 7. Access Verification Status

| App | Repository Access | Build Artifacts | Source Code |
|----|------------------|-----------------|-------------|
| Master | Read | Present | Active |
| Touch | Read | Present | Active |
| MoneyTrash | Read | Present | Active |
| Management | Read | Present | Active |
| Gallery | Read | Present | Active |
| Website | Read | Present | Active |
| COP (master-cpp) | Read | Build needed | Active |

---

## 8. Next Steps

- [ ] Verify electron-builder.yml configuration fix
- [ ] Review TypeScript error files for context
- [ ] Examine COP (master-cpp) architecture documentation
- [ ] Assess CI/CD pipeline configurations
- [ ] Complete stakeholder register

---

**Document Control:**
- Version: 1.0
- Created: 2026-04-08
- Status: Initial Draft
