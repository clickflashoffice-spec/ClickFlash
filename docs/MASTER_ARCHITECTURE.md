# Master App Deep Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MASTER PORTAL ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                     ELECTRON MAIN PROCESS                            │     │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐  │     │
│  │  │ Window Manager │  │ IPC Handler   │  │ Native Integrations   │  │     │
│  │  │ - BrowserWin  │  │ - preload.js  │  │ - File System        │  │     │
│  │  │ - Tray        │  │ - contextBridge│  │ - Printer API        │  │     │
│  │  └───────────────┘  └───────────────┘  └───────────────────────┘  │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                      │                                          │
│                         ┌──────────────┴──────────────┐                       │
│                         │        IPC BRIDGE          │                       │
│                         │    contextBridge.expose    │                       │
│                         └──────────────┬──────────────┘                       │
│                                      │                                          │
│  ┌────────────────────────────────────┴─────────────────────────────┐        │
│  │                      RENDERER PROCESS (React 19)                 │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │        │
│  │  │   UI Layer  │  │ State Mgmt  │  │  Services   │             │        │
│  │  │  Components │  │ React Query │  │ - PB Client │             │        │
│  │  │  Pages     │  │ Zustand     │  │ - Sync      │             │        │
│  │  │  Hooks     │  │             │  │ - Network   │             │        │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │        │
│  │                                                                 │        │
│  │  ┌─────────────────────────────────────────────────────────┐   │        │
│  │  │              BACKEND PROCESS (Express)                    │   │        │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │        │
│  │  │  │ REST API  │  │ WebSocket │  │ File API  │           │   │        │
│  │  │  │ 21 Routes │  │ Real-time │  │ Uploads   │           │   │        │
│  │  │  └───────────┘  └───────────┘  └───────────┘           │   │        │
│  │  │                                                         │   │        │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │        │
│  │  │  │ SQLite DB │  │ Queue     │  │ Worker    │           │   │        │
│  │  │  │ Photo     │  │ Processor │  │ Threads   │           │   │        │
│  │  │  └───────────┘  └───────────┘  └───────────┘           │   │        │
│  │  └─────────────────────────────────────────────────────────┘   │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Main Process (Electron)

#### Window Manager

```typescript
// electron-main.js - Window management
class WindowManager {
    private mainWindow: BrowserWindow | null;
    private tray: Tray | null;
    
    createMainWindow(): BrowserWindow {
        return new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1024,
            minHeight: 768,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: PRELOAD_PATH
            },
            show: false  // Show when ready
        });
    }
    
    createTray(): void {
        this.tray = new Tray(ICON_PATH);
        this.tray.setContextMenu(/* tray menu */);
    }
}
```

#### IPC Communication

```typescript
// preload.js - Secure context bridge
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    selectFiles: (filters) => ipcRenderer.invoke('dialog:openFiles', filters),
    
    // Photo operations
    processPhoto: (path, options) => ipcRenderer.invoke('photo:process', path, options),
    getPhotoMetadata: (path) => ipcRenderer.invoke('photo:metadata', path),
    
    // System
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    
    // Events
    onMenuAction: (callback) => ipcRenderer.on('menu:action', callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
```

### Renderer Process (React)

#### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Server State (React Query)                                  │
│  ├── useQuery / useMutation                                 │
│  ├── Automatic background refetching                        │
│  ├── Cache invalidation on mutations                        │
│  └── Optimistic updates                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Client State (Zustand)                 │     │
│  │  ├── authStore - User authentication              │     │
│  │  ├── uiStore - UI preferences                     │     │
│  │  ├── editorStore - Editor state                   │     │
│  │  └── syncStore - Sync status                      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Context Providers                                          │
│  ├── AuthContext - Auth state + login/logout                │
│  ├── SyncContext - Real-time sync status                   │
│  ├── ThemeContext - Dark/light mode                        │
│  └── ToastContext - Notifications                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Service Layer

```typescript
// services/apiService.ts - Main API client
class ApiService {
    // Albums
    async getAlbums(): Promise<Album[]>
    async getAlbum(id: string): Promise<Album>
    async createAlbum(data: CreateAlbumDTO): Promise<Album>
    async updateAlbum(id: string, data: UpdateAlbumDTO): Promise<Album>
    async deleteAlbum(id: string): Promise<void>
    
    // Photos
    async getPhotos(albumId: string, page?: number): Promise<PaginatedResponse<Photo>>
    async uploadPhoto(albumId: string, file: File): Promise<Photo>
    async deletePhoto(id: string): Promise<void>
    async updatePhoto(id: string, data: UpdatePhotoDTO): Promise<Photo>
    
    // Orders
    async getOrders(filters?: OrderFilters): Promise<PaginatedResponse<Order>>
    async createOrder(data: CreateOrderDTO): Promise<Order>
    async updateOrderStatus(id: string, status: OrderStatus): Promise<Order>
    
    // Sync
    async getSyncStatus(): Promise<SyncStatus>
    async forceSync(): Promise<void>
}
```

### Backend Process (Express)

#### API Routes (21 Routes)

```
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTES                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /api/auth          - Authentication (login, logout, session) │
│  /api/albums        - Album CRUD + photo management           │
│  /api/photos       - Photo operations                       │
│  /api/orders       - Order fulfillment                      │
│  /api/collections   - Generic CRUD for all tables           │
│  /api/cloud         - Cloud sync status                      │
│  /api/faces         - Face recognition                       │
│  /api/culling       - AI photo culling                      │
│  /api/pairing       - Kiosk pairing (HMAC)                  │
│  /api/sync          - Offline mutation sync                  │
│  /api/files         - File upload/download                  │
│  /api/hardware      - System hardware info                   │
│  /api/system        - Health, printers, diagnostics          │
│  /api/realtime      - SSE real-time events                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Database Schema (SQLite)

```sql
-- Core tables
CREATE TABLE albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    photographer_id TEXT REFERENCES photographers(id),
    date TEXT NOT NULL,
    location TEXT,
    cover_photo_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    album_id TEXT REFERENCES albums(id),
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    thumbnail_path TEXT,
    preview_path TEXT,
    width INTEGER,
    height INTEGER,
    size INTEGER,
    format TEXT,
    manual_edits TEXT,  -- JSON
    ai_score REAL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    album_id TEXT REFERENCES albums(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    items TEXT NOT NULL,  -- JSON array
    subtotal REAL,
    tax REAL,
    total REAL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kiosk_pairings (
    id TEXT PRIMARY KEY,
    kiosk_id TEXT UNIQUE NOT NULL,
    secret_key TEXT NOT NULL,
    last_seen TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_photos_album ON photos(album_id);
CREATE INDEX idx_orders_album ON orders(album_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_albums_photographer ON albums(photographer_id);
```

#### Worker Queue

```typescript
// workers/queueProcessor.ts
class QueueProcessor {
    private queue: Map<string, QueuedOperation> = new Map();
    private processing = false;
    
    async addOperation(op: QueuedOperation): Promise<void> {
        this.queue.set(op.id, op);
        if (!this.processing) {
            this.process();
        }
    }
    
    private async process(): Promise<void> {
        this.processing = true;
        
        while (this.queue.size > 0) {
            const ops = Array.from(this.queue.values());
            
            // Process in parallel with concurrency limit
            const batch = ops.slice(0, 5);
            await Promise.all(batch.map(op => this.execute(op)));
            batch.forEach(op => this.queue.delete(op.id));
        }
        
        this.processing = false;
    }
}
```

## Photo Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                  PHOTO PROCESSING PIPELINE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. INCOMING                                                 │
│     └── File dropped or selected                             │
│         └── Validate format & size                          │
│             └── Check disk space                            │
│                                                              │
│  2. THUMBNAIL GENERATION                                     │
│     └── Sharp resize to 200x200                             │
│         └── Extract dominant color                          │
│             └── Generate blur hash                          │
│                                                              │
│  3. PREVIEW GENERATION                                       │
│     └── Resize to max 1920px                                │
│         └── Apply EXIF orientation                          │
│             └── Strip GPS if configured                      │
│                                                              │
│  4. AI ANALYSIS (optional)                                  │
│     └── Face detection                                       │
│         └── Quality scoring                                  │
│             └── Duplicate detection                          │
│                                                              │
│  5. STORAGE                                                 │
│     └── Save to local SQLite                                │
│         └── Queue for cloud sync                            │
│             └── Update album counts                          │
│                                                              │
│  6. NOTIFICATION                                            │
│     └── UI update via SSE                                   │
│         └── Toast notification                              │
│             └── Touch kiosk sync (if paired)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Real-time Sync

### WebSocket (SSE) Architecture

```typescript
// Backend SSE endpoint
app.get('/api/realtime', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Subscribe to events
    const unsubscribe = eventBus.subscribe((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    
    // Cleanup on disconnect
    req.on('close', unsubscribe);
});

// Event types
interface RealtimeEvent {
    type: 'photo:added' | 'photo:updated' | 'order:created' | 'sync:complete';
    payload: unknown;
    timestamp: string;
}
```

### Offline Sync Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE SYNC STRATEGY                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ONLINE MODE                                                 │
│  └── Changes push immediately to Master                      │
│      └── Optimistic UI updates                             │
│          └── Server confirmation                            │
│                                                              │
│  OFFLINE MODE                                               │
│  └── Changes queued locally                                 │
│      └── Queue persisted to IndexedDB                       │
│          └── Conflict detection on reconnect                 │
│                                                              │
│  RECONNECT                                                   │
│  └── Fetch server state since last sync                     │
│      └── Apply local changes (newer wins)                   │
│          └── Handle conflicts                                │
│              └── Resolve duplicates                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. LOGIN                                                   │
│     └── POST /api/auth/login                                 │
│         └── Validate credentials                            │
│             └── Create session (express-session)            │
│                 └── Set session cookie                      │
│                                                              │
│  2. REQUEST                                                  │
│     └── Cookie contains session ID                           │
│         └── Session store lookup                            │
│             └── Check expiration                            │
│                 └── Validate permissions                     │
│                                                              │
│  3. LOGOUT                                                   │
│     └── POST /api/auth/logout                               │
│         └── Destroy session                                  │
│             └── Clear cookie                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Kiosk HMAC Authentication

```typescript
// Pairing authentication (for Touch kiosks)
interface KioskAuth {
    kioskId: string;
    timestamp: number;
    signature: string;  // HMAC-SHA256(kioskId + timestamp, secret)
}

// Request signing
function signKioskRequest(req: Request, pairing: KioskPairing): void {
    const timestamp = Date.now();
    const data = `${req.kioskId}:${timestamp}`;
    const signature = hmacSha256(data, pairing.secretKey);
    
    req.headers['X-Kiosk-ID'] = req.kioskId;
    req.headers['X-Timestamp'] = timestamp.toString();
    req.headers['X-Signature'] = signature;
}

// Verification (5-minute window)
function verifyKioskRequest(req: Request, pairing: KioskPairing): boolean {
    const timestamp = parseInt(req.headers['X-Timestamp']);
    if (Date.now() - timestamp > 5 * 60 * 1000) {
        return false;  // Expired
    }
    
    const data = `${req.kioskId}:${timestamp}`;
    const expected = hmacSha256(data, pairing.secretKey);
    return req.headers['X-Signature'] === expected;
}
```

## Performance Optimizations

### Memory Management

```typescript
// Virtualized lists for large albums
const PhotoGrid = ({ photos }) => (
    <VirtualizedGrid
        items={photos}
        itemHeight={200}
        itemWidth={200}
        overscan={5}
        renderItem={(photo) => (
            <PhotoCard key={photo.id} photo={photo} />
        )}
    />
);

// Image lazy loading
const LazyImage = ({ src, placeholder }) => (
    <Suspense fallback={placeholder}>
        <img 
            src={src} 
            loading="lazy"
            decoding="async"
        />
    </Suspense>
);
```

### Database Optimization

```sql
-- Query optimization
EXPLAIN QUERY PLAN
SELECT p.*, a.name as album_name
FROM photos p
JOIN albums a ON p.album_id = a.id
WHERE a.photographer_id = ?
ORDER BY p.created_at DESC
LIMIT 50 OFFSET 0;

-- Using indexes properly
CREATE INDEX IF NOT EXISTS idx_photos_album_created 
ON photos(album_id, created_at DESC);
```

## Extension Points

### Custom Importers

```typescript
interface PhotoImporter {
    name: string;
    extensions: string[];
    parseMetadata(file: Buffer): Promise<PhotoMetadata>;
    processFile(file: Buffer, options: ImportOptions): Promise<ProcessedPhoto>;
}

// Register custom importer
PhotoImporterRegistry.register({
    name: 'Sony ARW',
    extensions: ['.arw', '.sr2'],
    parseMetadata: async (buffer) => {/* ... */},
    processFile: async (buffer, options) => {/* ... */}
});
```

### Plugin System

```typescript
interface MasterPlugin {
    name: string;
    version: string;
    install(ctx: PluginContext): void;
    uninstall(): void;
}

// Plugin API
interface PluginContext {
    hooks: {
        'photo:processed': (photo: Photo) => void;
        'album:created': (album: Album) => void;
        'order:completed': (order: Order) => void;
    };
    services: {
        api: ApiService;
        sync: SyncService;
        queue: QueueProcessor;
    };
}
```
