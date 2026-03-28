# Master App Architecture

## Overview

The Master App is a sophisticated Electron-based desktop application for professional photography workflow management. It combines a React frontend with an Express backend, providing offline-first capabilities with cloud synchronization.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MASTER APP ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ELECTRON SHELL (Desktop Container)                      │   │
│  │  ├── Main Process (Node.js)                              │   │
│  │  └── Renderer Process (Chromium)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────┼─────────────────────────────────┐ │
│  │                         ▼                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  FRONTEND (React 19 + Vite)                        │  │ │
│  │  │  ├── Components (12 modules)                       │  │ │
│  │  │  ├── State Management (TanStack Query + Context)   │  │ │
│  │  │  ├── Services (API, Sync, AI)                      │  │ │
│  │  │  └── Hooks (Custom React hooks)                    │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                         │                                 │ │
│  │  ┌──────────────────────┼─────────────────────────────┐  │ │
│  │  │                      ▼                             │  │ │
│  │  │  BACKEND (Express + SQLite)                      │  │ │
│  │  │  ├── REST API (20+ routes)                        │  │ │
│  │  │  ├── WebSocket Server (Real-time sync)            │  │ │
│  │  │  ├── Worker Threads (Photo processing)            │  │ │
│  │  │  └── Services (Business logic)                    │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  DATA LAYER                                        │  │ │
│  │  │  ├── SQLite (Primary database)                     │  │ │
│  │  │  ├── IndexedDB (Browser cache)                     │  │ │
│  │  │  └── File System (Photos, exports)                 │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  EXTERNAL SERVICES                                      │   │
│  │  ├── Cloud Sync (Cloudflare Workers)                    │   │
│  │  ├── AI/ML (TensorFlow.js, face-api)                    │   │
│  │  └── Kiosk Sync (WebSocket)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
apps/master/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── albums/              # Album management
│   │   ├── bookings/            # Booking system
│   │   ├── common/              # Shared components
│   │   ├── culling/             # AI photo culling
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── error-boundaries/    # Error handling
│   │   ├── marketing/           # Marketing tools
│   │   ├── modals/              # Modal dialogs
│   │   ├── orders/              # Order management
│   │   ├── photographers/       # Photographer management
│   │   ├── products/            # Product catalog
│   │   └── settings/            # App settings
│   ├── context/                 # React context providers
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # Frontend services
│   ├── types/                   # TypeScript types
│   ├── utils/                   # Utility functions
│   └── workers/                 # Web workers
├── backend/                      # Backend source
│   ├── config/                  # Configuration
│   ├── controllers/             # Route controllers
│   ├── middleware/              # Express middleware
│   ├── migrations/              # DB migrations (51 files)
│   ├── routes/                  # API routes
│   ├── schemas/                 # Data schemas
│   ├── services/                # Business logic
│   ├── shared/                  # Shared utilities
│   ├── tests/                   # Backend tests
│   ├── types/                   # Backend types
│   └── workers/                 # Background workers
├── docs/                        # Documentation
└── scripts/                     # Build scripts
```

## Technology Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Emotion
- **State Management**: TanStack Query + React Context
- **Animation**: Framer Motion
- **UI Components**: Material-UI (MUI)
- **Virtualization**: React Virtuoso, React Window

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express 5
- **Database**: SQLite (better-sqlite3)
- **Session**: express-session
- **Security**: Helmet, CSRF tokens
- **Real-time**: WebSocket (ws)

### Infrastructure
- **Desktop**: Electron 39
- **AI/ML**: TensorFlow.js, face-api.js
- **Image Processing**: Sharp
- **Testing**: Jest, React Testing Library, Playwright

## Key Features

### 1. Album Management
- Import photos from multiple sources
- AI-powered photo culling
- Advanced photo editing (editor2)
- Album publishing to kiosks

### 2. Order Management
- Shopping cart with products and packs
- Stripe payment integration
- Print fulfillment workflow
- Order tracking

### 3. Photographer Management
- Working time tracking
- Objective management
- Commission calculations
- Performance analytics

### 4. AI Features
- Face detection and recognition
- Auto-enhancement
- Smart cropping
- AI-powered culling

### 5. Sync & Cloud
- Real-time kiosk synchronization
- Cloud backup (Cloudflare)
- Offline-first architecture
- Conflict resolution

## Data Flow

```
User Action
    │
    ▼
React Component
    │
    ▼
Custom Hook / Service
    │
    ▼
API Call (fetch/axios)
    │
    ▼
Express Route
    │
    ▼
Controller
    │
    ▼
Service (Business Logic)
    │
    ▼
Database (SQLite)
```

## State Management

### Global State (Context)
- `AuthContext`: Authentication state
- `SyncContext`: Sync status
- `ToastContext`: Notifications

### Server State (TanStack Query)
- Albums, Photos, Orders
- Photographers, Products
- Settings, Analytics

### Local State
- Component-specific UI state
- Form data
- Modal visibility

## Error Handling

```
Component Error
    │
    ▼
FeatureErrorBoundary
    │
    ▼
GlobalErrorBoundary
    │
    ▼
Error Reporting (Sentry)
```

## Performance Optimizations

1. **Virtualization**: Large lists use React Virtuoso
2. **Code Splitting**: Route-based lazy loading
3. **Image Optimization**: Lazy loading, blur placeholders
4. **Worker Threads**: Heavy processing off main thread
5. **Memoization**: React.memo, useMemo, useCallback

## Security

1. **Authentication**: Session-based with CSRF tokens
2. **Authorization**: Role-based access control
3. **Input Validation**: Zod schemas
4. **Rate Limiting**: Express-rate-limit
5. **CORS**: Configured origins only

## Testing Strategy

```
Unit Tests (Jest)
    ├── Components (React Testing Library)
    ├── Hooks
    ├── Utils
    └── Services

Integration Tests
    ├── API Routes (Supertest)
    └── Database

E2E Tests (Playwright)
    ├── User Flows
    └── Critical Paths
```

## Development Workflow

```bash
# Development (frontend + backend)
npm run dev:full

# Frontend only
npm run dev

# Backend only
npm run dev:backend

# Testing
npm test
npm run test:e2e

# Build
npm run build
npm run build:backend
npm run package
```

## Environment Variables

```bash
# .env.development
NODE_ENV=development
VITE_API_URL=http://localhost:8090
VITE_WS_URL=ws://localhost:8090/ws
VITE_LOG_LEVEL=debug

# .env.production
NODE_ENV=production
VITE_API_URL=http://localhost:8090
VITE_WS_URL=ws://localhost:8090/ws
VITE_LOG_LEVEL=warn
```

## Deployment

1. **Development**: `npm run dev:full`
2. **Production Build**: `npm run package`
3. **Auto-updater**: Electron-updater with GitHub releases

## Monitoring

- **Logging**: Structured logging with levels
- **Performance**: Web Vitals tracking
- **Errors**: Sentry integration
- **Analytics**: Optional Google Analytics

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

Proprietary - ClickFlash Photography

---

*Last Updated: 2026-02-18*
*Version: 4.2.0*
