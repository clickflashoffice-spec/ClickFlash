# 📸 ClickFlash Photography Ecosystem

> **A complete 6-app platform for professional photography businesses**

[![CI](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/ci.yml/badge.svg)](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/ci.yml)
[![CD](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/cd.yml/badge.svg)](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/cd.yml)

[![Master Portal](https://img.shields.io/badge/Master%20Portal-v4.3.0-blue)](./apps/master/)
[![Touch Kiosk](https://img.shields.io/badge/Touch%20Kiosk-v4.3.0-green)](./apps/touch/)
[![Money Trash](https://img.shields.io/badge/Money%20Trash-v4.3.0-yellow)](./apps/moneytrash/)
[![Management](https://img.shields.io/badge/Management-v4.3.0-purple)](./apps/management/)
[![Gallery](https://img.shields.io/badge/Gallery-v4.3.0-pink)](./apps/gallery/)
[![Website](https://img.shields.io/badge/Website-v4.3.0-orange)](./apps/website/)

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🏢 The 6-App Ecosystem

```bash
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLICKFLASH PHOTOGRAPHY ECOSYSTEM                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────┐      ┌──────────────────────────┐             │
│  │  🎛️ MASTER PORTAL        │◄────►│  📱 TOUCH KIOSK          │             │
│  │  apps/master/            │ LAN  │  apps/touch/             │             │
│  │  Port: 8090              │      │  Port: 8091              │             │
│  └────────────┬─────────────┘      └─────────────────────────┘             │
│               │                                                             │
│               └──────────┬
│                          │                                                   │
│                          ▼                                                   │
│                   ┌─────────────┐                                            │
│                   │ cloud-backend(Cloudflare Worker)                         │
│                   └──────┬──────┘                                            │
│                          │                                                   │
│  ┌───────────────────────┼───────────────────────────────────────────────┐  │
│  │                       │              WEB APPS                         │  │
│  │  ┌────────────────────▼──────────────────────────────────────────┐   │  │
│  │  │  💰 Money Trash Uploader (apps/moneytrash/) - Next.js 16      │   │  │
│  │  │  📊 Management Hub (apps/management/) - React/Vite (CF Pages) │   │  │
│  │  │  🛍️ Customer Gallery (apps/gallery/) - React/Vite (CF Pages) │   │  │
│  │  │  🌐 Main Website (apps/website/) - Next.js 15               │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Organized Structure

```bash
E:\ClickFlash\
├── 📂 apps/                    # All applications
│   ├── 📂 master/              # 🎛️ Master Portal (Electron + React 19)
│   ├── 📂 touch/               # 📱 Touch Kiosk (Electron + React 19)
│   ├── 📂 moneytrash/          # 💰 Money Trash Uploader (Next.js 16)
│   ├── 📂 management/          # 📊 Management Hub (React + Vite)
│   ├── 📂 gallery/             # 🛍️ Customer Gallery (React + Vite)
│   ├── 📂 website/             # 🌐 Main Website (Next.js 15)
│   └── 📂 cloud-backend/       # ☁️ Cloudflare Worker (D1 + R2 API)
│
├── 📂 packages/                # Shared packages
│   ├── 📂 types/               # @clickflash/types — shared TypeScript types
│   └── 📂 ui/                  # @clickflash/ui — shared UI components
│
├── 📂 scripts/                 # Operational scripts (build, deploy, rotate keys)
├── 📂 docs/                    # Production guides (monitoring, DR, data sync)
│   └── 📂 archive/             # Historical dev records (120 files)
├── 📄 package.json             # Root workspace config (pnpm workspaces)
└── 📄 README.md                # This file
```

---

## 🔒 Security Features

- **Strict Rate Limiting**: Anti-brute force protection on Login (5 req/min).
- **Zod Validation**: Strict schema enforcement for all API mutations.
- **HSTS & CSP**: Production-grade HTTP headers (Helmet).
- **Audit Logging**: Comprehensive tracking of auth and data access.

---

## 📱 Apps Overview

### 1. 🎛️ Master Portal

**Location:** `apps/master/`  
**Type:** Electron + React 19 Desktop App (Offline)

Studio management system for photographers.

- **Features:** Album management, events, device pairing, QR codes, Auto Money Trash, Cloud Sync
- **Stack:** Electron + React 19 + Express API + SQLite + WebSocket
- **Status:** ✅ Complete (E2E tests passing)

```bash
npm run dev:backend   # Express API (Port 8090)
npm run preview       # Frontend Preview
```

---

### 2. 📱 Touch Kiosk

**Location:** `apps/touch/`  
**Type:** Electron + React 19 Desktop App (Offline)

Customer self-service kiosk. **STRICTLY OFFLINE.**

- **No Cloud Sync**: Connects ONLY to Master Portal via LAN.
- **Privacy First**: Zero external internet connection required.
- **Features:** Photo viewing, favorites, order placement.
- **Stack:** Electron + React 19 + Express API + SQLite
- **Status:** ✅ Complete (E2E tests passing)

```bash
npm run dev:backend   # Express API (Port 8091)
npm run preview       # Frontend Preview
```

---

### 3. 💰 Money Trash Uploader

**Location:** `apps/moneytrash/`  
**Type:** Next.js 16 Web App

Professional photo upload gateway with drag & drop and progress tracking.

- **Features:** Drag & drop, image previews, batch uploads, progress tracking, upload history
- **Stack:** Next.js 16 + React 19 + Tailwind 4
- **Status:** ✅ Complete

```bash
npm run dev:moneytrash    # Port 3000
```

---

### 4. 📊 Management Hub (100% Online)

**Location:** `apps/management/`  
**Type:** React 19 + Vite (Cloudflare Pages)

Fully online business management dashboard communicating with `apps/cloud-backend`.

- **Features:** Advanced analytics, 12+ management pages, payroll, reports, settings
- **Stack:** React 19 + Vite + Tailwind CSS
- **Deployment:** Cloudflare Pages
- **Status:** ✅ Complete

```bash
npm run dev               # Frontend (Vite dev server)
```

---

### 5. 🛍️ Customer Gallery (100% Online)

**Location:** `apps/gallery/`  
**Type:** React 19 + Vite (Cloudflare Pages)

Fully online customer portal communicating with `apps/cloud-backend`.

- **Features:** Photo browsing, lightbox, favorites, shopping cart, Stripe payments, downloads
- **Stack:** React 19 + Vite + Stripe
- **Deployment:** Cloudflare Pages
- **Status:** ✅ Complete

```bash
npm run dev               # Frontend (Vite dev server)
```

---

### 6. 🌐 Main Website

**Location:** `apps/website/`  
**Type:** Next.js 15 Web App (Marketing)

Public marketing website.

- **Pages:** Home, About, Portfolio, Clients, Contact
- **Stack:** Next.js 15 + Tailwind CSS
- **Status:** ✅ Active

```bash
npm run dev:website       # Port 3001
```

---

## 🚀 Quick Start

### Install All Dependencies

```bash
npm run install:all
```

### Start Development Servers

```bash
# Individual apps
npm run dev:master        # Master Portal (Port 8090)
npm run dev:touch         # Touch Kiosk (Port 8091)
npm run dev:moneytrash    # Money Trash Uploader (Port 3000)
npm run dev:management    # Management Hub
npm run dev:gallery       # Customer Gallery
npm run dev:website       # Main Website (Port 3001)
```

### Build All Apps

```bash
npm run build:master
npm run build:touch
npm run build:moneytrash
npm run build:management
npm run build:gallery
npm run build:website
```

---

## 🛠️ Maintenance & Deployment Scripts

For automated local setup and deployment, the following scripts are available in the root:

### PowerShell Scripts

- `scripts/deploy-cloud.ps1`: Validated Worker migrations, bundles, and Cloudflare deployment orchestration.
- `start-all.ps1`: Starts all 6 application dev servers concurrently.
- `.github/workflows/cd.yml`: Dedicated online-only Pages deployment for Management, Gallery, and Website.

### Batch Scripts

- `install-all.bat`: Recursive dependency installation for all apps.
- `start-all.bat`: Concurrent local startup for Windows environments.
- `clean-all.bat`: Removes `node_modules` and build artifacts.
- `status.bat`: Checks the operational status of all local services.
- `kill-all.bat`: Force-terminates all running Node.js and Electron processes.

---

## 🏗️ Architecture

### Desktop Apps (Offline)

- **Master Portal** and **Touch Kiosk** run offline using local Express.js backends and SQLite DBs.
- Real-time sync via WebSocket when on the same LAN
- Cloud sync via custom sync service to the Master Node when online

### Web Apps (100% Online)

- **Money Trash Uploader** - Tauri desktop app (local upload gateway)
- **Management Hub** - CF Pages talking to CF Worker (`apps/cloud-backend`)
- **Customer Gallery** - CF Pages talking to CF Worker (`apps/cloud-backend`)
- **Main Website** - Next.js 15 marketing site
- **Cloud Backend** - Cloudflare Worker + D1 Database + R2 Object Storage + Stripe

---

## 🛠️ Tech Stack

| Technology   | Version | Usage                          |
| ------------ | ------- | ------------------------------ |
| React        | 19.x    | UI Framework (all apps)        |
| Next.js      | 15.x    | Website                        |
| Electron     | 39.x    | Desktop Apps (master, touch)   |
| Tauri         | 2.x     | Desktop App (moneytrash)       |
| Vite         | 7.x     | Build Tool                     |
| TypeScript   | 5.x     | Language                       |
| Tailwind CSS | 3.x     | Styling                        |
| SQLite       | 3.x     | Local Database (master, touch) |
| D1           | --      | Cloud Database (gallery, mgmt) |
| R2           | --      | Object Storage (gallery)       |
| Express.js   | 5.x     | Backend API (master, touch)    |
| CF Workers   | --      | Edge Backend (gallery, mgmt)   |
| Stripe       | 20.x    | Payments                       |

---

## 📊 Stats

### Refactoring Achievements

```bash
Code Refactoring Complete:
├── AlbumDetail.tsx:     1,969 → 5 modules (-78%)
├── syncService.ts:        873 → 4 modules (-75%)
├── pb.ts:                 606 → 3 modules (-70%)
├── KioskContext.tsx:      577 → 4 modules (-68%)
└── WelcomeScreen.tsx:     495 → 3 modules (-60%)

Total: 1,701 lines reduced (-67%)
New Modules: 28 files
E2E Tests: 68 passing
```

#### App Completion Status

| App                  | Status      | Port | Stack                    |
| :------------------- | :---------- | :--- | :----------------------- |
| **Master Portal**    | ✅ Complete | 8090 | Electron + React 19      |
| **Touch Kiosk**      | ✅ Complete | 8091 | Electron + React 19      |
| **Money Trash**      | ✅ Complete | --   | Tauri + React 19         |
| **Management Hub**   | ✅ Complete | --   | CF Pages                 |
| **Customer Gallery** | ✅ Complete | --   | CF Pages                 |
| **Cloud Backend**    | ✅ Complete | --   | CF Worker + D1 + R2      |
| **Website**          | ✅ Active   | 3001 | Next.js 15               |

**Overall: 6/6 Apps Complete (100%)**

---

## 📚 Documentation

- [Architecture](./ARCHITECTURE.md) - System design & data flow
- [API Reference](./API.md) - API endpoints and contracts
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment procedures
- [Setup Guide](./SETUP.md) - Development environment setup
- [Testing Guide](./TESTING_GUIDE.md) - Test strategy and execution
- [Monitoring](./docs/MONITORING.md) - Production observability
- [Disaster Recovery](./docs/DISASTER_RECOVERY.md) - Recovery procedures
- [Data Sync](./docs/DATA_SYNC.md) - Sync architecture and offline support
- [Changelog](./CHANGELOG.md) - Version history (v1.0.0 - v4.2.0)

---

## 🐳 Docker Deployment

```bash
# Build all apps
docker-compose up --build

# Individual services
docker-compose up master
docker-compose up touch
docker-compose up moneytrash
docker-compose up management
docker-compose up gallery
docker-compose up website
```

---

## 📝 License

Private - ClickFlash Photography Solutions

---

**Last Updated:** July 2026  
**Version:** 4.3.0
