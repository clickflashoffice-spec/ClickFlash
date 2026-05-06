# ClickFlash Technology Stack

## Core Technologies

### Frontend

| Technology   | Version | Purpose                  |
|--------------|---------|--------------------------|
| React        | 19.2.0  | UI framework             |
| React DOM    | 19.2.0  | DOM rendering            |
| React Router | 7.9.6   | Client-side routing      |
| TypeScript   | 5.9.3   | Type safety              |
| Vite         | 7.2.4   | Build tool & dev server  |
| Tailwind CSS | 3.4.18  | Utility-first CSS        |

### Backend

| Technology     | Version | Purpose                  |
|----------------|---------|--------------------------|
| Node.js        | 20+     | Runtime                  |
| Express        | 5.2.1   | Web framework            |
| better-sqlite3 | 12.5.0  | SQLite database          |
| JWT            | 9.0.2   | Authentication tokens    |
| bcryptjs       | 2.4.3   | Password hashing         |
| WebSocket      | Native  | Real-time communication  |

### Desktop

| Technology       | Version | Purpose          |
|------------------|---------|------------------|
| Electron         | 39.2.7  | Desktop wrapper  |
| electron-builder | 26.0.12 | Build & package  |

---

### Master Portal Dependencies

#### Master Production

```json
{
  "@tanstack/react-query": "^5.90.10",
  "bcryptjs": "^2.4.3",
  "better-sqlite3": "^12.5.0",
  "body-parser": "^2.2.1",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "helmet": "^8.0.0",
  "jsonwebtoken": "^9.0.2",
  "pocketbase": "^0.25.2",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.9.6",
  "recharts": "^2.15.0",
  "sharp": "^0.34.5",
  "uuid": "^13.0.0",
  "zod": "^4.1.13"
}
```

#### Master Development

```json
{
  "@playwright/test": "^1.57.0",
  "@vitejs/plugin-react": "^5.1.1",
  "concurrently": "^9.2.1",
  "esbuild": "^0.27.0",
  "jest": "^29.7.0",
  "tsx": "^4.21.0",
  "typescript": "^5.9.3",
  "vite": "^7.2.4"
}
```

### Touch Kiosk Dependencies

#### Touch Production

```json
{
  "@tanstack/react-query": "^5.90.10",
  "@tensorflow-models/blazeface": "^0.1.0",
  "@tensorflow/tfjs": "^4.22.0",
  "@tensorflow/tfjs-node": "^4.17.0",
  "@vladmandic/face-api": "^1.7.15",
  "bcryptjs": "^2.4.3",
  "better-sqlite3": "^12.5.0",
  "bonjour-service": "^1.3.0",
  "chokidar": "^5.0.0",
  "cors": "^2.8.5",
  "dexie": "^4.2.1",
  "dotenv": "^17.2.3",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.2",
  "qrcode": "^1.5.4",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-window": "^1.8.11",
  "sharp": "^0.34.5",
  "uuid": "^13.0.0"
}
```

#### Touch Development

```json
{
  "@playwright/test": "^1.57.0",
  "electron": "^39.2.7",
  "electron-builder": "^26.0.12",
  "jest": "^29.7.0",
  "typescript": "^5.9.3",
  "vite": "^7.2.4"
}
```

---

## Key Libraries

### UI & Styling

| Library               | Purpose           | Apps                |
|-----------------------|-------------------|---------------------|
| Tailwind CSS          | Utility-first CSS | All                 |
| Lucide React          | Icon library      | All                 |
| Recharts              | Charts & graphs   | Master, Management  |
| React Window          | Virtual scrolling | Touch               |
| clsx + tailwind-merge | Class merging     | All                 |

### State Management

| Library       | Purpose      | Apps |
|---------------|--------------|------|
| React Query   | Server state | All  |
| React Context | Local state  | All  |
| Zustand       | (optional)   | -    |

### Data & Storage

| Library        | Purpose           | Apps          |
|----------------|-------------------|---------------|
| better-sqlite3 | Local database    | Master, Touch |
| Dexie          | IndexedDB wrapper | Touch         |
| PocketBase SDK | Backend client    | (legacy)      |

### Authentication

| Library     | Purpose          | Apps |
|-------------|------------------|------|
| JWT         | Token auth       | All  |
| bcryptjs    | Password hashing | All  |
| Passport.js | (optional)       | -    |

### AI & Image Processing

| Library        | Purpose          | Apps          |
|----------------|------------------|---------------|
| TensorFlow.js  | ML runtime       | Touch         |
| face-api.js    | Face recognition | Touch         |
| Blazeface      | Face detection   | Touch         |
| Sharp          | Image processing | Master, Touch |

### Communication

| Library        | Purpose          | Apps          |
|----------------|------------------|---------------|
| WebSocket      | Real-time sync   | Master, Touch |
| Socket.io      | (alternative)    | -             |
| mDNS (Bonjour) | Auto-discovery   | Touch         |

### Testing

| Library                | Purpose           | Apps |
|------------------------|-------------------|------|
| Playwright             | E2E testing       | All  |
| Jest                   | Unit testing      | All  |
| React Testing Library  | Component testing | All  |

---

## Build Configuration

### Vite Config (Master)

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/master',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@tanstack/react-query'],
          'chart-vendor': ['chart.js', 'recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### Vite Config (Touch)

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

---

## Port Configuration

| App                 | Port | Purpose                     |
|---------------------|------|-----------------------------|
| Master Portal (API) | 8090 | Core Backend / Sync Server  |
| Touch Kiosk (Local) | 8091 | Local Backend / watchdog    |
| Management Hub      | 5173 | Admin Dashboard (Vite Dev)  |
| Customer Gallery    | 5174 | Customer Portal (Vite Dev)  |
| Money Trash         | 3000 | Ingestion Web App (Next.js) |
| Main Website        | 3001 | Marketing Site (Next.js)    |

---

## Database Schema

### Master Database Tables

```sql
users           -- Photographers & admins
albums          -- Photo collections
photos          -- Individual photos with metadata
orders          -- Customer orders
products        -- Saleable items
kiosks          -- Touch device registry
destinations    -- Studio locations
settings        -- Key-value store
```

### Touch Database Tables

```sql
albums          -- Cached from Master
photos          -- Downloaded photos
orders          -- Pending orders
settings        -- Kiosk configuration
```

---

## API Endpoints

### Master API

```bash
GET    /api/health              -- Health check
POST   /api/auth/login          -- Login
GET    /api/albums              -- List albums
POST   /api/albums              -- Create album
GET    /api/albums/:id          -- Get album
PATCH  /api/albums/:id          -- Update album
DELETE /api/albums/:id          -- Delete album
GET    /api/photos              -- List photos
POST   /api/photos              -- Upload photo
GET    /api/orders              -- List orders
POST   /api/orders              -- Create order
GET    /api/kiosks              -- List kiosks
POST   /api/kiosk/heartbeat     -- Kiosk ping
WS     /ws                      -- WebSocket
```

### Touch API

```bash
GET    /api/health              -- Health check
GET    /api/discovery/master    -- Find Master
POST   /api/sync/pull-photo     -- Download photo
GET    /api/collections/:name   -- PB-compatible
POST   /api/realtime            -- SSE endpoint
```

---

## Environment Variables

### Master (.env)

```env
NODE_ENV=production
PORT=8090
JWT_SECRET=your_secret_here
DATA_DIR=./pb_data
CORS_ORIGINS=http://localhost:5173,http://localhost:8090
```

### Touch (.env)

```env
NODE_ENV=production
PORT=8091
VITE_API_URL=http://localhost:8091
VITE_MASTER_API_URL=http://localhost:8090
VITE_WS_URL=ws://localhost:8091
```

---

### Security Checklist

#### Implemented Security

- ✅ Helmet.js for headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ JWT authentication
- ✅ Input validation (Zod)
- ✅ SQL injection protection (parameterized queries)
- ✅ Path traversal protection

#### Security To Review

- ❓ HTTPS enforcement (production)
- ❓ Content Security Policy
- ❓ Audit logging
- ❓ Data encryption at rest

---

### Performance Optimizations

#### Implemented Optimizations

- ✅ Code splitting (Master)
- ✅ Lazy loading (SettingsPage)
- ✅ Virtual scrolling (Touch photo grid)
- ✅ Image optimization (Sharp)
- ✅ Debounced saves
- ✅ WAL mode for SQLite

#### Planned Optimizations

- ❌ Service Workers (PWA)
- ❌ Image CDN
- ❌ Database indexing

---

## Development Tools

### Required

- Node.js 20+
- npm 10+ or pnpm 8+
- Git

### Recommended

- VS Code
  - ESLint extension
  - Prettier extension
  - TypeScript extension
- Chrome DevTools
- React DevTools

### Scripts

```bash
# Master
npm run dev:full      # Start backend + frontend
npm run build         # Production build
npm run test          # Run tests

# Touch
npm run dev:full      # Start backend + frontend
npm run package       # Build Electron app
npm run test          # Run E2E tests
```

---

## Deployment Targets

### Master Targets

- Windows Desktop (Electron)
- macOS Desktop (Electron)
- Linux Desktop (Electron)

### Touch Targets

- Windows Kiosk (Electron)
- Dedicated Kiosk Hardware

### Web Targets

- Vercel / Netlify / AWS
- Docker containers
- Cloud VPS

---

## Monitoring & Logging

### Logging

- Winston / custom logger
- Structured logging (JSON)
- Log rotation

### Monitoring

- Health check endpoints
- Performance metrics
- Error tracking (Sentry - optional)

---

### Build Information

*Last Updated: 2026-02-07*
*Status: ✅ Verified*
