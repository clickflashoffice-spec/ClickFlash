---
sidebar_position: 1
title: Architecture Overview
description: System architecture, data flow, and component relationships in the ClickFlash ecosystem.
---

# ClickFlash — Ecosystem Architecture

## System Overview

ClickFlash is an offline-first photography management platform for resorts and event venues. The system processes, manages, and delivers high-resolution photographs exceeding 100GB per deployment.

```mermaid
graph TB
    subgraph LOCAL["Local Network (Offline)"]
        M["Master Station<br/>Port 8090"]
        T1["Touch Kiosk 1<br/>Port 8091"]
        T2["Touch Kiosk 2<br/>Port 8091"]
        MT["Money Trash<br/>Port 3000"]
        
        T1 -->|"HMAC-signed HTTP"| M
        T2 -->|"HMAC-signed HTTP"| M
        MT -->|"HTTP API"| M
        M -->|"Push assets"| T1
        M -->|"Push assets"| T2
    end
    
    subgraph CLOUD["Cloudflare (Online)"]
        HUB["Management Hub<br/>Worker + D1"]
        GAL["Customer Gallery<br/>Worker + R2"]
        WEB["Website<br/>Pages"]
    end
    
    M -->|"Cloud Sync<br/>(Master only)"| HUB
    M -->|"Asset Upload"| GAL
```

## Application Inventory

| App | Type | Port | Runtime | Role |
|-----|------|------|---------|------|
| **Master Station** | Local (Electron) | 8090 | Express + SQLite | Photo processing, face recognition, cloud sync gateway |
| **Touch Kiosk** | Local (Electron) | 8091 | Express + SQLite | Customer-facing selection and order creation |
| **Money Trash** | Local (Tauri) | — | Tauri + React | Photo upload gateway |
| **Management Hub** | Cloud | — | Cloudflare Worker + D1 | Business analytics and centralized management |
| **Customer Gallery** | Cloud | — | Cloudflare Worker + R2 | Customer photo access and purchase |
| **Website** | Cloud | — | Cloudflare Pages | Marketing and public presence |

## Directory Structure

```
ClickFlash/
├── apps/
│   ├── master/          # Master Station (Electron + Express)
│   │   ├── backend/     # Express API, routes, shared modules
│   │   ├── src/         # React frontend
│   │   └── main.js      # Electron main process
│   ├── touch/           # Touch Kiosk (Electron + Express)
│   │   ├── backend/     # Express API, order export
│   │   ├── src/         # React frontend
│   │   └── main.js      # Electron main process
│   ├── moneytrash/      # Money Trash (Next.js)
│   ├── management/      # Management Hub (Cloudflare Worker)
│   │   ├── backend/     # Worker source (wrangler)
│   │   └── src/         # React frontend
│   ├── gallery/         # Customer Gallery (Cloudflare Worker)
│   │   ├── backend/     # Worker source (wrangler)
│   │   └── src/         # React frontend
│   └── website/         # Main Website (Next.js static export)
├── packages/
│   ├── types/           # @clickflash/types — shared TypeScript types
│   └── ui/              # @clickflash/ui — shared UI components
├── scripts/             # Operational scripts (build, deploy, rotate keys)
└── docs/                # Production guides + archived dev records
```

## API Routes

### Master Station (21 routes)

| Route Prefix | File | Purpose |
|-------------|------|---------| 
| `/api/auth` | `auth.ts` | Login, signup, session management |
| `/api/collections` | `collections.ts` | Generic CRUD for all tables |
| `/api/cloud` | `cloud.ts` | Cloud sync status and control |
| `/api/orders` | `orders.ts` | Order fulfillment and management |
| `/api/faces` | `faces.ts` | Face recognition search and reindex |
| `/api/culling` | `culling.ts` | Photo culling and analysis |
| `/api/session-types` | `sessionTypes.ts` | Session type management |
| `/api/gallery` | `gallery.ts` | Gallery watermark generation |
| `/api/gallery-auth` | `galleryAuth.ts` | Gallery authentication |
| `/api/gallery-checkout` | `galleryCheckout.ts` | Gallery purchase flow |
| `/api/analytics` | `analytics.ts` | Analytics and reporting |
| `/api/marketing` | `marketing.ts` | Marketing campaigns |
| `/api/dashboard` | `dashboard.ts` | Dashboard widgets |
| `/api/ledger` | `ledger.ts` | Financial ledger |
| `/api/pairing` | `pairing.ts` | Kiosk pairing (QR + HMAC) |
| `/api/sync` | `sync.ts` | Offline mutation sync |
| `/api/files` | `files.ts` | File upload and management |
| `/api/system` | `system.ts` | Health, IP, printers, diagnostics |
| `/api/realtime` | `realtime.ts` | SSE real-time events |
| `/api/notification` | `notification.ts` | Customer notifications |
| `/api/assistance` | `assistance.ts` | Assistance requests |

### Touch Kiosk (8 routes)

| Route Prefix | File | Purpose |
|-------------|------|---------| 
| `/api/auth` | `auth.ts` | Local authentication |
| `/api/collections` | `collections.ts` | Local data CRUD |
| `/api/orders` | `orders.ts` | Order creation |
| `/api/orders/:id/export-to-master` | `orderExport.ts` | HMAC-signed export to Master |
| `/api/files` | `files.ts` | Local asset serving |
| `/api/sync` | `sync.ts` | Sync with Master |
| `/api/system` | `system.ts` | Health and diagnostics |
| `/api/realtime` | `realtime.ts` | SSE events |

## Security Model

### LAN Communication

- **HMAC-SHA256 Request Signing**: All Touch → Master requests include `X-Kiosk-ID`, `X-Timestamp`, `X-Signature` headers
- **Replay Prevention**: 5-minute timestamp window
- **Secret Management**: 32-byte signing secret generated during pairing, persisted to both Master and Touch DBs

### Network Isolation

- **Touch App**: Strict LAN-only (`setupNetworkIsolation` in `main.js`). Blocks all non-private IPs, restricts ports, strips Referer headers.
- **Master App**: Offline-first with optional cloud sync. Only Master communicates with Cloudflare.

## Synchronization Architecture

### Master ↔ Touch Kiosk (LAN)

- **Transport**: WebSocket (primary) + HTTP fallback (`/api/sync/mutation`)
- **Conflict Resolution**: Vector clocks per entity
- **Idempotency**: `mutation_ack_log` table keyed by `(client_id, mutation_id)`
- **Mutation Validation**: Zod schema validation before database transaction
- **Order Sync**: Touch pushes pending orders to `/api/orders/kiosk/orders` with `clientMutationId`

### Master ↔ Cloud Hub

- **Transport**: HTTPS with RS256 JWT + hardware fingerprinting
- **Batching**: Operation logs grouped by pipeline
- **Idempotency**: `X-Idempotency-Key` header per batch
- **Circuit Breaker**: Per-pipeline failure tracking
- **Retry Policy**: Exponential backoff with jitter. DLQ after 5 consecutive failures.

## Database

| Database | App | Engine | Key Tables |
|----------|-----|--------|------------|
| `master.db` | Master | SQLite (better-sqlite3) | photos, albums, orders, kiosks, settings, operation_logs, pending_writes, mutation_ack_log |
| `touch.db` | Touch | SQLite (better-sqlite3) | orders, settings, sync_state |
| `clickflash-hub-db` | Management + Gallery | Cloudflare D1 | desks, orders, photos, daily_objectives, campaigns |
