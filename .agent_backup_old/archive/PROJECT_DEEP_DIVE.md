# ClickFlash Project Deep Dive

> Comprehensive documentation of the ClickFlash photography ecosystem

---

## Executive Summary

ClickFlash is an **enterprise photography management platform** designed for resorts, event venues, and photography businesses. It's a **6-application monorepo** built for handling 100GB+ photo deployments with offline-first architecture.

### Quick Stats

| Metric | Value |
|--------|-------|
| Total Apps | 6 |
| Total Files | 900+ |
| Backend Routes | 30+ |
| DB Migrations | 51+ |
| React Components | 300+ |
| Auto-Load Skills | 36 |

---

## 1. Application Inventory

### 1.1 Master Portal (`apps/master/`)

**Type:** Electron + React 19 + Express + SQLite
**Port:** 8090
**Version:** 4.2.0

The central hub for photo processing, album management, order fulfillment, and business operations.

#### Backend Structure

```
apps/master/backend/
├── server.ts                    # Main Express server
├── config/
│   └── constants.ts             # App configuration
│
├── routes/ (21 files)
│   ├── auth.ts                  # Authentication (login, logout, session)
│   ├── collections.ts           # CRUD for albums, photos, orders
│   ├── orders.ts                # Order management
│   ├── faces.ts                 # Face recognition endpoints
│   ├── culling.ts               # AI photo culling
│   ├── gallery.ts               # Gallery configuration
│   ├── galleryPublic.ts         # Public gallery access
│   ├── marketing.ts             # Campaign management
│   ├── analytics.ts             # Business analytics
│   ├── dashboard.ts             # Dashboard stats
│   ├── ledger.ts                # Financial ledger
│   ├── pairing.ts               # Kiosk pairing (QR/HMAC)
│   ├── sync.ts                  # Data synchronization
│   ├── realtime.ts              # WebSocket events
│   ├── inventory.ts             # Stock management
│   ├── fulfillment.ts           # Order fulfillment
│   ├── retention.ts             # Data retention
│   ├── settings.ts              # App settings
│   ├── users.ts                 # User management
│   ├── categories.ts            # Photo categories
│   └── sessionTypes.ts          # Session types
│
├── services/ (26 files)
│   ├── SyncManager.ts           # Kiosk sync orchestration
│   ├── cloudSyncService.ts      # Cloud sync gateway
│   ├── FaceService.ts           # Face recognition (face-api.js)
│   ├── FulfillmentService.ts    # Order fulfillment
│   ├── QueueProcessor.ts        # Background job processing
│   ├── InventoryService.ts      # Stock management
│   ├── WatermarkService.ts      # Watermark generation
│   ├── ThumbnailService.ts      # Thumbnail generation
│   ├── AnalyticsService.ts      # Business metrics
│   ├── MarketingService.ts      # Campaign automation
│   ├── LedgerService.ts         # Financial tracking
│   ├── RetentionService.ts      # Data lifecycle
│   ├── VectorIndexService.ts    # Face vector indexing
│   └── [14 more services]
│
├── shared/ (20 files)
│   ├── db.ts                    # SQLite database manager
│   ├── photoProcessor.ts        # Image processing (Sharp)
│   ├── lanSigningMiddleware.ts  # HMAC security
│   ├── auth.ts                  # Auth utilities
│   ├── logger.ts                # Structured logging
│   ├── validation.ts            # Input validation (Zod)
│   ├── rateLimiter.ts           # Rate limiting
│   └── [13 more utilities]
│
├── middleware/ (5 files)
│   ├── session.ts               # Session handling
│   ├── auth.ts                  # Auth middleware
│   ├── cors.ts                  # CORS configuration
│   ├── validate.ts              # Request validation
│   └── rateLimiting.ts          # Rate limiting middleware
│
├── migrations/ (51 files)
│   ├── 001_initial_schema.sql
│   ├── 002_add_kiosks.sql
│   ├── 003_add_orders.sql
│   └── ... (48 more migrations)
│
├── workers/ (4 files)
│   ├── photoWorker.ts           # Photo processing queue
│   ├── faceWorker.ts            # Face recognition queue
│   ├── watermarkWorker.ts       # Watermark queue
│   └── thumbnailWorker.ts       # Thumbnail queue
│
├── scripts/ (10 files)
├── types/ (3 files)
├── schemas/ (1 file)
└── controllers/ (1 file)
```

#### Frontend Structure

```
apps/master/src/
├── main.tsx                     # React entry point
├── App.tsx                      # Root component
│
├── components/ (100+ files)
│   ├── MainLayout.tsx           # Main layout wrapper
│   ├── Dashboard.tsx            # Main dashboard
│   ├── Orders.tsx               # Order management
│   ├── Photographers.tsx        # Staff management
│   ├── ProductsPage.tsx         # Product catalog
│   ├── MoneyTrash.tsx           # Uploader interface
│   ├── Marketing.tsx            # Campaign manager
│   │
│   ├── albums/ (40+ files)
│   │   ├── Albums.tsx           # Album listing
│   │   ├── AlbumDetail.tsx      # Single album view
│   │   ├── ImportAlbumModal.tsx # Import dialog
│   │   ├── hooks/ (9 hooks)     # Album-specific hooks
│   │   ├── editor/ (4 files)    # Legacy editor
│   │   └── editor2/ (30+ files) # New editor
│   │
│   ├── settings/ (29 files)
│   │   ├── SettingsPage.tsx
│   │   ├── GeneralSettings.tsx
│   │   ├── UserManagement.tsx
│   │   ├── WatermarkSettings.tsx
│   │   ├── KioskConnections.tsx
│   │   ├── CloudSync.tsx
│   │   └── [23 more settings]
│   │
│   ├── orders/ (11 files)
│   ├── modals/ (11 files)
│   ├── dashboard/ (18 files)
│   ├── photographers/ (4 files)
│   ├── products/ (5 files)
│   ├── marketing/ (1 file)
│   └── common/ (35+ files)
│
├── services/ (40+ files)
│   ├── apiService.ts            # Main API client
│   ├── cloudApiService.ts       # Cloud integration
│   ├── api/ (25+ files)         # API modules
│   └── __mocks__/ (4 files)     # Test mocks
│
├── hooks/ (20+ files)
├── context/ (3 files)
├── utils/ (15+ files)
├── types/ (4 files)
└── main/ (2 files)
```

---

### 1.2 Touch Kiosk (`apps/touch/`)

**Type:** Electron + React 19 + Express + SQLite
**Port:** 8091
**Version:** 4.1.1
**Constraint:** 100% OFFLINE - Strict LAN-only mode

Customer-facing self-service kiosk for photo browsing and ordering.

#### Backend Structure

```
apps/touch/backend/
├── server.ts                    # Main Express server
│
├── routes/ (8 files)
│   ├── auth.ts                  # Kiosk authentication
│   ├── collections.ts           # Album/photo data
│   ├── orders.ts                # Order creation
│   ├── orderExport.ts           # Export to Master
│   ├── sync.ts                  # Data sync with Master
│   ├── files.ts                 # File serving
│   ├── system.ts                # System status
│   └── realtime.ts              # WebSocket events
│
├── services/ (3 files)
│   ├── albumService.ts          # Album operations
│   ├── realtimeService.ts       # Real-time events
│   └── watcherService.ts        # File watching
│
├── shared/ (14 files)
│   ├── db.ts, auth.ts, logger.ts
│   ├── photoProcessor.ts, validation.ts
│   └── [9 more utilities]
│
└── migrations/ (9 files)
```

#### Frontend Structure

```
apps/touch/src/
├── main.tsx, App.tsx
│
├── components/
│   ├── touch/ (15 files)
│   │   ├── WelcomeScreen.tsx
│   │   ├── AttractScreen.tsx
│   │   ├── PhotoSelectionScreen.tsx
│   │   ├── PhotoPreviewScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── ThankYouScreen.tsx
│   │   ├── FaceSearchModal.tsx
│   │   ├── RoomNumberModal.tsx
│   │   ├── OnScreenKeyboard.tsx
│   │   ├── NumericKeypad.tsx
│   │   └── [5 more screens]
│   │
│   ├── common/ (11 files)
│   └── settings/ (4 files)
│
├── context/
│   └── KioskContext.tsx         # Main state (680 lines)
│
├── services/ (12 files)
├── hooks/ (7 files)
└── utils/ (2 files)
```

---

### 1.3 MoneyTrash Uploader (`apps/moneytrash/`)

**Type:** Tauri v2 + React + Next.js (dual mode)
**Port:** 1420 (Tauri) / 3000 (Next.js)
**Version:** 0.1.0

Field uploader for remote photo uploads when Master is unavailable.

#### Structure

```
apps/moneytrash/
├── src/
│   ├── App.tsx                  # Main Tauri app (878 lines)
│   ├── main.tsx
│   │
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx, page.tsx
│   │   └── api/
│   │       ├── health/route.ts
│   │       └── upload/
│   │           ├── route.ts
│   │           └── chunk/route.ts
│   │
│   └── services/ (3 files)
│       ├── desktopBatchUploadService.ts  # Tauri uploads
│       ├── batchUploadService.ts         # Web uploads
│       └── s3StorageService.ts           # S3/R2 integration
│
├── src-tauri/                   # Rust Backend
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs              # Entry point
│       └── commands.rs          # Rust commands (486 lines)
│
└── [Config files]
```

---

### 1.4 Management Hub (`apps/management/`)

**Type:** React + Vite + Express + SQLite
**Port:** 8090
**Version:** 4.1.0

Cloud-deployed business analytics and global management.

#### Structure

```
apps/management/
├── backend/
│   ├── server.js
│   ├── src/ (15 files)
│   ├── routes/ (5 files)
│   ├── services/ (2 files)
│   ├── shared/ (9 files)
│   └── migrations/ (10 files)
│
├── src/
│   ├── main.tsx, App.tsx
│   │
│   ├── components/
│   │   ├── management/ (30+ files)
│   │   │   ├── ManagementDashboard.tsx
│   │   │   ├── PayrollPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── FleetMonitor.tsx
│   │   │   ├── settings/ (12 files)
│   │   │   ├── modals/ (11 files)
│   │   │   ├── dashboard/widgets/ (10 files)
│   │   │   ├── performance/ (1 file)
│   │   │   └── reports/ (3 files)
│   │   │
│   │   ├── touch/ (22 files)
│   │   ├── orders/ (7 files)
│   │   ├── products/ (5 files)
│   │   ├── photographers/ (6 files)
│   │   ├── modals/ (12 files)
│   │   └── common/ (17 files)
│   │
│   ├── services/ (20+ files)
│   ├── hooks/ (8 files)
│   └── utils/ (7 files)
│
└── [Batch scripts]
```

---

### 1.5 Customer Gallery (`apps/gallery/`)

**Type:** React + Vite + Express + SQLite + Stripe
**Port:** 8090
**Version:** 4.1.0

Customer-facing portal for viewing and purchasing photos.

#### Structure

```
apps/gallery/
├── backend/
│   ├── server.js
│   ├── src/ (14 files)
│   ├── routes/ (4 files)
│   ├── workers/ (2 files)
│   └── migrations/ (10 files)
│
├── src/
│   ├── main.tsx, App.tsx
│   │
│   ├── components/
│   │   ├── customer/ (8 files)
│   │   │   ├── CustomerGallery.tsx
│   │   │   ├── CheckoutScreen.tsx
│   │   │   ├── DownloadPage.tsx
│   │   │   └── [5 more]
│   │   │
│   │   ├── management/ (25+ files)
│   │   ├── touch/ (22 files)
│   │   ├── albums/ (6 files)
│   │   ├── orders/ (7 files)
│   │   ├── settings/ (19 files)
│   │   └── common/ (18 files)
│   │
│   └── services/ (15 files)
│
└── [Batch scripts]
```

---

### 1.6 Website (`apps/website/`)

**Type:** Next.js 15 (App Router)
**Port:** 3001
**Deployment:** Cloudflare Pages

Marketing website with 6-language support.

#### Structure

```
apps/website/
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx
│   │   ├── robots.ts, sitemap.ts
│   │   │
│   │   ├── about/page.tsx
│   │   ├── blog/page.tsx, [slug]/page.tsx
│   │   ├── bookings/page.tsx
│   │   ├── careers/page.tsx
│   │   ├── clients/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── portfolio/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── services/page.tsx
│   │   ├── terms/page.tsx
│   │   └── testimonials/page.tsx
│   │
│   ├── components/
│   │   ├── layout/ (3 files)
│   │   ├── sections/ (12 files)
│   │   ├── seo/ (1 file)
│   │   └── ui/ (8 files)
│   │
│   ├── contexts/
│   │   └── LanguageContext.tsx  # 6 languages + RTL
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── settings.ts
│   │   └── translations.ts
│   │
│   └── types/
│
├── public/
│   ├── blog/, gallery/, manage/
│   └── portfolio/ (27 images)
│
└── [Config files]
```

---

## 2. Shared Infrastructure

### 2.1 Packages

```
packages/
└── backup-service/              # @clickflash/backup-service v1.0.0
    ├── package.json
    ├── README.md
    └── index.js                 # 421 lines
```

### 2.2 Shared Schema

```
apps/shared/
└── cloud-schema.sql             # 184 lines
```

### 2.3 Deployment

```
deployment/
├── nginx.conf                   # Reverse proxy config
├── backup.sh                    # Automated backup
└── pocketbase.service           # Systemd service
```

### 2.4 Scripts

```
scripts/
├── generate_nodes.js            # Generate 100 node identities
├── ingest_nodes.js              # Ingest into database
├── verify_ingestion.js          # Verify ingestion
└── cleanup-stale-queues.js      # Clean orphaned queues
```

---

## 3. Security Model

### 3.1 LAN Authentication

| Layer | Implementation |
|-------|---------------|
| **Signing** | HMAC-SHA256 |
| **Timestamp Window** | 5 minutes |
| **Secret** | 32-byte random per kiosk |

### 3.2 User Authentication

| Layer | Implementation |
|-------|---------------|
| **Method** | JWT + Express sessions |
| **CSRF** | Enabled |
| **Rate Limiting** | 5 req/min on login |

### 3.3 Touch Isolation

- Blocks non-private IPs
- Port restrictions
- No external network access

---

## 4. Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `photos` | Photo records with metadata |
| `albums` | Photo albums |
| `orders` | Customer orders |
| `order_items` | Order line items |
| `users` | System users |
| `kiosks` | Paired kiosk devices |
| `settings` | App configuration |
| `operation_logs` | Audit trail |
| `sync_state` | Sync tracking |
| `marketing_campaigns` | Campaign data |
| `ledger_entries` | Financial records |
| `inventory` | Stock management |
| `session_types` | Session categories |
| `categories` | Photo categories |

### Migrations

- 51+ incremental SQL migrations
- WAL mode for concurrency
- better-sqlite3 driver

---

## 5. Sync Architecture

### 5.1 Touch → Master (LAN)

- WebSocket heartbeat every 30s
- Order exports via HMAC-signed HTTP
- Real-time SSE events

### 5.2 Master → Cloud (Optional)

- 1-minute sync interval
- Low-res watermarked previews
- JSON metadata
- Chunked uploads (1MB)

---

## 6. Technology Stack

### Frontend

| Technology | Version |
|------------|---------|
| React | 19 |
| TypeScript | 5.x |
| Tailwind CSS | 3.4 / 4 |
| TanStack Query | Latest |
| Vite | 6.x |
| Next.js | 15 (Website) |

### Backend

| Technology | Version |
|------------|---------|
| Express | 4.x |
| SQLite | 3 (better-sqlite3) |
| Sharp | Latest |
| face-api.js | Latest |
| TensorFlow.js | Latest |

### Desktop

| Technology | Version |
|------------|---------|
| Electron | 39 |
| Tauri | v2 |

### Cloud

| Technology | Purpose |
|------------|---------|
| Cloudflare Workers | Edge compute |
| Cloudflare R2 | Object storage |
| Cloudflare D1 | SQLite at edge |

---

## 7. Key Files Reference

### Master Backend

| File | Purpose |
|------|---------|
| `apps/master/backend/server.ts` | Main API server |
| `apps/master/backend/shared/db.ts` | Database manager |
| `apps/master/backend/shared/lanSigningMiddleware.ts` | HMAC security |
| `apps/master/backend/services/SyncManager.ts` | Sync orchestration |

### Master Frontend

| File | Purpose |
|------|---------|
| `apps/master/src/App.tsx` | Root component |
| `apps/master/src/services/apiService.ts` | API client |
| `apps/master/src/components/MainLayout.tsx` | Layout wrapper |

### Touch

| File | Purpose |
|------|---------|
| `apps/touch/backend/server.ts` | Kiosk API |
| `apps/touch/src/context/KioskContext.tsx` | Main state |
| `apps/touch/src/components/touch/PhotoSelectionScreen.tsx` | Main UI |

---

*Generated: 2026-02-17*
*ClickFlash v4.2.0*
