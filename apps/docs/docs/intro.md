---
slug: /
sidebar_position: 1
title: Introduction
description: Overview of the ClickFlash Photography Studio Ecosystem — a 6-app platform for professional photography businesses.
---

# 📸 ClickFlash Photography Ecosystem

> **A complete 6-app platform for professional photography businesses**

[![CI](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/ci.yml/badge.svg)](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/ci.yml)
[![CD](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/cd.yml/badge.svg)](https://github.com/alaeddinekhemiri/ClickFlash/actions/workflows/cd.yml)

## 🏢 The 6-App Ecosystem

```
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
│               └──────────┐                                                  │
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

## 📁 Project Structure

```
ClickFlash/
├── 📂 apps/                    # All 6 applications
│   ├── 📂 master/              # 🎛️ Master Portal (Electron + React 19)
│   ├── 📂 touch/               # 📱 Touch Kiosk (Electron + React 19)
│   ├── 📂 moneytrash/          # 💰 Money Trash Uploader (Next.js 16)
│   ├── 📂 management/          # 📊 Management Hub (React + Vite)
│   ├── 📂 gallery/             # 🛍️ Customer Gallery (React + Vite)
│   └── 📂 website/             # 🌐 Main Website (Next.js 15)
│
├── 📂 packages/                # Shared packages
│   ├── 📂 types/               # @clickflash/types — shared TypeScript types
│   └── 📂 ui/                  # @clickflash/ui — shared UI components
│
├── 📂 scripts/                 # Operational scripts (build, deploy, rotate keys)
├── 📂 docs/                    # Production guides (monitoring, DR, data sync)
│   └── 📂 archive/             # Historical dev records (120 files)
├── 📄 package.json             # Root workspace config (pnpm workspaces)
└── 📄 README.md                # Project README
```

## 📱 Apps Overview

| App                  | Status      | Port | Stack                    |
| :------------------- | :---------- | :--- | :----------------------- |
| **Master Portal**    | ✅ Complete | 8090 | Electron + React 19      |
| **Touch Kiosk**      | ✅ Complete | 8091 | Electron + React 19      |
| **Money Trash**      | ✅ Complete | --   | Tauri + React 19         |
| **Management Hub**   | ✅ Complete | --   | CF Worker + D1           |
| **Customer Gallery** | ✅ Complete | --   | CF Worker + D1 + R2      |
| **Website**          | ✅ Active   | 3001 | Next.js 15               |

**Overall: 6/6 Apps Complete (100%)**

## 🚀 Quick Start

```bash
# Install all dependencies
npm run install:all

# Start individual apps
npm run dev:master        # Master Portal (Port 8090)
npm run dev:touch         # Touch Kiosk (Port 8091)
npm run dev:moneytrash    # Money Trash Uploader (Port 3000)
npm run dev:management    # Management Hub
npm run dev:gallery       # Customer Gallery
npm run dev:website       # Main Website (Port 3001)
```

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

## 🔒 Security Features

- **Strict Rate Limiting**: Anti-brute force protection on Login (5 req/min).
- **Zod Validation**: Strict schema enforcement for all API mutations.
- **HSTS & CSP**: Production-grade HTTP headers (Helmet).
- **Audit Logging**: Comprehensive tracking of auth and data access.

## 📚 Documentation

Explore the sidebar to learn more about:

- [Quickstart Guide](./getting-started/quickstart) — Get running in 10 minutes
- [Architecture Overview](./architecture/overview) — System design & data flow
- [API Reference](./api/reference) — REST API endpoints
- [Deployment Guide](./deployment/guide) — Production deployment
- [Contributing](./guides/contributing) — How to contribute
