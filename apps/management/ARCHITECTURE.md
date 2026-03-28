# Management App Architecture

## Overview

The Management App is a web-based application for comprehensive photography business management. It provides tools for album management, order processing, photographer management, booking scheduling, financial tracking, and customer portal management.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   MANAGEMENT APP ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (React 19 + Vite)                              │   │
│  │  ├── Components (Feature modules)                        │   │
│  │  ├── State Management (TanStack Query)                   │   │
│  │  ├── Services (API, Sync, Performance)                   │   │
│  │  └── Hooks (Custom React hooks)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────┼─────────────────────────────────┐ │
│  │                         ▼                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  BACKEND (Express + SQLite)                        │  │ │
│  │  │  ├── REST API Routes                               │  │ │
│  │  │  ├── WebSocket Server (Real-time updates)          │  │ │
│  │  │  ├── Services (Business Logic)                     │  │ │
│  │  │  └── Middleware (Auth, Validation)                 │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  DATA LAYER                                        │  │ │
│  │  │  ├── SQLite (Primary database via better-sqlite3)  │  │ │
│  │  │  ├── Browser Cache (IndexedDB)                     │  │ │
│  │  │  └── File System (Uploads, exports)                │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  EXTERNAL SERVICES                                      │   │
│  │  ├── Master App Sync (WebSocket/API)                    │   │
│  │  ├── AI Services (Gemini API)                           │   │
│  │  └── Email/SMS Providers                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
apps/management/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── albums/              # Album management
│   │   ├── bookings/            # Booking calendar
│   │   ├── common/              # Shared components
│   │   ├── customer/            # Customer portal
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── error-boundaries/    # Error handling
│   │   ├── management/          # Business management
│   │   ├── orders/              # Order processing
│   │   ├── photographers/       # Photographer management
│   │   ├── products/            # Product catalog
│   │   ├── touch/               # Kiosk touch interface
│   │   └── modals/              # Modal dialogs
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # Frontend services
│   ├── types/                   # TypeScript types
│   ├── utils/                   # Utility functions
│   └── constants/               # Constants
├── backend/                      # Backend source
│   ├── routes/                  # API routes
│   ├── middleware/              # Express middleware
│   ├── services/                # Business logic
│   └── database/                # Database utils
├── tests/                        # Test files
└── docs/                         # Documentation
```

## Technology Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Forms**: Native with Zod validation
- **UI Components**: Custom + Headless UI

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT-based
- **Real-time**: WebSocket (ws)

### Infrastructure
- **AI Integration**: Google Gemini API
- **Image Processing**: Canvas API
- **Testing**: Jest + React Testing Library
- **Validation**: Zod schemas

## Key Features

### 1. Album Management
- Photo import and organization
- Album creation and editing
- Cover photo selection
- Album publishing to kiosks

### 2. Order Management
- Order board (Kanban-style)
- Print fulfillment workflow
- Lab print folders
- Order status tracking

### 3. Photographer Management
- Photographer profiles
- Working time tracking
- Objectives management
- Performance metrics

### 4. Booking System
- Calendar view
- Booking creation/editing
- Session type management
- Conflict detection

### 5. Business Management
- Financial tracking
- Expense management
- Payroll processing
- Destination management
- Equipment inventory

### 6. Customer Portal
- Customer login
- Photo gallery
- Favorites selection
- Checkout process
- Order status tracking

### 7. Touch/Kiosk Interface
- Attract screen
- Photo browsing
- Face search
- Order configuration
- Payment processing

## Data Flow

```
User Action
    │
    ▼
React Component
    │
    ▼
Custom Hook / TanStack Query
    │
    ▼
API Service (fetch)
    │
    ▼
Express Route
    │
    ▼
Controller / Service
    │
    ▼
Database (SQLite)
```

## State Management

### Server State (TanStack Query)
- Albums, Photos
- Orders, Bookings
- Photographers, Products
- Destinations, Settings

### Local State
- Component UI state
- Form data
- Modal visibility
- Selection state

## Error Handling

```
Component Error
    │
    ▼
FeatureErrorBoundary
    │
    ▼
ErrorBoundary (Global)
    │
    ▼
Structured Logger
```

## Performance Optimizations

1. **Virtualization**: VirtualGrid and VirtualList for large datasets
2. **Memoization**: React.memo, useMemo, useCallback
3. **Lazy Loading**: Route-based code splitting
4. **Image Optimization**: Lazy loading, thumbnails
5. **Debouncing**: useDebounce hook for search inputs

## Security

1. **Authentication**: JWT tokens with refresh
2. **Authorization**: Role-based permissions
3. **Input Validation**: Zod schemas
4. **SQL Injection Prevention**: Parameterized queries
5. **CORS**: Configured for trusted origins

## Testing Strategy

```
Unit Tests (Jest)
    ├── Components (React Testing Library)
    ├── Hooks
    ├── Utils
    └── Services

Integration Tests
    ├── API Routes
    └── Database operations
```

## Development Workflow

```bash
# Development
npm run dev

# Build
npm run build

# Testing
npm test
npm run test:watch

# Backend
npm start
```

## Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:8090
VITE_WS_URL=ws://localhost:8090/ws
VITE_LOG_LEVEL=debug

# .env.production
VITE_API_URL=http://localhost:8090
VITE_WS_URL=ws://localhost:8090/ws
VITE_LOG_LEVEL=warn
```

## Monitoring

- **Logging**: Structured logging with levels (logger.ts)
- **Performance**: Web Vitals tracking (performanceMonitor.ts)
- **Errors**: FeatureErrorBoundary components

## Coding Standards

### Import Order
1. React/External libraries
2. Internal absolute imports (`@/`)
3. Relative imports
4. Type-only imports

### Naming Conventions
- Components: PascalCase
- Hooks: camelCase with `use` prefix
- Utils: camelCase
- Constants: UPPER_SNAKE_CASE

### Error Boundaries Usage
```tsx
<FeatureErrorBoundary feature="Album Management" severity="high">
    <Albums />
</FeatureErrorBoundary>
```

### Logger Usage
```tsx
import { logger } from '@/utils/logger';

logger.info('Action completed', { albumId, photoCount });
logger.error('Operation failed', error, { context: 'upload' });
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

Proprietary - ClickFlash Photography

---

*Last Updated: 2026-02-18*
*Version: 4.1.0*
