# ClickFlash Ecosystem — Operations & Deployment Runbook
**Target Environment**: Resort On-Premises Master Node, Edge Kiosks & Cloud Backend  
**Revision Date**: October 3, 2026

---

## 1. System Requirements & Toolchain Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS)
- **Package Manager**: `pnpm@10.28.1`
- **Rust Toolchain**: `rustc` / `cargo` (with `wasm32-unknown-unknown` target for WebAssembly builds)
- **Python**: `Python 3.10+` (with `uvicorn`, `fastapi`, `numpy`, `torch` for AI Worker)
- **Database Engine**: SQLite 3 with SQLCipher / `better-sqlite3-multiple-ciphers` on on-premises nodes; Cloudflare D1 on cloud endpoints.

---

## 2. Monorepo Setup & Installation

Clone and install dependencies at monorepo root:
```bash
# Clone the repository
git clone https://github.com/ClickFlash/ClickFlash.git
cd ClickFlash

# Install monorepo dependencies
pnpm install

# Verify type safety across all 14 workspaces
pnpm run typecheck:all
```

---

## 3. Environment Variables Configuration

Copy `.env.example` configurations to target locations:

### Master Node (`apps/desktop/master/.env`)
```ini
NODE_ENV=production
PORT=8090
MASTER_PORT=8090
DB_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
JWT_SECRET=clickflash_secure_jwt_secret_change_in_production
RATE_LIMIT_MAX_REQUESTS=200
AI_WORKER_URL=http://127.0.0.1:8000
SYNC_PORT=8091
STORAGE_ROOT=./storage/photos
REDIS_URL=redis://127.0.0.1:6379
```

### Cloud Backend (`apps/backend/cloud-backend/.dev.vars` / Wrangler Secrets)
```ini
ENVIRONMENT=production
UPSTASH_REDIS_REST_URL=https://your-upstash-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
RESEND_API_KEY=re_your_resend_api_key
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_system_access_token
WHATSAPP_VERIFY_TOKEN=your_whatsapp_webhook_verify_token
WHATSAPP_APP_SECRET=your_meta_app_secret
```

---

## 4. Database Migrations

### On-Premises Master Node (SQLite / SQLCipher)
Database migrations are applied idempotently on master server startup via `DatabaseManager`:
```bash
# Run manual migration check or seeding
pnpm --filter clickflash-master run provision
```

### Cloud Backend (Cloudflare D1)
Apply D1 migrations using Drizzle / Wrangler:
```bash
cd apps/backend/cloud-backend

# Generate migrations from schemas
pnpm exec drizzle-kit generate

# Apply migrations locally
pnpm exec wrangler d1 migrations apply clickflash-d1 --local

# Apply migrations to production Cloudflare D1
pnpm exec wrangler d1 migrations apply clickflash-d1 --remote
```

---

## 5. Development Execution

Launch individual components during development:

```bash
# Master Node Backend
pnpm --filter clickflash-master run dev:backend

# Master Node Full (Backend + Electron Shell)
pnpm run dev:master:electron

# Touch Kiosk (Backend + Electron Shell)
pnpm run dev:touch:electron

# Management Hub Web Portal
pnpm run dev:management

# Customer Web Gallery
pnpm run dev:gallery

# Self-Service Kiosk Web Interface
pnpm run dev:self-service

# Python AI Sentinel Worker
cd apps/backend/ai-worker && uvicorn main:app --reload --port 8000
```

---

## 6. Production Packaging & Build Commands

Execute production compilation and bundling:

```bash
# 1. Build All Web Applications & Packages
pnpm run build:all

# 2. Package Windows Installer Executable
pnpm --filter clickflash-installer run package:installer
# Output: apps/desktop/installer/release/win-unpacked/ClickFlash Studio Setup.exe

# 3. Package Touch Kiosk Executable
pnpm --filter clickflash-touch run package
# Output: apps/desktop/touch/release/win-unpacked/ClickFlash - Touch Kiosk.exe

# 4. Build Master Node Backend Bundle
pnpm --filter clickflash-master run build:backend
# Output: apps/desktop/master/dist/backend/server.js

# 5. Build License Generator
pnpm --filter clickflash-license-generator run build
# Output: apps/desktop/license-generator/dist/

# 6. Deploy Cloudflare Workers Backend
cd apps/backend/cloud-backend && pnpm run deploy
```

---

## 7. Operational Health Checks & Diagnostics

Verify system health and automated invariants:

```bash
# Fast Verification Suite (Security Guards, Packages, Rust Core)
pnpm run test:fast

# Master OS Route Tests (Orders, Hardware, Concession, Health)
pnpm --filter clickflash-master test -- backend/routes/__tests__/

# Synthetic Peak Resort Load Simulation (5,000 photos, 20 burst cameras, 5 kiosks)
npx tsx scripts/synthetic_peak_resort_load_test.ts

# Monorepo Wide TypeScript Compilation
pnpm run typecheck:all
```
