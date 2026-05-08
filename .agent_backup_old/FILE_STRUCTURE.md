# ClickFlash File Structure

> **Complete file organization for all 6 apps**

## 📁 Root Directory (Organized)

```
E:\ClickFlash\
├── 📂 apps/                      # All 6 applications
│   ├── 📂 master/                # 🎛️ Master Portal (Electron + React 19)
│   ├── 📂 touch/                 # 📱 Touch Kiosk (Electron + React 19)
│   ├── 📂 moneytrash/            # 💰 Money Trash Uploader (Next.js 15)
│   ├── 📂 management/            # 📊 Management Hub (React + Vite)
│   ├── 📂 gallery/               # 🛍️ Customer Gallery (React + Vite)
│   ├── 📂 website/               # 🌐 Main Website (Next.js 15)
│   ├── 📂 mobile/                # 📱 Mobile Companion (Deferred)
│   └── 📂 delivery-app/          # 🏗️ Legacy Delivery Prototype
│
├── 📂 packages/                  # Shared packages (monorepo)
│   ├── 📂 types/                 # Shared TypeScript types
│   ├── 📂 ui/                    # Shared UI components
│   └── 📂 utils/                 # Shared utilities
│
├── 📂 tools/                     # Build & deployment tools
│   └── 📂 scripts/               # Automation scripts
│
├── 📂 deployment/                # Docker & deployment configs
│
├── 📂 docs/                      # Documentation
│
├── 📂 .agent/                    # 🤖 Agent documentation
│   ├── ARCHITECTURE.md           # System architecture
│   ├── FILE_STRUCTURE.md         # This file
│   ├── TECH_STACK.md             # Technology specifications
│   └── TODO.md                   # Active tasks
│
├── 📄 package.json               # Root workspace configuration
│                                 # Workspaces: apps/*, packages/*
├── 📄 README.md                  # Project documentation
│
└── 📄 docker-compose.yml         # Multi-app deployment
```

---

## 🔍 Key Files by App

### Master Portal (`apps/master/`)

```
apps/master/
├── data/                       # SQLite database
├── migrations/                 # Database migrations
├── src/
│   ├── main/                   # Electron main process
│   │   ├── index.ts            # Electron entry
│   │   ├── database.ts         # SQLite manager
│   │   ├── server.ts           # WebSocket server
│   │   └── window.ts           # Window manager
│   │
│   ├── renderer/               # React frontend
│   │   ├── components/
│   │   │   ├── albums/         # Album management
│   │   │   ├── devices/        # Device pairing
│   │   │   ├── events/         # Event management
│   │   │   ├── layout/         # Layout components
│   │   │   ├── modals/         # Modal dialogs
│   │   │   └── ui/             # UI primitives
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   └── shared/
│       ├── types.ts
│       └── constants.ts
│
├── tests/
│   └── e2e/                    # E2E tests (34 tests)
│
├── package.json                # v4.1.0
└── electron-builder.yml
```

---

### Touch Kiosk (`apps/touch/`)

```
apps/touch/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── modals/
│   │   ├── kiosk/              # Kiosk UI
│   │   ├── orders/             # Order management
│   │   ├── photos/             # Photo viewing
│   │   └── ui/
│   │
│   ├── services/
│   │   ├── sync/               # Sync modules
│   │   │   ├── index.ts
│   │   │   ├── connection.ts
│   │   │   ├── syncEngine.ts
│   │   │   └── uploadQueue.ts
│   │   └── pb.ts               # PocketBase client
│   │
│   ├── contexts/
│   │   └── KioskContext.tsx
│   │
│   ├── hooks/
│   ├── utils/
│   └── types/
│
├── tests/                      # E2E tests (34 tests)
├── package.json                # v4.1.0
└── electron-builder.yml
```

---

### Money Trash Uploader (`apps/moneytrash/`)

```
apps/moneytrash/
├── src/
│   └── app/
│       ├── api/
│       │   ├── health/
│       │   │   └── route.ts         # Health check
│       │   └── upload/
│       │       └── route.ts         # Upload handler
│       ├── layout.tsx
│       └── page.tsx                 # Upload UI
│
├── uploads/                    # File storage
├── package.json                # v0.1.0
└── next.config.ts
```

---

### Management Hub (`apps/management/`)

```
apps/management/
├── backend/
│   └── server.js               # Express API
│
src/
├── components/
│   ├── albums/
│   ├── bookings/               # Booking management
│   ├── common/
│   ├── customer/
│   ├── dashboard/              # Analytics dashboard
│   ├── management/             # Business management
│   ├── modals/
│   ├── orders/                 # Order processing
│   ├── photographers/
│   ├── products/
│   ├── settings/
│   └── touch/
│
├── hooks/
├── services/
├── utils/
├── App.tsx
└── main.tsx
```

---

### Customer Gallery (`apps/gallery/`)

```
apps/gallery/
├── backend/
│   └── server.js               # Express API
│
src/
├── components/
│   ├── albums/
│   ├── bookings/
│   ├── common/
│   ├── customer/               # Customer views
│   ├── dashboard/
│   ├── management/
│   ├── modals/
│   ├── orders/
│   ├── photographers/
│   ├── products/               # Product catalog
│   ├── settings/
│   └── touch/
│
├── hooks/
├── services/
├── utils/
├── App.tsx
└── main.tsx
```

---

### Main Website (`apps/website/`)

```
apps/website/
src/
├── app/
│   ├── about/
│   │   └── page.tsx
│   ├── clients/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   ├── portfolio/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx                # Landing
│   └── globals.css
│
└── components/
    ├── layout/
    │   ├── Navbar.tsx
    │   └── Footer.tsx
    ├── sections/
    │   ├── Hero.tsx
    │   ├── EcosystemSection.tsx
    │   ├── PortfolioPreview.tsx
    │   ├── ValuePropSection.tsx
    │   └── ContactSection.tsx
    └── ui/
        ├── Button.tsx
        ├── GlassPanel.tsx
        └── SectionHeader.tsx
```

---

## 📊 File Statistics

| App | Type | Files | Stack |
|-----|------|-------|-------|
| Master Portal | Desktop | 150+ | Electron/React 19 |
| Touch Kiosk | Desktop | 120+ | Electron/React 19 |
| Money Trash | Web | 20+ | Next.js 15 |
| Management Hub | Web | 100+ | React 19 + Vite |
| Customer Gallery | Web | 100+ | React 19 + Vite |
| Main Website | Web | 30+ | Next.js 15 |
| Mobile App | Native | 40+ | React Native |
| **Total** | - | **580+** | - |

---

## 📝 Configuration Files

| File | Purpose |
|------|---------|
| `package.json` (root) | Workspace configuration |
| `docker-compose.yml` | Multi-app deployment |
| `start-all.ps1` | Development startup script |
| `build_gallery_v2.bat` | Gallery build script |

---

## 🧰 Workspace Commands

```bash
# Root package.json scripts
npm run dev:master        # Start Master Portal
npm run dev:touch         # Start Touch Kiosk
npm run dev:moneytrash    # Start Money Trash Uploader
npm run dev:management    # Start Management Hub
npm run dev:gallery       # Start Customer Gallery
npm run dev:website       # Start Main Website

npm run build:master      # Build Master Portal
npm run build:touch       # Build Touch Kiosk
# ... etc

npm run install:all       # Install all dependencies
npm run clean             # Clean build artifacts
```

---

## 📦 Packages Structure (Monorepo)

```
packages/
├── types/                  # Shared TypeScript types
│   ├── src/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── enums.ts
│   └── package.json
│
├── ui/                     # Shared UI components
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
│
└── utils/                  # Shared utilities
    ├── src/
    │   ├── index.ts
    │   ├── date.ts
    │   ├── format.ts
    │   └── validation.ts
    └── package.json
```

---

## 🔧 Tools Structure

```
tools/
└── scripts/
    ├── build/                # Build scripts
    ├── deploy/               # Deployment scripts
    ├── test/                 # Test utilities
    └── migrate/              # Migration tools
```

---

## 🚀 Quick Reference

| Action | Command |
|--------|---------|
| Start all apps | `npm run install:all` then individual `dev` commands |
| Build all | `npm run build:master && npm run build:touch && ...` |
| Clean builds | `npm run clean` |
| Run tests | `npm run test:master` / `npm run test:touch` |

---

*Last Updated: 2026-01-31*
*Structure Status: ✅ Organized*
