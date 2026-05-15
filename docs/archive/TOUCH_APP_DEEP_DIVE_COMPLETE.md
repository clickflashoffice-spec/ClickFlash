# ClickFlash Touch App - Complete Deep Dive Analysis

**Date:** 2026-03-01  
**Version:** 4.1.1  
**App Type:** Touch Kiosk Application (Electron + React + Node.js/Express)  
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Frontend Deep Dive](#4-frontend-deep-dive)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Database Architecture](#6-database-architecture)
7. [Synchronization System](#7-synchronization-system)
8. [Offline-First Strategy](#8-offline-first-strategy)
9. [Security Analysis](#9-security-analysis)
10. [Audit Plan](#10-audit-plan)
11. [Recommendations](#11-recommendations)

---

## 1. Executive Summary

The ClickFlash Touch Kiosk is a sophisticated **three-process Electron application** designed for customer self-service photo ordering in hospitality/resort environments. It operates with an **offline-first architecture**, enabling continuous operation even during network interruptions.

### Key Capabilities

| Feature | Status | Implementation |
|---------|--------|----------------|
| Offline-First Operation | Production | IndexedDB + SQLite + Sync Queue |
| Face Recognition | Production | @vladmandic/face-api |
| Real-time Sync | Production | WebSocket + HTTP fallback |
| Kiosk Mode | Production | Electron fullscreen + input blocking |
| Photo Ordering | Production | Cart system with print/digital delivery |
| Room Number Filter | Production | Album filtering by room |
| Auto-Photo Sync | Production | File watcher + Master sync |

### Architecture Health Score

| Category | Score | Assessment |
|----------|-------|------------|
| **Architecture** | 8.5/10 | Clean separation, well-designed patterns |
| **TypeScript** | 6.0/10 | 127 `any` types need addressing |
| **Security** | 7.5/10 | Good foundation, needs hardening |
| **Offline Support** | 9.5/10 | Excellent resilience |
| **Code Quality** | 7.0/10 | Good structure, needs linting |
| **Test Coverage** | 5.0/10 | Jest configured, needs more tests |

**Overall: 7.4/10** - Production ready with improvement opportunities

---

## 2. Architecture Overview

### 2.1 Three-Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ELECTRON MAIN PROCESS                       │
│                         (main.js)                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  • Window Management (kiosk mode, fullscreen)             │  │
│  │  • Backend Process Spawning (fork)                        │  │
│  │  • IPC Bridge (Renderer ↔ Main ↔ Backend)                 │  │
│  │  • Input Blocking (DevTools, Reload, Alt+F4)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ fork()
┌───────────────────────────────▼─────────────────────────────────┐
│                     BACKEND PROCESS (Node.js)                    │
│                    (backend/server.ts :8091)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Express Server                                           │  │
│  │  ├── SQLite Database (better-sqlite3)                     │  │
│  │  ├── File System Watcher (chokidar)                       │  │
│  │  ├── Photo Processor (sharp)                              │  │
│  │  ├── Face Recognition (face-api)                          │  │
│  │  └── WebSocket Real-time Service                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ http://localhost:8091
┌───────────────────────────────▼─────────────────────────────────┐
│                    RENDERER PROCESS (React)                      │
│                      (src/App.tsx)                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React 19 SPA                                             │  │
│  │  ├── Vite Build System                                    │  │
│  │  ├── Tailwind CSS Styling                                 │  │
│  │  ├── React Query (TanStack)                               │  │
│  │  ├── Dexie (IndexedDB wrapper)                            │  │
│  │  └── Face-api.js (client-side face search)                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MASTER STATION (Port 8090)                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Master DB  │◄───│  Album Mgmt  │◄───│ Photo Upload │              │
│  │  (PocketBase)│    │              │    │              │              │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘              │
│         │                   │                                           │
│         │    WebSocket / HTTP API                                       │
│         │    Port 8090 + /ws                                            │
└─────────┼───────────────────┼───────────────────────────────────────────┘
          │                   │ Network (WiFi/LAN)
          │                   ▼
          │         ┌─────────────────────┐
          │         │ Master WebSocket    │
          │         │ - Album broadcasts  │
          │         │ - Product updates   │
          │         │ - Heartbeat         │
          │         └──────────┬──────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           TOUCH KIOSK (Port 8091)                        │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     SYNC SERVICE (Frontend)                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│  │  │ Push Orders  │  │Pull Albums   │  │ Retry Queue  │          │    │
│  │  │ to Master    │──┤from Master  │──┤ (failed)     │          │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   LOCAL STORAGE LAYERS                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│  │  │ SQLite       │  │ IndexedDB    │  │ localStorage │          │    │
│  │  │ (Backend)    │  │ (Dexie)      │  │ (Settings)   │          │    │
│  │  │ - Albums     │  │ - Albums     │  │ - Cart       │          │    │
│  │  │ - Photos     │  │ - Orders     │  │ - Kiosk ID   │          │    │
│  │  │ - Orders     │  │ - Queue      │  │ - Config     │          │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Core Dependencies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Frontend Framework** | React | 19.2.0 | UI Components |
| **Build Tool** | Vite | 7.2.4 | Dev server & bundling |
| **Styling** | Tailwind CSS | 3.4.18 | Utility-first CSS |
| **State Management** | React Query | 5.90.10 | Server state |
| **Client DB** | Dexie | 4.2.1 | IndexedDB wrapper |
| **Desktop Shell** | Electron | 39.2.7 | Kiosk application |
| **Backend** | Express | 5.2.1 | API Server |
| **Database** | better-sqlite3 | 12.5.0 | SQLite for Node.js |
| **Face Recognition** | @vladmandic/face-api | 1.7.15 | ML face detection |
| **Image Processing** | sharp | 0.34.5 | Photo manipulation |
| **Authentication** | bcrypt + jsonwebtoken | 5.1.0 / 9.0.2 | Auth & hashing |
| **File Watching** | chokidar | 5.0.0 | Auto-import photos |
| **Validation** | zod | 4.1.13 | Schema validation |

### 3.2 Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Type checking |
| Jest + ts-jest | Unit testing |
| Playwright | E2E testing |
| esbuild | Backend bundling |
| concurrently | Multi-process dev |

---

## 4. Frontend Deep Dive

### 4.1 Component Architecture

```
src/
├── App.tsx                          # Main app shell, view routing
├── components/
│   ├── common/                      # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   └── VirtualGrid.tsx          # Performance optimization
│   ├── touch/                       # Touch-specific screens
│   │   ├── WelcomeScreen.tsx        # Entry point
│   │   ├── PhotoSelectionScreen.tsx # Browse albums/photos
│   │   ├── PhotoPreviewScreen.tsx   # Full-size view + cart
│   │   ├── OrderConfigurationScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── ThankYouScreen.tsx
│   │   ├── FaceSearchModal.tsx      # AI face search
│   │   └── RoomNumberModal.tsx      # Room filter
│   └── DeviceSetup.tsx              # Initial configuration
├── context/
│   └── KioskContext.tsx             # Global kiosk state
├── hooks/                           # Custom React hooks
│   ├── useAlbums.ts
│   ├── useOrders.ts
│   ├── usePermissions.ts
│   └── useDebounce.ts
├── services/                        # Business logic
│   ├── api/                         # API clients
│   │   ├── core.ts
│   │   ├── authService.ts
│   │   └── photoService.ts
│   ├── pb.ts                        # PocketBase client
│   ├── syncService.ts               # Master sync logic
│   ├── offlineStorage.ts            # IndexedDB wrapper
│   ├── OfflineQueue.ts              # Offline mutation queue
│   └── faceRecognitionService.ts    # Face API integration
├── types.ts                         # TypeScript definitions
└── utils/                           # Utilities
    ├── logger.ts
    └── validation.ts
```

### 4.2 State Management

#### KioskContext (Global State)

```typescript
interface KioskContextType {
    kioskId: string | null;              // Unique device ID
    isIdle: boolean;                     // Screensaver trigger
    idleTimeoutMs: number;               // Configurable timeout
    kioskConnectionStatus: 'Connected' | 'Disconnected' | 'Offline';
    globalFeatures: { ai: boolean; face: boolean; watermark: boolean };
    kioskAlbums: Album[];                // Available albums
    products: Product[];                 // Available products
    packs: Pack[];                       // Package deals
    refreshProductData: () => Promise<void>;
    resetIdleTimer: () => void;          // User activity
    isConfigRequired: boolean;           // Setup needed
    showToast: (msg: string) => void;
}
```

#### Local State (Component Level)

- **Cart**: `CartItem[]` persisted to localStorage
- **Active View**: `welcome | photos | photo-detail | order-config`
- **Active Photo/Album**: Current selection state

### 4.3 Key UI Flows

```
[Welcome Screen]
       │
       ├─── Room Number Entry ───► [Filter by Room]
       │
       └─── Browse Photos ───────► [Photo Selection Screen]
                                          │
                       ┌──────────────────┼──────────────────┐
                       ▼                  ▼                  ▼
               [View Album]       [Face Search]      [View Cart]
                       │                  │                  │
                       ▼                  │                  ▼
             [Photo Preview Screen]       │        [Order Config]
                       │                  │                  │
                       └──────────────────┘                  ▼
                       │                           [Checkout Flow]
                       ▼                                    │
              [Add to Cart]                                ▼
                       │                           [Thank You Screen]
                       ▼                                    │
              [Continue Shopping] ◄─────────────────────────┘
```

### 4.4 Performance Optimizations

| Technique | Implementation | Benefit |
|-----------|----------------|---------|
| **Lazy Loading** | `React.lazy()` for screens | Faster initial load |
| **Virtual Scrolling** | `react-window` for photo grids | Handles 1000s of photos |
| **Blob URL Management** | `blobUrlsRef` cleanup | Prevents memory leaks |
| **Debounced Search** | `useDebounce` hook | Reduces API calls |
| **Memoization** | `useMemo` for filtered albums | Reduces re-renders |
| **Image Optimization** | `sharp` backend processing | Optimal file sizes |

---

## 5. Backend Deep Dive

### 5.1 Server Architecture (backend/server.ts)

```typescript
// Core Context Object Pattern
const context = {
    dbManager,        // SQLite database
    logger,           // Structured logging
    auditLogger,      // Security audit trail
    UPLOAD_DIR,       // Photo storage path
    IMPORT_DIR,       // Import watch path
    PORT,             // Server port (8091)
    JWT_SECRET,       // Dynamic secret generation
    rateLimiter,      // Request throttling
    authMiddleware,   // JWT verification
    realtimeService,  // WebSocket broadcasting
    photoProcessor,   // sharp image processing
    vectorIndex,      // Face recognition index
};
```

### 5.2 Route Structure

```
backend/routes/
├── auth.ts              # POST /api/login, /api/refresh
├── collections.ts       # CRUD for all DB tables
├── sync.ts              # /api/sync/* - Master sync
├── system.ts            # Health, settings, config
├── files.ts             # File upload/download
├── orderExport.ts       # Order processing & export
├── realtime.ts          # WebSocket management
└── faces.ts             # Face recognition API
```

### 5.3 Services Layer

```
backend/services/
├── albumService.ts      # Album creation logic
├── realtimeService.ts   # WebSocket event broadcasting
├── watcherService.ts    # File system monitoring
├── faceService.ts       # Face recognition processing
└── VectorIndexService.ts # Face descriptor indexing
```

### 5.4 Shared Utilities

```
backend/shared/
├── db.ts                # DatabaseManager class
├── auth.ts              # Password hashing/verification
├── csrf.ts              # CSRF token generation
├── errorHandler.ts      # Standardized error responses
├── logger.ts            # Structured logging
├── auditLogger.ts       # Security event logging
├── rateLimiter.ts       # Request throttling
├── validation.ts        # Input validation
├── photoProcessor.ts    # Image processing pipeline
├── migrations/          # Database migrations
└── workers/             # Worker thread implementations
    ├── faceWorker.ts    # Face detection worker
    └── photoWorker.ts   # Photo processing worker
```

---

## 6. Database Architecture

### 6.1 Schema Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **users** | Photographers & Admins | id, email, password, role, destinationId, faceDescriptor |
| **albums** | Photo collections | id, title, date, photographerId, roomNumber, kiosk_ready |
| **photos** | Individual photos | id, albumId, url, photographerId, fileHash, storagePath |
| **orders** | Customer orders | id, clientName, status, total, items (JSON), source |
| **products** | Available products | id, name, category, price, stock |
| **photo_faces** | Face recognition data | id, photoId, descriptor, box |
| **kiosk_sessions** | Device heartbeat | id, kioskId, lastSeen |
| **settings** | Key-value config | key, value (JSON) |

### 6.2 Migration History

| Migration | Purpose |
|-----------|---------|
| 001_initial_schema.sql | Core tables |
| 002_enhanced_photos_schema.sql | Photo metadata |
| 003_add_destinations.sql | Multi-location support |
| 004_add_session_types.sql | Booking session types |
| 005_add_packs_and_bookings.sql | Product packs & bookings |
| 006_add_order_source.sql | Order source tracking |
| 007_add_touch_integration_settings.sql | Kiosk settings |
| 008_add_password_change_flag.sql | Security enhancement |
| 009_add_kiosk_ready.sql | Album visibility control |
| 010_add_kiosk_sessions.sql | Heartbeat tracking |
| 011_add_face_recognition.sql | Face descriptors |

---

## 7. Synchronization System

### 7.1 Sync Architecture

The Touch Kiosk syncs bidirectionally with the Master Station:

```
┌────────────────┐         ┌────────────────┐
│   TOUCH KIOSK  │         │     MASTER     │
│   (Port 8091)  │◄───────►│   (Port 8090)  │
└───────┬────────┘         └───────┬────────┘
        │                          │
        │  1. Heartbeat Check      │
        │ ───────────────────────► │
        │                          │
        │  2. Push Pending Orders  │
        │ ───────────────────────► │
        │                          │
        │  3. Pull Finalized Albums│
        │ ◄─────────────────────── │
        │                          │
        │  4. Download Photos      │
        │ ───────────────────────► │
```

### 7.2 Sync Features

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **Checkpoint/Resume** | `syncCheckpointService` | Handle interruptions |
| **Batch Processing** | `BATCH_SIZE = 5` albums | Memory efficiency |
| **Concurrent Downloads** | `MAX_CONCURRENT_DOWNLOADS = 3` | Speed optimization |
| **Retry Queue** | `failedPhotoQueue` + localStorage | Handle transient failures |
| **Exponential Backoff** | `RETRY_BACKOFF_BASE * 2^retryCount` | Smart retry |
| **Duplicate Detection** | `processedPhotoIds` Set | Prevent re-processing |
| **Real-time Skip** | `realtimeReceivedAlbums` | Avoid double sync |

### 7.3 Sync States

```typescript
interface SyncProgress {
    albumsProcessed: number;
    photosProcessed: number;
    photosTotal: number;
    bytesTransferred: number;
    startTime: number;
    currentAlbum?: string;
}

interface SyncCheckpoint {
    timestamp: number;
    albumsProcessed: string[];
    photosProcessed: string[];
    totalAlbums: number;
    totalPhotos: number;
    bytesTransferred: number;
    startTime: number;
    syncType: 'full' | 'incremental';
}
```

---

## 8. Offline-First Strategy

### 8.1 Storage Hierarchy

```
Layer 1: In-Memory (React State)
├── Active cart items
├── Current view state
├── Selected photos/albums
└── Lost on refresh

Layer 2: localStorage (Persistent)
├── Cart contents (JSON)
├── Kiosk settings
├── Kiosk ID
├── Connection settings
├── Failed sync queue
├── Sync checkpoints
└── Survives refresh

Layer 3: IndexedDB (Dexie) - Large Data
├── Albums cache
├── Orders cache
├── Photo metadata
└── Large capacity (~50MB+)

Layer 4: SQLite (Backend) - Source of Truth
├── Complete albums
├── All photos
├── All orders
├── Products & packs
└── Persistent filesystem
```

### 8.2 Offline Queue System

```typescript
interface QueueItem {
    id: string;              // crypto.randomUUID()
    type: 'MUTATION';
    entity: string;          // 'orders', 'photos', etc.
    action: string;          // 'create', 'update', 'delete'
    payload: any;            // Operation data
    timestamp: number;
    retryCount: number;
}

class OfflineQueueService {
    private queue: QueueItem[] = [];
    private maxRetries = 5;
    
    // Triggers on 'online' event or socket reconnect
    public async processQueue(): Promise<void>
    
    // Sequential processing to preserve order
    // Failed items block subsequent items
}
```

### 8.3 Resilience Patterns

| Scenario | Handling |
|----------|----------|
| Network Lost | Queue mutations, show offline indicator |
| Network Restored | Auto-process queue, resume sync |
| App Crash | Recover from checkpoint, retry failed items |
| Storage Full | Log warning, prioritize recent data |
| Master Unavailable | Use cached data, retry with backoff |
| Auth Expired | Auto-relogin (if configured) |

---

## 9. Security Analysis

### 9.1 Implemented Security Measures

| Feature | Status | Implementation |
|---------|--------|----------------|
| **CSRF Protection** | Implemented | `backend/shared/csrf.ts` - 24h tokens |
| **JWT Authentication** | Implemented | `jsonwebtoken` with persistent secret |
| **Password Hashing** | Implemented | `bcrypt` with salt rounds |
| **Rate Limiting** | Implemented | `backend/shared/rateLimiter.ts` |
| **CORS Policy** | Implemented | Restricted to local network |
| **Input Validation** | Implemented | `zod` schemas |
| **Audit Logging** | Implemented | `backend/shared/auditLogger.ts` |
| **Kiosk Input Blocking** | Implemented | DevTools, Reload, Alt+F4 blocked |
| **Context Isolation** | Implemented | Electron `contextIsolation: true` |

### 9.2 Security Concerns

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| **127 `any` types** | Medium | Backend routes | Add strict typing |
| **Console logging** | Low | server.ts | Use structured logger |
| **Admin keycombo hardcoded** | Low | App.tsx:56 | Move to config |
| **JWT fallback secret** | Medium | server.ts:237 | Enforce env var |
| **Missing ESLint** | Medium | - | Add security linting |

---

## 10. Audit Plan

### 10.1 Automated Audit Checklist

#### Phase 1: Static Analysis (Pre-Commit)

```bash
# TypeScript strictness
grep -r ": any" apps/touch/backend --include="*.ts" | wc -l  # Target: 0

# Console statements
grep -r "console\." apps/touch/backend --include="*.ts" | wc -l  # Target: 0

# ESLint configuration
ls -la apps/touch/eslint.config.js  # Must exist

# Test coverage
npm run test:coverage  # Target: >70%

# Type checking
npm run typecheck  # Must pass
```

#### Phase 2: Security Audit

| Check | Command/Method | Frequency |
|-------|----------------|-----------|
| Dependency vulnerabilities | `npm audit` | Weekly |
| Outdated packages | `npm outdated` | Monthly |
| JWT secret strength | Code review | Quarterly |
| CSRF token validity | Manual test | Quarterly |
| Rate limiting | Load test | Quarterly |

#### Phase 3: Performance Audit

| Metric | Target | Test Method |
|--------|--------|-------------|
| Initial Load | <3s | Lighthouse |
| Time to Interactive | <5s | Lighthouse |
| Memory Usage | <200MB | DevTools |
| Photo Render (1000) | <2s | react-window |
| Sync Throughput | >10 photos/min | Manual |
| Offline Queue Process | <1s/item | Manual |

#### Phase 4: E2E Test Coverage

```typescript
// tests/e2e/ - Must Cover:
- Welcome → Photo Selection → Preview → Cart → Checkout flow
- Face search functionality
- Room number filtering
- Offline mode operation
- Sync resume after interruption
- Kiosk idle timeout
- Admin override keycombo
```

### 10.2 Manual Review Checklist

#### Code Quality

- [ ] All `any` types replaced with proper interfaces
- [ ] All `console.log` replaced with structured logger
- [ ] Error boundaries present on all lazy-loaded components
- [ ] Memory leaks checked (blob URLs, intervals, listeners)
- [ ] Loading states implemented for async operations

#### Security

- [ ] JWT secret not in codebase (env var only)
- [ ] CSRF tokens validated on mutations
- [ ] Input validation on all routes
- [ ] Rate limiting tested
- [ ] SQL injection prevention (parameterized queries)

#### UX

- [ ] Offline indicator visible when disconnected
- [ ] Loading spinners on async operations
- [ ] Error messages user-friendly
- [ ] Touch targets minimum 44px
- [ ] High contrast mode support

### 10.3 Monitoring & Alerting

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Failed sync attempts | >5 in 10min | Slack |
| Memory usage | >500MB | Slack |
| Disk space | <1GB free | Slack |
| Heartbeat missed | >2 in 5min | SMS |
| Order submission failed | >1 | Email |

---

## 11. Recommendations

### 11.1 Priority 1: Critical (Next Sprint)

1. **Add ESLint Configuration**
   ```javascript
   // eslint.config.js
   export default [
     {
       rules: {
         '@typescript-eslint/no-explicit-any': 'error',
         'no-console': 'warn',
       }
     }
   ];
   ```

2. **Fix Type Safety Issues**
   - Replace 127 `any` types with proper interfaces
   - Add return types to all functions
   - Fix `authMiddleware` typing

3. **Replace Console Logs**
   - 19 instances in server.ts
   - Use structured logger throughout

### 11.2 Priority 2: High (Next Month)

4. **Increase Test Coverage**
   - Add unit tests for syncService
   - Add E2E tests for checkout flow
   - Target: 70% coverage

5. **Security Hardening**
   - Move admin keycombo to configuration
   - Enforce JWT_SECRET from environment
   - Add request payload size limits

6. **Performance Optimization**
   - Implement photo lazy loading in preview
   - Add virtual scrolling to all lists
   - Optimize face recognition batch size

### 11.3 Priority 3: Medium (Next Quarter)

7. **Observability**
   - Add Sentry error tracking
   - Implement metrics collection
   - Create health check dashboard

8. **Documentation**
   - API documentation (OpenAPI)
   - Architecture decision records
   - Deployment runbooks

9. **Developer Experience**
   - Hot reload for backend
   - Mock data for development
   - Docker compose setup

---

## Appendix A: File Inventory

### Critical Files (Touch Daily)

| File | Purpose | Lines |
|------|---------|-------|
| `backend/server.ts` | Express entry point | 498 |
| `src/App.tsx` | React entry point | 285 |
| `src/context/KioskContext.tsx` | Global state | 731 |
| `src/services/syncService.ts` | Master sync | 802 |
| `backend/shared/db.ts` | Database manager | 142 |

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies & scripts |
| `electron-builder.json` | Build configuration |
| `jest.config.js` | Test configuration |
| `playwright.config.ts` | E2E configuration |
| `vite.config.ts` | Build tool config |
| `tsconfig.json` | TypeScript config |

---

## Appendix B: Environment Variables

```bash
# Required
PORT=8091                    # Touch backend port
DATA_DIR=./pb_data           # Data storage path
NODE_ENV=production          # Environment

# Security
JWT_SECRET=<random-64-char>  # Auth secret (auto-generated if missing)
CORS_ORIGINS=                # Comma-separated allowed origins

# Optional
LOG_LEVEL=INFO               # DEBUG | INFO | WARN | ERROR
VITE_USE_MOCK_DATA=false     # Enable mock data for testing
```

---

## Appendix C: Migration Path

### From Master App to Touch

| Feature | Master | Touch | Sync Strategy |
|---------|--------|-------|---------------|
| Albums | Full CRUD | Read-only | Pull from Master |
| Photos | Upload/Edit | View/Order | Pull from Master |
| Orders | Manage | Create | Push to Master |
| Products | Configure | Browse | Pull from Master |
| Users | Full CRUD | Auth only | Shared auth |

---

*Document Version: 1.0*  
*Last Updated: 2026-03-01*  
*Next Review: 2026-06-01*
