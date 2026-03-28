# ClickFlash Touch App - Comprehensive Architectural Deep Dive

**Date:** 2026-03-06  
**Version:** 4.1.1  
**App Type:** Touch Kiosk Application (Electron + React + Node.js/Express)  
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Electron Main Process](#5-electron-main-process)
6. [Database Architecture](#6-database-architecture)
7. [Synchronization System](#7-synchronization-system)
8. [Offline-First Strategy](#8-offline-first-strategy)
9. [Face Recognition Integration](#9-face-recognition-integration)
10. [Security Architecture](#10-security-architecture)
11. [Data Flow Architecture](#11-data-flow-architecture)
12. [Key Patterns & Best Practices](#12-key-patterns--best-practices)
13. [Identified Issues & Recommendations](#13-identified-issues--recommendations)

---

## 1. Executive Summary

The ClickFlash Touch Kiosk is a sophisticated **three-process Electron application** designed for customer self-service photo ordering in hospitality/resort environments. It operates with an **offline-first architecture**, enabling continuous operation even during network interruptions.

### Key Capabilities

| Feature                 | Status     | Implementation                          |
| ----------------------- | ---------- | --------------------------------------- |
| Offline-First Operation | Production | IndexedDB + SQLite + Sync Queue         |
| Face Recognition        | Production | @vladmandic/face-api                    |
| Real-time Sync          | Production | WebSocket + HTTP fallback               |
| Kiosk Mode              | Production | Electron fullscreen + input blocking    |
| Photo Ordering          | Production | Cart system with print/digital delivery |
| Room Number Filter      | Production | Album filtering by room                 |
| Auto-Photo Sync         | Production | File watcher + Master sync              |

### Architecture Health Score

| Category            | Score  | Assessment                                     |
| ------------------- | ------ | ---------------------------------------------- |
| **Architecture**    | 8.5/10 | Clean separation, well-designed patterns       |
| **TypeScript**      | 6.0/10 | 127 `any` types need addressing                |
| **Security**        | 8.0/10 | Good foundation, network isolation implemented |
| **Offline Support** | 9.5/10 | Excellent resilience                           |
| **Code Quality**    | 7.0/10 | Good structure, needs linting                  |
| **Test Coverage**   | 5.0/10 | Jest configured, needs more tests              |

**Overall: 7.7/10** - Production ready with improvement opportunities

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
│  │  • Network Isolation (LAN-only mode)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ fork()
┌───────────────────────────────▼─────────────────────────────────┐
│                     BACKEND PROCESS (Node.js)                      │
│                    (backend/server.ts :8091)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Express Server                                            │  │
│  │  ├── SQLite Database (better-sqlite3)                      │  │
│  │  ├── File System Watcher (chokidar)                        │  │
│  │  ├── Photo Processor (sharp)                               │  │
│  │  ├── Face Recognition (face-api)                          │  │
│  │  └── WebSocket Real-time Service                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ http://localhost:8091
┌───────────────────────────────▼─────────────────────────────────┐
│                    RENDERER PROCESS (React)                       │
│                      (src/App.tsx)                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React 19 SPA                                              │  │
│  │  ├── Vite Build System                                     │  │
│  │  ├── Tailwind CSS Styling                                  │  │
│  │  ├── React Query (TanStack)                                │  │
│  │  ├── Dexie (IndexedDB wrapper)                            │  │
│  │  └── Face-api.js (client-side face search)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Process Communication

```
┌─────────────┐     IPC      ┌─────────────┐    HTTP/WS    ┌─────────────┐
│  Renderer   │◄────────────►│    Main     │◄──────────────►│   Backend   │
│  (React)    │             │  (Electron) │               │  (Express)  │
└─────────────┘             └─────────────┘               └─────────────┘
      │                           │                             │
      │ - Window controls        │ - Process spawning         │ - API
      │ - App lifecycle          │ - File system              │ - Database
      │ - Network isolation      │ - Auto-updater            │ - Photo processing
```

---

## 3. Frontend Architecture

### 3.1 Component Structure

```
src/
├── App.tsx                          # Main app shell, view routing
├── main.tsx                         # Entry point
├── constants.ts                     # App-wide constants
├── types.ts                         # TypeScript type definitions
├── permissions.ts                   # Permission checks
│
├── components/
│   ├── common/                      # Shared UI components
│   │   ├── Button.tsx              # Reusable button
│   │   ├── Card.tsx                # Card container
│   │   ├── Input.tsx               # Form input
│   │   ├── Modal.tsx               # Modal dialog
│   │   ├── Spinner.tsx             # Loading spinner
│   │   ├── ErrorBoundary.tsx       # Error boundary
│   │   ├── GlobalErrorBoundary.tsx # Global error handler
│   │   ├── VirtualGrid.tsx         # Virtual scrolling grid
│   │   ├── OfflineScreen.tsx       # Offline indicator
│   │   └── SyncStatusIndicator.tsx # Sync status UI
│   │
│   ├── touch/                       # Touch-specific screens
│   │   ├── WelcomeScreen.tsx        # Entry point (31KB)
│   │   ├── PhotoSelectionScreen.tsx # Browse albums/photos (21KB)
│   │   ├── PhotoPreviewScreen.tsx   # Full-size view + cart (19KB)
│   │   ├── OrderConfigurationScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── ThankYouScreen.tsx
│   │   ├── FaceSearchModal.tsx      # AI face search
│   │   ├── RoomNumberModal.tsx      # Room filter
│   │   ├── KioskSettingsModal.tsx  # Settings management
│   │   ├── ConnectionStatusIndicator.tsx
│   │   ├── SelectionCartBar.tsx
│   │   └── settings/               # Settings sub-components
│   │
│   └── DeviceSetup.tsx              # Initial configuration
│
├── context/
│   ├── KioskContext.tsx             # Global kiosk state
│   ├── CurrencyContext.tsx           # Currency formatting
│   └── ThemeContext.tsx             # Dark/light theme
│
├── hooks/                           # Custom React hooks
│   ├── useAlbums.ts
│   ├── useOrders.ts
│   ├── usePermissions.ts
│   └── useDebounce.ts
│
├── services/                        # Business logic
│   ├── apiService.ts                # Main API client
│   ├── syncService.ts               # Master sync logic (31KB)
│   ├── webSocketService.ts          # WebSocket client
│   ├── offlineStorage.ts            # IndexedDB wrapper
│   ├── OfflineQueue.ts              # Offline mutation queue
│   ├── OfflineQueueV2.ts           # Enhanced offline queue (12KB)
│   ├── faceRecognitionService.ts    # Face API integration
│   ├── orderService.ts              # Order management
│   ├── storageMonitor.ts            # Storage monitoring
│   ├── syncCheckpointService.ts     # Sync checkpointing
│   ├── performanceMonitor.ts        # Performance tracking
│   ├── rfidService.ts               # RFID integration
│   ├── api/                         # API clients
│   │   ├── core.ts
│   │   ├── authService.ts
│   │   ├── orderService.ts
│   │   ├── photoService.ts
│   │   └── systemService.ts
│   └── pb.ts                       # PocketBase client
│
├── utils/
│   ├── logger.ts                   # Structured logging
│   └── validation.ts                # Input validation
│
└── config/
    └── kioskConfig.ts               # Kiosk configuration
```

### 3.2 State Management Architecture

#### Global State (KioskContext)

The [`KioskContext.tsx`](apps/touch/src/context/KioskContext.tsx) provides global kiosk state:

```typescript
interface KioskContextType {
  kioskId: string | null; // Unique device ID
  isIdle: boolean; // Screensaver trigger
  idleTimeoutMs: number; // Configurable timeout
  kioskConnectionStatus: "Connected" | "Disconnected" | "Offline";
  globalFeatures: { ai: boolean; face: boolean; watermark: boolean };
  kioskAlbums: Album[]; // Available albums
  products: Product[]; // Available products
  packs: Pack[]; // Package deals
  refreshProductData: () => Promise<void>;
  resetIdleTimer: () => void; // User activity
  isConfigRequired: boolean; // Setup needed
  showToast: (msg: string) => void;
}
```

Key responsibilities:

- **Kiosk ID Management**: Auto-generation and persistence
- **Connection Status**: Derived from local health + master connectivity
- **Album Management**: Hydration of blob URLs for offline photos
- **Idle Timer**: Automatic reset to welcome screen after inactivity

#### Local State (Component Level)

| State              | Storage      | Purpose                                |
| ------------------ | ------------ | -------------------------------------- |
| Cart               | localStorage | Persisted cart items                   |
| Active View        | React state  | Current screen (welcome/photos/detail) |
| Room Filter        | React state  | Filter albums by room number           |
| Active Photo/Album | React state  | Current selection                      |

### 3.3 View Routing

The Touch app uses a simple state-based routing in [`App.tsx`](apps/touch/src/App.tsx):

```typescript
type TouchView = "welcome" | "photos" | "photo-detail" | "order-config";
```

Lazy-loaded screens:

```typescript
const WelcomeScreen = React.lazy(
  () => import("./components/touch/WelcomeScreen"),
);
const PhotoSelectionScreen = React.lazy(
  () => import("./components/touch/PhotoSelectionScreen"),
);
const PhotoPreviewScreen = React.lazy(
  () => import("./components/touch/PhotoPreviewScreen"),
);
const OrderConfigurationScreen = React.lazy(
  () => import("./components/touch/OrderConfigurationScreen"),
);
```

---

## 4. Backend Architecture

### 4.1 Server Structure

```
backend/
├── server.ts                 # Main Express server (15KB)
├── types.d.ts               # TypeScript declarations
│
├── routes/                  # API Route handlers
│   ├── auth.ts             # Authentication (15KB)
│   ├── collections.ts       # CRUD operations (34KB)
│   ├── faces.ts            # Face recognition API (9KB)
│   ├── files.ts            # File upload/download
│   ├── orders.ts           # Order management
│   ├── orderExport.ts     # Order export/print
│   ├── sync.ts             # Master synchronization
│   ├── system.ts           # System/health endpoints
│   └── realtime.ts         # WebSocket routes
│
├── services/               # Business logic services
│   ├── albumService.ts     # Album management
│   ├── realtimeService.ts  # WebSocket broadcasting
│   ├── watcherService.ts  # File system monitoring
│   ├── faceService.ts     # Face recognition processing
│   └── VectorIndexService.ts # Face descriptor indexing
│
├── shared/                 # Shared utilities
│   ├── db.ts              # DatabaseManager
│   ├── auth.ts            # Password hashing/verification
│   ├── csrf.ts            # CSRF token generation
│   ├── errorHandler.ts    # Standardized error responses
│   ├── logger.ts          # Structured logging
│   ├── auditLogger.ts     # Security event logging
│   ├── rateLimiter.ts     # Request throttling
│   ├── validation.ts      # Input validation
│   ├── photoProcessor.ts  # Image processing pipeline
│   └── WorkerPool.ts      # Worker thread pool
│
├── migrations/            # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_enhanced_photos_schema.sql
│   ├── ...
│   └── 011_add_face_recognition.sql
│
└── workers/               # Worker threads
    ├── faceWorker.ts
    └── photoWorker.ts
```

### 4.2 Server Configuration

The backend server runs on port **8091** with the following configuration:

```typescript
const PORT = parseInt(process.env.PORT || "8091", 10);

const DATA_DIR = path.join(process.cwd(), "pb_data");
const DB_FILE = path.join(DATA_DIR, "touch.db");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const IMPORT_DIR = path.join(DATA_DIR, "uploads");
const BACKUP_DIR = path.join(DATA_DIR, "backup");
const LOGS_DIR = path.join(DATA_DIR, "logs");
const AUDIT_LOGS_DIR = path.join(DATA_DIR, "audit_logs");
const ORDERS_DIR = path.join(DATA_DIR, "orders");
```

### 4.3 Route Structure

| Route                | File           | Purpose                      |
| -------------------- | -------------- | ---------------------------- |
| `/api/auth/*`        | auth.ts        | Login, JWT token management  |
| `/api/collections/*` | collections.ts | CRUD for all database tables |
| `/api/faces/*`       | faces.ts       | Face recognition endpoints   |
| `/api/files/*`       | files.ts       | File upload/download         |
| `/api/orders/*`      | orders.ts      | Order management             |
| `/api/orderExport/*` | orderExport.ts | Order export/print           |
| `/api/sync/*`        | sync.ts        | Master synchronization       |
| `/api/system/*`      | system.ts      | Health, settings, config     |
| `/api/realtime/*`    | realtime.ts    | WebSocket management         |

---

## 5. Electron Main Process

### 5.1 Main Process Responsibilities

The Electron main process (`main.js`) handles:

1. **Window Management**
   - Fullscreen kiosk mode
   - Window creation and lifecycle
   - Single instance lock

2. **Backend Process Management**
   - Spawns backend server as child process
   - Manages process lifecycle

3. **Network Isolation** (Phase 34: Hardened LAN-Only Mode)
   - Restricts requests to local network only
   - Blocks external internet access
   - Port restrictions (8090, 8091, 5173, 80, 443)

4. **Input Blocking**
   - Prevents Ctrl+Shift+Alt+F12 (admin override still works)
   - Disables context menu
   - Blocks reload shortcuts

### 5.2 Network Security Configuration

```javascript
const ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  /^192\.168\.\d+\.\d+$/, // Class C private
  /^10\.\d+\.\d+\.\d+$/, // Class A private
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // Class B private
];

const ALLOWED_PORTS = [
  8090, // Master backend
  8091, // Touch backend
  5173, // Vite dev server
  80, // HTTP
  443, // HTTPS
];
```

---

## 6. Database Architecture

### 6.1 Schema Overview

| Table            | Purpose                | Key Fields                                               |
| ---------------- | ---------------------- | -------------------------------------------------------- |
| **users**        | Photographers & Admins | id, email, password, role, destinationId, faceDescriptor |
| **albums**       | Photo collections      | id, title, date, photographerId, roomNumber, kiosk_ready |
| **photos**       | Individual photos      | id, albumId, url, photographerId, category               |
| **orders**       | Customer orders        | id, clientName, status, total, items (JSON), source      |
| **products**     | Available products     | id, name, category, price, stock                         |
| **kiosks**       | Kiosk devices          | id, name, status, settings (JSON)                        |
| **settings**     | Key-value config       | key, value (JSON)                                        |
| **destinations** | Locations              | id, name, country, type                                  |

### 6.2 Migration History

| Migration                              | Purpose                  |
| -------------------------------------- | ------------------------ |
| 001_initial_schema.sql                 | Core tables              |
| 002_enhanced_photos_schema.sql         | Photo metadata           |
| 003_add_destinations.sql               | Multi-location support   |
| 004_add_session_types.sql              | Booking session types    |
| 005_add_packs_and_bookings.sql         | Product packs & bookings |
| 006_add_order_source.sql               | Order source tracking    |
| 007_add_touch_integration_settings.sql | Kiosk settings           |
| 008_add_password_change_flag.sql       | Security enhancement     |
| 009_add_kiosk_ready.sql                | Album visibility control |
| 010_add_kiosk_sessions.sql             | Heartbeat tracking       |
| 011_add_face_recognition.sql           | Face descriptors         |

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

| Feature                  | Implementation                      | Purpose                   |
| ------------------------ | ----------------------------------- | ------------------------- |
| **Checkpoint/Resume**    | `syncCheckpointService`             | Handle interruptions      |
| **Batch Processing**     | `BATCH_SIZE = 5` albums             | Memory efficiency         |
| **Concurrent Downloads** | `MAX_CONCURRENT_DOWNLOADS = 3`      | Speed optimization        |
| **Retry Queue**          | `failedPhotoQueue` + localStorage   | Handle transient failures |
| **Exponential Backoff**  | `RETRY_BACKOFF_BASE * 2^retryCount` | Smart retry               |
| **Duplicate Detection**  | `processedPhotoIds` Set             | Prevent re-processing     |
| **Real-time Skip**       | `realtimeReceivedAlbums`            | Avoid double sync         |

### 7.3 Sync Progress Tracking

```typescript
interface SyncProgress {
  albumsProcessed: number;
  photosProcessed: number;
  photosTotal: number;
  bytesTransferred: number;
  startTime: number;
  currentAlbum?: string;
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

The Offline Queue V2 (`OfflineQueueV2.ts`) provides:

- **IndexedDB Storage**: No localStorage 5MB limit
- **Queue Size Limits**: Automatic cleanup
- **Priority-based Processing**: Higher priority items processed first
- **Event-driven Architecture**: Real-time queue updates
- **Automatic Processing**: Queue processes when connection restored

```typescript
interface QueueItem {
  id: string;
  type: "MUTATION";
  entity: string;
  action: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  status: QueueItemStatus;
  error?: string;
  priority?: number;
}
```

---

## 9. Face Recognition Integration

### 9.1 Architecture

Face recognition is implemented at two levels:

1. **Backend (Server-side)**
   - Uses `@vladmandic/face-api` for face detection
   - Stores face descriptors in SQLite
   - Provides REST API endpoints for face operations

2. **Frontend (Client-side)**
   - Uses `face-api.js` for client-side face search
   - Allows customers to find their photos by face

### 9.2 Face Detection Flow

```
Photo Upload
    │
    ▼
┌─────────────────┐
│  Backend Face   │
│  Detection      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extract Face  │
│  Descriptors   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store in DB   │
│  (photo_faces) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Index in       │
│  Vector Store  │
└─────────────────┘
```

---

## 10. Security Architecture

### 10.1 Security Features

| Feature               | Status         | Implementation                  |
| --------------------- | -------------- | ------------------------------- |
| **CSRF Protection**   | ✅ Implemented | Token-based with 24h expiration |
| **Authentication**    | ✅ Implemented | JWT + bcrypt password hashing   |
| **Rate Limiting**     | ✅ Implemented | Request throttling              |
| **Network Isolation** | ✅ Implemented | LAN-only mode                   |
| **Audit Logging**     | ✅ Implemented | Security event logging          |

### 10.2 Security Best Practices

- Passwords hashed with bcrypt
- JWT tokens with expiration
- CSRF tokens validated on mutations
- Rate limiting per IP
- Network isolation in Electron

---

## 11. Data Flow Architecture

### 11.1 Order Flow

```
[Customer selects photos]
         │
         ▼
[Add to Cart (localStorage)]
         │
         ▼
[Checkout - Create Order]
         │
    ┌────┴────┐
    │         │
Online   Offline
    │         │
    ▼         ▼
[Push to   [Queue in
Master]    OfflineQueue]
    │         │
    │    [When online:
    │     process queue]
    │         │
    └────┬────┘
         │
         ▼
   [Order Exported]
```

### 11.2 Photo Sync Flow

```
[Master creates album]
         │
         ▼
[WebSocket broadcasts album]
         │
    ┌────┴────┐
    │         │
Receives   Sync runs
WS event   periodically
    │         │
    │         ▼
    │   [Pull album list]
    │         │
    │         ▼
    │   [Download photos]
    │         │
    └────┬────┘
         │
         ▼
   [Photos stored locally]
```

---

## 12. Key Patterns & Best Practices

### 12.1 Service Pattern

Services are implemented as singleton classes:

```typescript
class SyncService {
  private static instance: SyncService;

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }
}

export const syncService = SyncService.getInstance();
```

### 12.2 Context Pattern

React contexts provide global state:

```typescript
const KioskContext = createContext<KioskContextType | undefined>(undefined);

export const useKiosk = () => {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error("useKiosk must be used within a KioskProvider");
  }
  return context;
};
```

### 12.3 Lazy Loading

Screens are lazy-loaded for performance:

```typescript
const WelcomeScreen = React.lazy(
  () => import("./components/touch/WelcomeScreen"),
);
```

---

## 13. Identified Issues & Recommendations

### 13.1 TypeScript Issues (Priority: High)

| Issue                     | Count | Location                       |
| ------------------------- | ----- | ------------------------------ |
| `any` types in backend    | 127   | Various files                  |
| Auth middleware types     | -     | `backend/server.ts:275`        |
| Validation function types | -     | `backend/shared/validation.ts` |

**Recommendation**: Add proper TypeScript types for all Express route handlers and middleware.

### 13.2 Code Quality Issues (Priority: Medium)

| Issue              | Count | Location            |
| ------------------ | ----- | ------------------- |
| Console statements | 19    | `backend/server.ts` |
| Empty catch blocks | 3     | Various files       |
| No ESLint config   | -     | `package.json`      |

**Recommendation**: Replace console statements with structured logger, add ESLint configuration.

### 13.3 Testing (Priority: Medium)

| Issue                 | Status          |
| --------------------- | --------------- |
| Jest configured       | ✅              |
| Playwright configured | ✅              |
| Test coverage         | Unknown         |
| CI coverage gates     | Not implemented |

**Recommendation**: Add test coverage reporting and CI gates.

---

## Summary

The ClickFlash Touch App is a well-architected kiosk application with:

- **Robust offline-first architecture** enabling 24/7 operation
- **Three-process Electron design** for security and stability
- **Real-time synchronization** with the Master Station
- **Face recognition** for photo discovery
- **Comprehensive security** with network isolation

The app is production-ready with opportunities for improvement in TypeScript type safety and code quality tooling.

---

_Document generated: 2026-03-06_
_Analysis based on source code examination_
