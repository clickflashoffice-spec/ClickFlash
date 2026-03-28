# ClickFlash Agent Guidelines

> **Development standards and architectural guide for the ClickFlash Photography Ecosystem**

---

## 📋 Project Overview

**ClickFlash** is a complete 6-app photography management platform for professional photography businesses. The ecosystem is designed to operate in both offline (LAN) and online (cloud) environments, serving different user roles from photographers to customers.

### The 6-App Ecosystem

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLICKFLASH PHOTOGRAPHY ECOSYSTEM                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LOCAL NETWORK (Offline-First)                                               │
│  ┌──────────────────────────┐      ┌──────────────────────────┐             │
│  │  🎛️ MASTER PORTAL        │◄────►│  📱 TOUCH KIOSK          │             │
│  │  apps/master/            │ LAN  │  apps/touch/             │             │
│  │  Port: 8090              │      │  Port: 8091              │             │
│  │  Electron + React 19     │      │  Electron + React 19     │             │
│  │  SQLite + Express        │      │  SQLite + Express        │             │
│  └────────────┬─────────────┘      └─────────────────────────┘              │
│               │                                                              │
│               ▼                                                              │
│  ┌──────────────────────────┐                                               │
│  │  💰 MONEY TRASH          │                                               │
│  │  apps/moneytrash/        │                                               │
│  │  Port: 3000              │                                               │
│  │  Next.js 16 + Tauri      │                                               │
│  └──────────────────────────┘                                               │
│                                                                              │
│  CLOUD SERVICES (Online)                                                     │
│  ┌──────────────┬──────────────┬──────────────┐                             │
│  │  📊 MGMT     │  🛍️ GALLERY  │  🌐 WEBSITE  │                             │
│  │  Hub         │  Customer    │  Marketing   │                             │
│  │  React+Vite  │  React+Vite  │  Next.js 15  │                             │
│  │  Cloudflare  │  + Stripe    │  Cloudflare  │                             │
│  └──────────────┴──────────────┴──────────────┘                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| App                  | Location           | Type               | Port | Stack                                  | Status      |
| :------------------- | :----------------- | :----------------- | :--- | :------------------------------------- | :---------- |
| **Master Portal**    | `apps/master/`     | Desktop (Electron) | 8090 | Electron + React 19 + Express + SQLite | ✅ Complete |
| **Touch Kiosk**      | `apps/touch/`      | Desktop (Electron) | 8091 | Electron + React 19 + Express + SQLite | ✅ Complete |
| **MoneyTrash**       | `apps/moneytrash/` | Desktop (Tauri)    | 3000 | Next.js 16 + Tauri + React 18          | ✅ Complete |
| **Management Hub**   | `apps/management/` | Web (Cloud)        | 5173 | React 19 + Vite + Express              | ✅ Complete |
| **Customer Gallery** | `apps/gallery/`    | Web (Cloud)        | 5174 | React 19 + Vite + Express + Stripe     | ✅ Complete |
| **Main Website**     | `apps/website/`    | Web (Static)       | 3001 | Next.js 15 + Tailwind 4                | ✅ Active   |

---

## 🚀 Quick Commands

### Development (Root Level)

```bash
# Install all dependencies across all apps
npm run install:all

# Start all apps concurrently (development)
npm run dev

# Start individual apps
npm run dev:master        # Master Portal (Port 8090)
npm run dev:touch         # Touch Kiosk (Port 8091)
npm run dev:moneytrash    # MoneyTrash (Port 3000)
npm run dev:management    # Management Hub
npm run dev:gallery       # Customer Gallery
npm run dev:website       # Main Website (Port 3001)
```

### Development (Per App)

```bash
# Master Portal
cd apps/master
npm run dev:full          # Frontend + Backend concurrently
npm run dev               # Frontend only (Vite)
npm run dev:backend       # Backend only (Express)

# Touch Kiosk
cd apps/touch
npm run dev:full          # Frontend + Backend concurrently

# Management / Gallery
cd apps/management        # or apps/gallery
npm run dev               # Frontend (Vite)
npm start                 # Backend (Express)
```

### Build

```bash
# Build all apps
npm run build:all

# Build individual apps
npm run build:master      # Includes Electron packaging
npm run build:touch       # Includes Electron packaging
npm run build:moneytrash  # Tauri build
npm run build:management  # Vite build
npm run build:gallery     # Vite build
npm run build:website     # Next.js build
```

### Testing

```bash
# Run all tests across all apps
npm run test:all

# Run tests for specific app
cd apps/master && npm test              # Unit tests (Jest)
cd apps/master && npm run test:e2e      # E2E tests (Playwright)
cd apps/master && npm run test:coverage # With coverage

# Type checking
npm run typecheck:all

# Linting
npm run lint:all
```

### Docker

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Windows Batch Scripts (Root Directory)

| Script | Purpose |
| Script | Purpose |
| :--- | :--- |
| `install-all.bat` | Install dependencies for all apps |
| `start-all.bat` | Start all dev servers concurrently |
| `clean-all.bat` | Remove `node_modules` and build artifacts |
| `kill-all.bat` | Force-terminate all Node.js/Electron processes |
| `status.bat` | Check operational status of all services |

---

## 🏗️ Technology Stack

| Technology | Version | Usage |
| Technology | Version | Usage |
| :--- | :--- | :--- |
| Node.js | 20.x | Runtime |
| TypeScript | 5.x | Language |
| React | 19.x | UI Framework |
| Next.js | 15-16.x | Web Apps |
| Electron | 29.x | Desktop Apps |
| Tauri | 2.x | MoneyTrash Desktop |
| Vite | 7.x | Build Tool |
| Tailwind CSS | 3.x/4.x | Styling |
| SQLite | 3.x (better-sqlite3) | Local Database |
| Express.js | 4.x/5.x | Backend API |
| Zod | 3.x/4.x | Schema Validation |
| React Query | 5.x | Server State |
| Jest | 29.x/30.x | Unit Testing |
| Playwright | 1.50+ | E2E Testing |
| Stripe | 14.x | Payments |

---

## 📁 Code Organization

### Monorepo Structure

```text
ClickFlash/
├── apps/                          # 6 Applications
│   ├── master/                    # Master Portal (Electron)
│   │   ├── src/                   # React frontend
│   │   │   ├── components/        # React components
│   │   │   │   ├── albums/        # Album-related components
│   │   │   │   ├── bookings/      # Booking components
│   │   │   │   ├── common/        # Shared UI components
│   │   │   │   ├── dashboard/     # Dashboard widgets
│   │   │   │   ├── orders/        # Order management
│   │   │   │   └── __tests__/     # Component tests
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── services/          # API services
│   │   │   ├── types/             # TypeScript types
│   │   │   ├── utils/             # Utilities
│   │   │   └── constants/         # Constants
│   │   ├── backend/               # Express API
│   │   │   ├── routes/            # API routes (21 routes)
│   │   │   ├── middleware/        # Express middleware
│   │   │   ├── controllers/       # Route controllers
│   │   │   ├── services/          # Business logic
│   │   │   ├── shared/            # Shared modules (db, etc.)
│   │   │   └── workers/           # Background workers
│   │   ├── tests/                 # E2E tests
│   │   │   └── e2e/
│   │   └── electron-main.js       # Electron entry
│   │
│   ├── touch/                     # Touch Kiosk (Electron)
│   │   ├── src/                   # React frontend
│   │   ├── backend/               # Express API (8 routes)
│   │   └── main.js                # Electron entry
│   │
│   ├── moneytrash/                # Uploader (Next.js + Tauri)
│   │   ├── src/
│   │   └── src-tauri/             # Rust Tauri code
│   │
│   ├── management/                # Management Hub (Cloud)
│   │   ├── src/                   # React frontend
│   │   └── backend/               # Express API
│   │
│   ├── gallery/                   # Customer Gallery (Cloud)
│   │   ├── src/                   # React frontend
│   │   └── backend/               # Express API + Stripe
│   │
│   └── website/                   # Marketing Website
│       └── src/                   # Next.js pages
│
├── packages/                      # Shared packages
│   └── backup-service/            # Backup automation
│
├── scripts/                       # Build & deployment scripts
├── deployment/                    # Docker & deployment configs
├── docs/                          # Documentation
├── .github/workflows/             # CI/CD pipelines
├── package.json                   # Root workspace config
├── pnpm-workspace.yaml            # pnpm workspace definition
└── docker-compose.yml             # Docker development setup
```

### Path Aliases (TypeScript)

All apps use absolute imports with `@/` aliases:

```typescript
// tsconfig.json paths configuration
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@services/*": ["./src/services/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@utils/*": ["./src/utils/*"],
      "@types/*": ["./src/types/*"]
    }
  }
}
```

**Usage:**

```typescript
// ✅ Good - Use absolute imports
import { apiService } from "@/services/apiService";
import { Button } from "@/components/ui/Button";
import type { Photo } from "@/types";

// ❌ Avoid - Relative imports
import { apiService } from "../../../services/apiService";
```

---

## 📝 Coding Standards

### Naming Conventions

| Type | Convention | Example |
| Type | Convention | Example |
| :--- | :--- | :--- |
| Components | PascalCase | `PhotoViewer.tsx` |
| Files (components) | PascalCase | `AlbumEditor.tsx` |
| Files (utilities/hooks) | camelCase | `usePhotos.ts`, `formatDate.ts` |
| Files (styles) | kebab-case | `photo-styles.css` |
| Hooks | camelCase with `use` prefix | `useAlbums.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Types/Interfaces | PascalCase | `interface PhotoProps` |
| Enum members | PascalCase | `enum Status { Active }` |

### Import Order

```typescript
// 1. React/External libraries
import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Internal absolute imports (@/)
import { apiService } from "@/services/apiService";
import { PhotoCard } from "@/components/photos/PhotoCard";
import type { Photo, Album } from "@/types";

// 3. Relative imports (when necessary)
import { LocalHelper } from "./helpers";

// 4. Type-only imports
import type { Metadata } from "next";
```

### React Component Structure

```typescript
// ✅ Good - Proper component structure
import React, { memo, useCallback } from 'react';

interface PhotoCardProps {
    photo: Photo;
    onSelect: (id: string) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = memo(({ photo, onSelect }) => {
    const handleClick = useCallback(() => {
        onSelect(photo.id);
    }, [photo.id, onSelect]);

    return (
        <div className="photo-card" onClick={handleClick}>
            <img src={photo.url} alt={photo.title} />
        </div>
    );
});

PhotoCard.displayName = 'PhotoCard';
```

### State Management

**Server State (React Query):**

```typescript
// ✅ Good - React Query for server state
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function usePhotos(albumId: string) {
  return useQuery({
    queryKey: ["photos", albumId],
    queryFn: () => apiService.getPhotos(albumId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiService.updatePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}
```

**Client State (useState/useReducer):**

```typescript
// ✅ Good - Local state for UI
const [isOpen, setIsOpen] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

### Performance Optimization

**Use React.memo for expensive components:**

```typescript
export const PhotoGrid = memo(({ photos, onSelect }: PhotoGridProps) => {
    return (
        <div className="grid">
            {photos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onSelect={onSelect} />
            ))}
        </div>
    );
});

PhotoGrid.displayName = 'PhotoGrid';
```

**Use useMemo for expensive computations:**

```typescript
const filteredPhotos = useMemo(() => {
  return photos.filter((p) => p.category === selectedCategory);
}, [photos, selectedCategory]);
```

**Use useCallback for event handlers:**

```typescript
const handleDelete = useCallback(
  (id: string) => {
    deletePhoto.mutate(id);
  },
  [deletePhoto],
);
```

### Styling (Tailwind CSS)

**Always support dark mode:**

```tsx
// ✅ Good - Dark mode support
<div className="
    bg-white dark:bg-slate-900
    text-slate-900 dark:text-white
    border-slate-200 dark:border-slate-700
">

// ✅ Good - Hover states in both modes
<button className="
    bg-blue-600 hover:bg-blue-700
    dark:bg-blue-500 dark:hover:bg-blue-600
    text-white
">
```

**Common Tailwind Patterns:**

```tsx
// Layout
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-3 gap-4">
<div className="absolute inset-0">

// Responsive
<div className="p-4 md:p-6 lg:p-8">
<div className="text-sm md:text-base lg:text-lg">

// States
<button className="disabled:opacity-50 disabled:cursor-not-allowed">
<input className="focus:ring-2 focus:ring-blue-500">
<div className="hover:bg-slate-100 dark:hover:bg-slate-800">
```

### Logging Standards

**Use the structured logger instead of console:**

```typescript
import { logger } from "@/utils/logger";

// ✅ Good - Structured logging
logger.info("Photo uploaded", { photoId, albumId, size: file.size });
logger.error("Upload failed", error, { photoId, attempt: 2 });
logger.warn("Cache miss", { key: queryKey });
logger.debug("Rendering grid", { photoCount: photos.length });

// ❌ Avoid - Direct console usage
console.log("Photo uploaded", photoId);
console.error("Upload failed", error);
```

**Log levels:**

- `logger.debug()` - Development debugging
- `logger.info()` - General operations
- `logger.warn()` - Non-critical issues
- `logger.error()` - Errors with context

---

## 🧪 Testing Strategy

### Testing Pyramid

```text
    /\
   /  \     E2E Tests (Playwright)      Target: 90%
  /----\
 /      \   Integration Tests           Target: 70%
/--------\
----------  Unit Tests (Jest)           Target: 80%
```

### Test File Locations

```text
src/
├── components/
├── Dashboard.tsx
├── __tests__/
│   └── Dashboard.test.tsx
├── services/
├── apiService.ts
└── __tests__/
└── apiService.test.ts
└── utils/
├── helpers.ts
└── __tests__/
└── helpers.test.ts
```

### Running Tests

```bash
# Unit tests with Jest
cd apps/master
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# E2E tests with Playwright
npm run test:e2e            # Headless mode
npm run test:e2e:headed     # With browser UI
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:debug      # Debug mode
```

### Example Unit Test

```typescript
// src/components/__tests__/StatCard.test.tsx
import { render, screen } from '@testing-library/react';
import StatCard from '../common/StatCard';

describe('StatCard', () => {
    it('renders with correct props', () => {
        render(
            <StatCard
                title="Revenue"
                value="$1,234"
                icon={<svg data-testid="icon" />}
            />
        );

        expect(screen.getByText('REVENUE')).toBeInTheDocument();
        expect(screen.getByText('$1,234')).toBeInTheDocument();
    });

    it('handles click events', () => {
        const handleClick = jest.fn();
        render(
            <StatCard
                title="Orders"
                value="10"
                icon={<svg />}
                onClick={handleClick}
            />
        );

        screen.getByText('10').click();
        expect(handleClick).toHaveBeenCalled();
    });
});
```

---

## 🔒 Security Considerations

### Authentication & Authorization

| App | Auth Method | Notes |
| App | Auth Method | Notes |
| :--- | :--- | :--- |
| Master Portal | JWT + Express Sessions | CSRF protection enabled |
| Touch Kiosk | HMAC-SHA256 Request Signing | LAN-only, paired with Master |
| Management Hub | RS256 JWT | Hardware fingerprinting |
| Gallery | Token-based | Per-order access tokens |

### LAN Security (Touch ↔ Master)

- **HMAC-SHA256 Request Signing**: All Touch → Master requests include `X-Kiosk-ID`, `X-Timestamp`, `X-Signature` headers
- **Replay Prevention**: 5-minute timestamp window
- **Secret Management**: 32-byte signing secret generated during pairing, persisted to both databases

### Network Isolation

- **Touch App**: Strictly LAN-only (`setupNetworkIsolation` in main.js). Blocks all non-private IPs.
- **Master App**: Offline-first with optional cloud sync. Only Master communicates with Cloudflare.

### Environment Variables

Sensitive configuration is managed via `.env` files:

```bash
# Copy example and configure
cp .env.example .env

# Key security-related variables
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
BCRYPT_ROUNDS=12
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

See `.env.example` for complete configuration options.

### Security Checklist for New Features

- [ ] Input validation using Zod schemas
- [ ] Rate limiting on public endpoints
- [ ] CSRF tokens for state-changing operations
- [ ] XSS sanitization for user-generated content
- [ ] SQL injection prevention (parameterized queries)
- [ ] File upload restrictions (type, size)
- [ ] Authentication checks on protected routes

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
| Workflow | Trigger | Purpose |
| :--- | :--- | :--- |
| `ci.yml` | Push/PR to main/develop | Lint, type-check, unit tests, build test, E2E tests |
| `cd.yml` | Tags (v\*) | Build and release all apps |
| `e2e.yml` | Scheduled/nightly | Full E2E test suite |
| `nightly.yml` | Daily | Security audits, dependency updates |
| `codeql.yml` | Push/PR | Security analysis |

### CI Process

```text
Push/PR
    │
    ├──► Lint & Type Check (all apps)
    │
    ├──► Unit Tests (Jest)
    │
    ├──► Build Test (per-platform)
    │    ├── Windows (Master, Touch)
    │    └── Ubuntu (Management, Gallery, Website, MoneyTrash)
    │
    ├──► E2E Tests (Playwright)
    │
    └──► Security Audit
```

### Local CI Simulation

```bash
# Run the same checks as CI locally
npm run lint:all
npm run typecheck:all
npm run test:all
```

---

## 🌐 API Routes

### Master Portal (21 Routes)

| Route Prefix       | File             | Purpose                             |
| :----------------- | :--------------- | :---------------------------------- |
| `/api/auth`        | `auth.ts`        | Login, signup, session management   |
| `/api/collections` | `collections.ts` | Generic CRUD for all tables         |
| `/api/cloud`       | `cloud.ts`       | Cloud sync status and control       |
| `/api/orders`      | `orders.ts`      | Order fulfillment and management    |
| `/api/faces`       | `faces.ts`       | Face recognition search and reindex |
| `/api/culling`     | `culling.ts`     | Photo culling and analysis          |
| `/api/pairing`     | `pairing.ts`     | Kiosk pairing (QR + HMAC)           |
| `/api/sync`        | `sync.ts`        | Offline mutation sync               |
| `/api/files`       | `files.ts`       | File upload and management          |
| `/api/system`      | `system.ts`      | Health, IP, printers, diagnostics   |
| `/api/realtime`    | `realtime.ts`    | SSE real-time events                |

### Touch Kiosk (8 Routes)

| Route Prefix                       | File             | Purpose                      |
| :--------------------------------- | :--------------- | :--------------------------- |
| `/api/auth`                        | `auth.ts`        | Local authentication         |
| `/api/collections`                 | `collections.ts` | Local data CRUD              |
| `/api/orders`                      | `orders.ts`      | Order creation               |
| `/api/orders/:id/export-to-master` | `orderExport.ts` | HMAC-signed export to Master |
| `/api/sync`                        | `sync.ts`        | Sync with Master             |

---

## 📦 Deployment

### Desktop Apps (Master, Touch, MoneyTrash)

```bash
# Build and package for distribution
cd apps/master
npm run package       # Creates .exe installer

# Or use the v3 build pipeline
npm run package:v3
```

### Web Apps (Management, Gallery, Website)

```bash
# Management & Gallery (Docker)
docker-compose up --build management
docker-compose up --build gallery

# Website (Cloudflare Pages)
cd apps/website
npm run build
# Deploy dist/ to Cloudflare Pages
```

### Production Deployment Script

```powershell
# Full ecosystem deployment
.\deploy_ecosystem.ps1
```

---

## ✅ Pre-Commit Checklist

Before committing code:

- [ ] `npm run lint` passes (or `echo No lint issues found.` for apps without linting)
- [ ] `npx tsc --noEmit` passes (type checking)
- [ ] `npm test` passes (unit tests)
- [ ] Components using `memo` have `displayName` set
- [ ] Logger used instead of `console.log`
- [ ] Dark mode classes added for UI components
- [ ] Absolute imports used (`@/`)
- [ ] Types defined for all props and functions
- [ ] No secrets or credentials in code

---

## 🐛 Debugging Tips

### React Query DevTools

- Press `Shift + F` to toggle in development

### Logger

```typescript
// Enable debug logs in development
logger.setLevel("debug");
```

### Check Build Output

```bash
cd apps/master
ls -la dist/master/assets/  # Check generated chunks
```

### Common Issues

| Issue | Solution |
| Issue | Solution |
| :--- | :--- |
| `better-sqlite3` build errors | Ensure Python and build tools installed |
| Port conflicts | Use `kill-all.bat` to free ports |
| Type errors after refactor | Run `npm run typecheck:all` |
| E2E tests failing | Ensure dev server running on correct port |

---

## 📚 Additional Documentation

- [Architecture](./ARCHITECTURE.md) - System design & data flow
- [Testing Guide](./TESTING_GUIDE.md) - Comprehensive testing documentation
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines
- [API Documentation](./API.md) - API endpoints reference
- [Deployment Guide](./DEPLOYMENT.md) - Deployment procedures

---

**Version:** 4.2.0  
**Last Updated:** March 2026
