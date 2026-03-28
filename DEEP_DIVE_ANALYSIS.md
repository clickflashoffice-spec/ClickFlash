# 📸 ClickFlash - Deep Dive Analysis

## Project Overview

**ClickFlash** is a comprehensive **6-app photography ecosystem** designed for professional photography businesses at resorts and event venues. It handles high-volume photo processing (100GB+ per deployment) with both **offline** and **cloud** capabilities.

- **Version:** 4.2.0
- **Node.js:** 20.x+
- **Package Manager:** pnpm (workspace)
- **License:** Private

---

## 🏗️ Architecture Summary

### The 6 Applications

| App                  | Type              | Port | Technology Stack                            |
| -------------------- | ----------------- | ---- | ------------------------------------------- |
| **Master Portal**    | Desktop (Offline) | 8090 | Electron + React 19 + Express + SQLite      |
| **Touch Kiosk**      | Desktop (Offline) | 8091 | Electron + React 19 + Express + SQLite      |
| **Money Trash**      | Web App           | 3000 | Next.js 16 + React 19 + Tailwind 4          |
| **Management Hub**   | Cloud             | —    | React 19 + Vite + Express + SQLite          |
| **Customer Gallery** | Cloud             | —    | React 19 + Vite + Express + SQLite + Stripe |
| **Website**          | Marketing         | 3001 | Next.js 15                                  |

---

## 📁 Directory Structure

```
ClickFlash/
├── apps/
│   ├── master/              # Master Station (Electron desktop app)
│   │   ├── backend/         # Express API (22 route files)
│   │   │   ├── routes/      # auth, orders, photos, sync, cloud, etc.
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, validation
│   │   │   └── schemas/     # Zod validation schemas
│   │   ├── src/             # React 19 frontend
│   │   └── main.js          # Electron main process
│   │
│   ├── touch/               # Touch Kiosk (Electron desktop app)
│   │   ├── backend/         # Express API (8 routes)
│   │   ├── src/             # React 19 frontend
│   │   └── main.js          # Electron main process
│   │
│   ├── moneytrash/          # Next.js 16 uploader
│   ├── management/          # React + Vite + Express backend
│   ├── gallery/             # React + Vite + Express + Stripe
│   ├── website/             # Next.js 15 marketing site
│   └── shared/              # Shared cloud schema
│
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── ui/                  # Shared UI components
│   ├── utils/               # Shared utilities
│   └── backup-service/      # Backup automation
│
├── deployment/              # Docker & Nginx configs
├── docs/                    # Documentation
└── scripts/                 # Build & deployment scripts
```

---

## 🔐 Security Features

- **HMAC-SHA256 Request Signing** for Touch ↔ Master communication
- **JWT + Express Sessions** for Master authentication
- **RS256 JWT with hardware fingerprinting** for cloud apps
- **Token-based access** per order for Gallery
- **Strict Rate Limiting** (5 req/min on Login)
- **Zod Validation** for all API mutations
- **HSTS & CSP** (Helmet) in production
- **Network Isolation** - Touch app blocks all non-private IPs

---

## 🗄️ Database Design

| Database            | App                  | Engine                  | Key Tables                                               |
| ------------------- | -------------------- | ----------------------- | -------------------------------------------------------- |
| `master.db`         | Master               | SQLite (better-sqlite3) | photos, albums, orders, kiosks, settings, operation_logs |
| `touch.db`          | Touch                | SQLite (better-sqlite3) | orders, settings, sync_state                             |
| `clickflash-hub-db` | Management + Gallery | Cloudflare D1           | desks, orders, photos, daily_objectives, campaigns       |

---

## 🔌 API Routes

### Master Station (22 routes)

- `/api/auth` - Login, signup, sessions
- `/api/collections` - Generic CRUD
- `/api/orders` - Order management
- `/api/photos` - Photo management
- `/api/cloud` - Cloud sync
- `/api/faces` - Face recognition
- `/api/culling` - Photo culling
- `/api/gallery` - Watermark generation
- `/api/gallery-auth` - Gallery authentication
- `/api/gallery-checkout` - Stripe payments
- `/api/analytics` - Reporting
- `/api/dashboard` - Dashboard widgets
- `/api/ledger` - Financial ledger
- `/api/pairing` - Kiosk QR + HMAC pairing
- `/api/sync` - Offline mutation sync
- `/api/files` - File uploads
- `/api/system` - Health, printers
- `/api/realtime` - SSE events

### Touch Kiosk (8 routes)

- `/api/auth` - Local auth
- `/api/collections` - CRUD
- `/api/orders` - Order creation
- `/api/orders/:id/export-to-master` - HMAC-signed export
- `/api/files` - Asset serving
- `/api/sync` - Master sync
- `/api/system` - Diagnostics
- `/api/realtime` - SSE

---

## 🚀 Development Commands

```
bash
# Install all dependencies
npm run install:all

# Start all dev servers
npm run dev

# Individual apps
npm run dev:master        # Port 8090
npm run dev:touch         # Port 8091
npm run dev:management    # Management Hub
npm run dev:gallery       # Customer Gallery
npm run dev:website       # Website (Port 3001)

# Build all apps
npm run build:all

# Test all apps
npm run test:all

# Docker
npm run docker:up
npm run docker:down
```

---

## 📊 Key Stats

- **68 E2E Tests Passing**
- **Code Refactoring:** 1,701 lines reduced (-67%)
- **28 New Modules Created**
- **100% App Completion** (6/6 apps)

---

## 🔧 Technology Stack

| Technology   | Version | Purpose        |
| ------------ | ------- | -------------- |
| React        | 19.x    | UI Framework   |
| Next.js      | 15-16.x | Web Apps       |
| Electron     | 29.x    | Desktop Apps   |
| Vite         | 7.x     | Build Tool     |
| TypeScript   | 5.x     | Language       |
| Tailwind CSS | 4.x     | Styling        |
| SQLite       | 3.x     | Local Database |
| Express.js   | 4.x     | Backend API    |
| Stripe       | 14.x    | Payments       |

---

## 🌐 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE (Local Network)                       │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │ Master       │◄────►│ Touch Kiosk  │◄────►│ Money Trash  │  │
│  │ Port 8090    │  LAN │ Port 8091    │      │ Port 3000    │  │
│  │ + SQLite     │ HMAC │ + SQLite     │      │              │  │
│  └──────┬───────┘      └──────────────┘      └──────────────┘  │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │ Cloud Sync
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ONLINE (Cloudflare)                         │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │ Management   │      │  Gallery     │      │   Website    │  │
│  │   Hub        │      │              │      │              │  │
│  │ D1 + Worker  │      │ R2 + Worker  │      │   Pages      │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Files Summary

### Root Configuration Files

- `package.json` - Workspace root with scripts for all 6 apps
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `docker-compose.yml` - Docker orchestration
- `docker-compose.dev.yml` - Development Docker setup

### Master App (apps/master/)

- `backend/server.ts` - Express server entry point
- `backend/routes/` - 22 API route files
- `electron-main.js` - Electron main process
- `package.json` - Electron + React 19 dependencies

### Touch App (apps/touch/)

- Similar structure to Master but with 8 routes
- Network isolation enabled

### Cloud Apps

- `apps/management/` - Cloudflare Worker + React frontend
- `apps/gallery/` - Cloudflare Worker + React + Stripe
- `apps/website/` - Next.js 15 static export

---

## Summary

This is a **well-architected, production-ready photography ecosystem** with:

- Clear separation between offline desktop apps and cloud-based web services
- Comprehensive security measures (HMAC, JWT, CSP)
- Mature development workflow with E2E tests
- Monorepo structure using pnpm workspace

**All 6 apps are complete and production-ready.**
