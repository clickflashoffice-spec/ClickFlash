# Phase 1: Initial Setup & Analysis Report

**Project:** ClickFlash → Feet Hub Migration to Cloudflare  
**Date:** March 2026  
**Status:** Analysis Complete

---

## 1. Project Structure Overview

### Monorepo Layout
```
ClickFlash/
├── apps/
│   ├── master/           # Electron + React 19 (Desktop Portal)
│   ├── touch/            # Electron + React 19 (Kiosk)
│   ├── management/       # React 19 + Vite + Express + D1 (Cloud)
│   ├── gallery/          # React 19 + Vite + Express + D1 (Cloud)
│   ├── moneytrash/       # Next.js 16 + React 19 + Tauri (Uploader)
│   └── website/          # Next.js 15 (Marketing)
├── packages/             # Shared packages
├── deployment/           # Docker configs
└── docs/                # Documentation
```

### App Stack Summary

| App | Stack | Database | Storage | Port | Status |
|-----|-------|----------|---------|------|--------|
| **Master Portal** | Electron + React 19 | SQLite (local) | Local filesystem | 8090 | Desktop |
| **Touch Kiosk** | Electron + React 19 | SQLite (local) | Local filesystem | 8091 | Desktop |
| **MoneyTrash** | Next.js 16 + Tauri | N/A | Local → R2 | 3000 | Desktop/Web |
| **Management Hub** | React 19 + Vite + Express | D1 (existing config) | R2 (existing config) | 5173/8092 | Cloud |
| **Customer Gallery** | React 19 + Vite + Express | D1 (existing config) | R2 (existing config) | 5174/8093 | Cloud |
| **Main Website** | Next.js 15 | N/A | N/A | 3001 | Cloudflare Pages |

---

## 2. SQLite Databases Identified

### Primary Production Databases
| Location | File | Purpose | Tables | Migration Priority |
|----------|------|---------|--------|-------------------|
| `apps/master/pb_data/` | `master.db` | Master Portal local data | ~25 tables | Medium (sync target) |
| `apps/master/pb_data/` | `sessions.db` | Session management | Auth sessions | Low (can regenerate) |
| `apps/management/backend/` | `data/management.db` | Management Hub | 25+ tables | **HIGH** |
| `apps/gallery/backend/` | `data/` | Customer Gallery | ~15 tables | **HIGH** |

### Backup Databases
- `apps/master/pb_data/backup/` - Multiple dated backups (Jan-Mar 2026)
- `apps/*/test_data_*` - Test data directories

### Database Schema Highlights

**Management Hub (25+ tables):**
- `users`, `albums`, `photos`, `orders`, `products`
- `kiosks`, `desks`, `destinations`, `settings`
- `bookings`, `portfolio_items`, `inventory`, `equipment`
- `photographer_ledger`, `daily_objectives`, `sync_sequences`
- `expenses`, `loans`, `adjustments` (payroll)
- `prospects` (B2B CRM), `ai_tasks`
- `fleet_heartbeats`, `fleet_heartbeat_history`
- `sync_conflicts`, `operation_logs`

**Gallery (15 tables):**
- `albums`, `photos`, `orders`
- `settings`, `payment_sessions`
- `customers`, `cart_items`

---

## 3. Image Storage Locations

### Current Storage
| App | Location | Type | Content |
|-----|----------|------|---------|
| Master | `apps/master/uploads/` | Local filesystem | Stress test images |
| Gallery | `pb_data/uploads/` | Local filesystem | 100+ test images |
| MoneyTrash | `apps/moneytrash/uploads/` | Local (planned R2) | Upload queue |

### Existing Cloudflare R2 Configuration
- **Bucket:** `clickflash-gallery-assets`
- **Binding:** `GALLERY_BUCKET` in management/gallery wrangler.toml
- **Already provisioned** but not fully integrated

### MoneyTrash R2 Configuration
- **Bucket:** `moneytrash-uploads`
- **KV Namespace:** `UPLOAD_SESSIONS` (upload queue state)
- **Already configured** in `cloudflare/wrangler.toml`

---

## 4. API Endpoints Mapping

### Management Hub Backend (`apps/management/backend/src/routes/`)
| Route File | Endpoints | Purpose |
|------------|-----------|---------|
| `auth.ts` | POST /api/auth/* | Authentication |
| `records.ts` | CRUD /api/records/* | Generic record operations |
| `files.ts` | POST /api/files/* | File uploads |
| `analytics.ts` | GET /api/analytics/* | Analytics data |
| `gallery.ts` | GET /api/gallery/* | Gallery operations |
| `sync.ts` | POST /api/sync/* | Data synchronization |
| `hrRoutes.ts` | /api/hr/* | HR operations |
| `fleetRoutes.ts` | /api/fleet/* | Fleet management |
| `customerRoutes.ts` | /api/customers/* | Customer management |
| `paymentRoutes.ts` | /api/payments/* | Payment processing |
| `yieldRoutes.ts` | /api/yield/* | Yield tracking |
| `prospectingRoutes.ts` | /api/prospecting/* | B2B CRM |

### Gallery Backend (`apps/gallery/backend/src/routes/`)
| Route File | Endpoints | Purpose |
|------------|-----------|---------|
| `albums.ts` | GET/POST /api/albums | Album management |
| `photos.ts` | GET/POST /api/photos | Photo operations |
| `orders.ts` | POST /api/orders | Order creation |
| `checkout.ts` | POST /api/checkout | Stripe checkout |
| `webhook.ts` | POST /api/webhook | Stripe webhooks |
| `auth.ts` | /api/auth/* | Gallery access auth |

### Master Portal Backend (`apps/master/backend/routes/`)
| Route File | Endpoints | Count |
|------------|-----------|-------|
| `auth.ts` | /api/auth/* | ~5 |
| `collections.ts` | /api/collections/* | ~15 |
| `orders.ts` | /api/orders/* | ~8 |
| `sync.ts` | /api/sync/* | ~6 |
| `cloud.ts` | /api/cloud/* | ~5 |
| `files.ts` | /api/files/* | ~6 |
| `faces.ts` | /api/faces/* | ~5 |
| `gallery.ts` | /api/gallery/* | ~4 |
| `pairing.ts` | /api/pairing/* | ~4 |
| `dashboard.ts` | /api/dashboard/* | ~6 |
| `analytics.ts` | /api/analytics/* | ~8 |
| `export.ts` | /api/export/* | ~4 |
| `health.ts` | /api/health | 1 |
| `realtime.ts` | WebSocket | Real-time |
| And 10+ more route files... | | |

**Total Master API endpoints: ~75+**

### Touch Kiosk Backend (`apps/touch/backend/routes/`)
| Route File | Endpoints |
|------------|-----------|
| `auth.ts` | /api/auth/* |
| `collections.ts` | /api/collections/* |
| `orders.ts` | /api/orders/* |
| `sync.ts` | /api/sync/* |
| `files.ts` | /api/files/* |

---

## 5. Existing Cloudflare Configuration

### Wrangler.toml Files (Already Present)
1. **`apps/management/backend/wrangler.toml`**
   - D1: `management-db` (id: `0f76a95e-5d63-4eb4-a26f-56f64aa1f573`)
   - R2: `clickflash-gallery-assets`
   - Vars: JWT_SECRET, ALLOWED_ORIGINS, RESEND_API_KEY

2. **`apps/gallery/backend/wrangler.toml`**
   - D1: `gallery-db`, `clickflash-website-db` (same id - needs clarification)
   - R2: `clickflash-gallery-assets`
   - Observability enabled

3. **`apps/moneytrash/cloudflare/wrangler.toml`**
   - D1: `moneytrash-db` (placeholder id)
   - R2: `moneytrash-uploads`
   - KV: `UPLOAD_SESSIONS`
   - Rate limiting configured

4. **`apps/website/wrangler.toml`**
   - Pages build output: `out/`
   - Basic configuration

5. **`apps/email-worker/wrangler.toml`**
   - Email worker (Resend integration)

---

## 6. Key Dependencies for Cloudflare Migration

### Management/Gallery Backend
```json
{
  "express": "^5.1.0",
  "better-sqlite3": "N/A - needs D1 adapter",
  "jsonwebtoken": "^9.0.2",
  "stripe": "^20.2.0",
  "formidable": "^2.1.5"
}
```

### Migration Strategy
- Replace `better-sqlite3` with D1 HTTP API or `drizzle-orm` + `@cloudflare/d1`
- Replace Express.js with Hono.js (Workers-compatible) or adapt Express
- Use `@aws-sdk/client-s3` compatible R2 bindings

### MoneyTrash (Next.js + Tauri)
- Already uses `@aws-sdk/client-s3` for R2
- Need to adapt for Cloudflare R2 Workers binding
- Next.js can run on Cloudflare Pages or Workers

### Master Portal (Electron)
- Desktop app = NOT for Cloudflare Workers
- Will sync local SQLite → D1 as cloud backup layer
- Uses WebSocket for real-time (may need SSE alternative for cloud)

---

## 7. Inter-App Communication

### Current Flow
```
Touch Kiosk → Master Portal (LAN/Ethernet)
     ↓
Master Portal ↔ Cloud (PocketBase sync - to be replaced)
     ↓
MoneyTrash → Gallery API (uploads)
     ↓
Gallery → Stripe (payments)
     ↓
Management Hub → All apps (orchestration)
```

### Cloud Architecture (Target)
```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare                           │
├─────────────────────────────────────────────────────────┤
│  Pages: Management Hub, Gallery, Website, MoneyTrash  │
│  Workers: API Backends (Express/Hono adapted)          │
│  D1: management-db, gallery-db, master-sync            │
│  R2: clickflash-gallery-assets, moneytrash-uploads     │
│  KV: Sessions, Upload queue                            │
└─────────────────────────────────────────────────────────┘
        ↑                              ↑
   Electron Apps                  Electron Apps
   (Master Portal)              (Touch Kiosk)
        ↓                              ↓
   Local SQLite ←──────────→ Local SQLite
   (Sync via Workers API)    (Sync via Master)
```

---

## 8. Environment Variables to Update

### Required for All Apps
| Variable | Current | Target |
|----------|---------|--------|
| `DATABASE_URL` | SQLite path | D1 binding/connection |
| `R2_BUCKET` | Local path | R2 bucket binding |
| `JWT_SECRET` | Static string | Workers secret |
| `STRIPE_*` | Test keys | Production keys |
| `ALLOWED_ORIGINS` | localhost | Cloudflare domains |

### Domain Updates (Post-Rebrand)
| Current | Target |
|---------|--------|
| `clickflash.com` | `feethub.com` |
| `gallery.clickflash.app` | `gallery.feethub.com` |
| `admin.feethub.com` | (for Management) |
| `moneytrash.feethub.com` | (for Uploader) |
| `www.feethub.com` | (for Website) |

---

## 9. Files Requiring Changes

### Rebranding Scope (Phase 0)
- [ ] All `package.json` files (name, description)
- [ ] All HTML meta tags and titles
- [ ] All API endpoint strings
- [ ] All documentation files
- [ ] All .env.example files
- [ ] All Docker/wrangler configs
- [ ] All error messages and UI strings
- [ ] Logo and favicon assets
- [ ] Email templates

**Estimated files to update:** 500+ across 6 apps

### Cloudflare Migration Scope (Phases 2-5)
- [ ] `apps/management/backend/src/` - D1 + Workers adaptation
- [ ] `apps/gallery/backend/src/` - D1 + Workers adaptation
- [ ] `apps/moneytrash/` - R2 integration (partially done)
- [ ] `apps/master/backend/` - D1 sync layer
- [ ] `apps/website/` - Cloudflare Pages deployment
- [ ] All `wrangler.toml` files
- [ ] GitHub Actions workflows

---

## 10. Complexity Assessment

| Phase | Complexity | Risk | Time Estimate |
|-------|-----------|------|---------------|
| Phase 0: Rebranding | Medium | Low | 2-4 hours |
| Phase 1: Analysis | ✅ Complete | - | Done |
| Phase 2: D1 Migration | High | Medium | 8-16 hours |
| Phase 3: R2 Integration | Medium | Low | 4-8 hours |
| Phase 4: Workers | Very High | High | 16-32 hours |
| Phase 5: Pages | Medium | Low | 4-8 hours |
| Phase 6: Testing | High | Medium | 8-16 hours |

**Total Estimated Time:** 42-84 hours

---

## 11. Recommendations

### Immediate Actions
1. **Create D1 databases** for production (currently using placeholder IDs)
2. **Migrate Management Hub first** as it's the most critical
3. **Test R2 integration** with MoneyTrash before full rollout
4. **Set up staging environments** for each Cloudflare app

### Risk Mitigation
1. Keep SQLite databases as fallback during migration
2. Implement gradual traffic shifting (10% → 50% → 100%)
3. Set up monitoring/alerting before cutting over
4. Document rollback procedures

### Rebrand Prerequisites
1. Register `feethub.com` domain
2. Set up Cloudflare zones for subdomains
3. Generate new JWT secrets
4. Update Stripe keys for new domain

---

## 12. Next Steps

- [ ] **Phase 0**: Execute global search/replace for "ClickFlash" → "Feet Hub"
- [ ] **Phase 2**: Create actual D1 databases via `wrangler d1 create`
- [ ] **Phase 2**: Export existing SQLite data to JSON/CSV
- [ ] **Phase 2**: Import data into D1
- [ ] **Phase 2**: Update Management Hub backend to use D1
- [ ] **Phase 3**: Complete R2 integration testing
- [ ] **Phase 4**: Adapt Express.js to Hono.js for Workers
- [ ] **Phase 5**: Configure monorepo for Cloudflare Pages
- [ ] **Phase 6**: End-to-end testing

---

**Analysis Completed:** March 2026  
**Prepared for:** Feet Hub Migration Project  
**Report Version:** 1.0
