# 📸 ClickFlash Photography Ecosystem

> **A complete 6-app platform for professional photography businesses**

[![CI](https://github.com/alamo/ClickFlash/actions/workflows/ci.yml/badge.svg)](https://github.com/alamo/ClickFlash/actions/workflows/ci.yml)
[![CD](https://github.com/alamo/ClickFlash/actions/workflows/cd.yml/badge.svg)](https://github.com/alamo/ClickFlash/actions/workflows/cd.yml)
[![Nightly](https://github.com/alamo/ClickFlash/actions/workflows/nightly.yml/badge.svg)](https://github.com/alamo/ClickFlash/actions/workflows/nightly.yml)

[![Master Portal](https://img.shields.io/badge/Master%20Portal-v4.2.0-blue)](./apps/master/)
[![Touch Kiosk](https://img.shields.io/badge/Touch%20Kiosk-v4.2.0-green)](./apps/touch/)
[![Money Trash](https://img.shields.io/badge/Money%20Trash-v4.2.0-yellow)](./apps/moneytrash/)
[![Management](https://img.shields.io/badge/Management-v4.2.0-purple)](./apps/management/)
[![Gallery](https://img.shields.io/badge/Gallery-v4.2.0-pink)](./apps/gallery/)
[![Website](https://img.shields.io/badge/Website-v4.2.0-orange)](./apps/website/)

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
│                   │ Cloud Sync  │                                            │
│                   └──────┬──────┘                                            │
│                          │                                                   │
│  ┌───────────────────────┼───────────────────────────────────────────────┐  │
│  │                       │              WEB APPS                         │  │
│  │  ┌────────────────────▼──────────────────────────────────────────┐   │  │
│  │  │  💰 Money Trash Uploader (apps/moneytrash/) - Next.js 16      │   │  │
│  │  │  📊 Management Hub (apps/management/) - React + Vite          │   │  │
│  │  │  🛍️ Customer Gallery (apps/gallery/) - React + Vite          │   │  │
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
├── 📂 apps/                    # All 6 applications
│   ├── 📂 master/              # 🎛️ Master Portal (Electron + React 19)
│   ├── 📂 touch/               # 📱 Touch Kiosk (Electron + React 19)
│   ├── 📂 moneytrash/          # 💰 Money Trash Uploader (Next.js 16)
│   ├── 📂 management/          # 📊 Management Hub (React + Vite)
│   ├── 📂 gallery/             # 🛍️ Customer Gallery (React + Vite)
│   └── 📂 website/             # 🌐 Main Website (Next.js 15)
│
├── 📂 packages/                # Shared packages
│   ├── 📂 types/               # Shared TypeScript types
│   ├── 📂 ui/                  # Shared UI components
│   └── 📂 utils/               # Shared utilities
│
├── 📂 tools/                   # Build & deployment tools
│   └── 📂 scripts/             # Automation scripts
│
├── 📂 deployment/              # Docker & deployment configs
├── 📂 docs/                    # Documentation
├── 📄 package.json             # Root workspace config
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
**Type:** React 19 + Vite + Express + SQLite (Cloud App)

Fully online business management dashboard deployed to the cloud. Self-contained Express backend with SQLite database.

- **Features:** Advanced analytics, 12+ management pages, payroll, reports, settings
- **Stack:** React 19 + Vite + Express + SQLite + Tailwind CSS
- **Deployment:** Docker / Cloud Run
- **Status:** ✅ Complete

```bash
npm run dev:management    # Frontend (Vite dev server)
npm start                 # Backend API (Express + SQLite)
```

---

### 5. 🛍️ Customer Gallery (100% Online)

**Location:** `apps/gallery/`  
**Type:** React 19 + Vite + Express + SQLite (Cloud App)

Fully online customer portal deployed to the cloud. Self-contained Express backend with SQLite database and Stripe integration.

- **Features:** Photo browsing, lightbox, favorites, shopping cart, Stripe payments, downloads
- **Stack:** React 19 + Vite + Express + SQLite + Stripe
- **Deployment:** Docker / Cloud Run
- **Status:** ✅ Complete

```bash
npm run dev:gallery       # Frontend (Vite dev server)
npm start                 # Backend API (Express + SQLite)
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

- `deploy_ecosystem.ps1`: Full ecosystem deployment orchestration.
- `start-all.ps1`: Starts all 6 application dev servers concurrently.
- `deploy-web.ps1`: Deploys online web apps (Management, Gallery, Website).

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

- **Money Trash Uploader** - Next.js 16 standalone
- **Management Hub** - React + Express + SQLite (own backend, cloud-deployed)
- **Customer Gallery** - React + Express + SQLite + Stripe (own backend, cloud-deployed)
- **Main Website** - Next.js 15 marketing site (Cloudflare Pages)

---

## 🛠️ Tech Stack

| Technology   | Version | Usage          |
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

| App                  | Status      | Port | Stack               |
| :------------------- | :---------- | :--- | :------------------ |
| **Master Portal**    | ✅ Complete | 8090 | Electron + React 19 |
| **Touch Kiosk**      | ✅ Complete | 8091 | Electron + React 19 |
| **Money Trash**      | ✅ Complete | 3000 | Next.js 16          |
| **Management Hub**   | ✅ Complete | 8092 | React 19 + Express  |
| **Customer Gallery** | ✅ Complete | 8093 | React 19 + Express  |
| **Website**          | ✅ Active   | 3001 | Next.js 15          |

**Overall: 6/6 Apps Complete (100%)**

---

## 📚 Documentation

- [Architecture](./.agent/ARCHITECTURE.md) - System design & data flow
- [File Structure](./.agent/FILE_STRUCTURE.md) - Directory organization
- [Tech Stack](./.agent/TECH_STACK.md) - Technology specifications
- [TODO](./.agent/TODO.md) - Active tasks & roadmap

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

**Last Updated:** February 2026  
**Version:** 4.2.0
