# 🏗️ System Architecture & Deployment

> **Version:** 5.0.0 (Unified Era)  
> **Date:** February 2026

---

## 🗺️ High-Level Map

The **Star Master OS** ecosystem connects 6 specialized applications into a single global photography fulfillment workflow.

```mermaid
graph TD
    User[Customer]
    Photog[Photographer]
    Touch[Touch App (Offline Only)]
    Master[Master App (Offline First)]
    Cloud[Cloud Apps (Online Only)]

    subgraph "Local - Site A / Resort"
        Touch -->|LAN/Ethernet| Master
        Photog -->|SD Card| Master
    end

    subgraph "Global Cloud"
        Master <-->|Sync (Bridge)| Cloud
        User -->|View/Order| Cloud
    end
```

---

## 📂 Project Structure (Monorepo)

The repository uses **pnpm workspaces** to manage dependencies.

```bash
/
├── apps/
│   ├── master/          # Master App (Electron+React+Express) - Offline First (Cloud Bridge)
│   ├── touch/           # Touch App (Electron+React+Express) - 100% OFFLINE ONLY (Master Sync)
│   ├── management/      # Management Hub (Cloudflare Worker) - 100% ONLINE ONLY
│   ├── gallery/         # Customer Gallery (Cloudflare Worker) - 100% ONLINE ONLY
│   ├── website/         # Main Marketing Site (Next.js) - 100% ONLINE ONLY
│   ├── moneytrash/      # Field Uploader (Next.js) - 100% ONLINE ONLY
│   ├── delivery-app/    # Mobile Delivery App (Capacitor)
│   └── mobile/          # Legacy Mobile App (React Native) - Deprecated
├── packages/
│   ├── shared/          # Shared types, utilities, constants
│   ├── ui/              # Shared UI components (Tailwind)
│   └── config/          # Shared TS/Eslint configs
├── .agent/              # Agent Workflows & Memory
└── tools/               # Build & deployment scripts
```

---

## 🏢 The 6 Apps

### 1. 🎛️ Master App (Master Portal)

**Location:** `apps/master/`  
**Type:** Electron + React 19 Desktop App (Offline-First / Cloud Bridge)

**Role:** The centralized control unit and local data hub. It processes all incoming photos, manages local sales, and acts as the **exclusive bridge** to the Cloud Apps.

**Connectivity:**

- **Inbound:** Receives photos from photographers (SD), orders from Touch Apps (LAN).
- **Outbound:** Pushes assets to Touch Apps (LAN), syncs orders/metadata to Cloud Management Hub (Internet).
- **Fallback:** 100% functional without internet for local operations.

---

### 2. 🖥️ Touch App (Touch Kiosk)

**Location:** `apps/touch/`  
**Type:** Electron + React 19 Kiosk App (**100% OFFLINE ONLY**)

**Role:** The customer-facing sales terminal. It is restricted to local network operations only. It **never** communicates with the Cloud.

**Connectivity:**

- **Strict Requirement:** Must only connect to the Master App via LAN/Ethernet.
- **Data Source:** Fetches all photos and settings exclusively from the Master App's push folders.
- **Data Target:** Pushes orders exclusively to the Master App.

---

### 3. 💰 Money Trash Uploader

**Location:** `apps/moneytrash/`  
**Type:** Next.js 15 Web App (Cloud-Connected)

> **Photo Flow:** Customers browse low-resolution watermarked previews. Upon purchase, they receive full-resolution photos without watermarks.
> **Communication:** Connects directly to **Management Hub** and **Customer Gallery** when Master Portal is unavailable. Designed for remote/field uploads without local Master access.

**Features:**

- Manual/bulk photo uploads (drag & drop)
- Two modes: New Gallery / Order Backup
- Pricing configuration (single photo, full gallery)
- Customer email notification
- Upload history
- /api/upload and /api/health endpoints

**Stack:** Next.js 15 + React 19 + Tailwind CSS

**Status:** ✅ Complete (100%)

---

### 4. Management Hub (**ONLINE ONLY**)

**Location:** `apps/management/`  
**Type:** Cloudflare Worker + D1 Database (Cloud App)

**Role:** Centralized business management, analytics, and global configuration. Exclusive target for Master App telemetry and order sync.

---

### 5. Customer Gallery (**ONLINE ONLY**)

**Location:** `apps/gallery/`  
**Type:** Cloudflare Worker + D1 Database + R2 Storage + Stripe (Cloud App)

**Role:** Customer-facing portal for viewing purchased photos and receiving high-res downloads from R2.

---

### 6. Unified Web Platform

**Deployment:** Cloudflare Pages for the marketing website. Management Hub and Gallery are deployed as Cloudflare Workers.

| App                  | Deployment         | Technology                        |
| :------------------- | :----------------- | :-------------------------------- |
| **Main Website**     | Cloudflare Pages   | Next.js                           |
| **Management Hub**   | Cloudflare Workers | TS + D1 SQL                       |
| **Customer Gallery** | Cloudflare Workers | TS + D1 SQL + R2 Storage + Stripe |

**Status:** ✅ Deployed

---

### 🏜️ Deferred / Legacy / Out-of-Scope Apps

| App                     | Path                 | Type            | Reason                               |
| :---------------------- | :------------------- | :-------------- | :----------------------------------- |
| **Delivery Mobile App** | `apps/delivery-app/` | Ionic/Capacitor | Post-MVP. Use Web Gallery for V1.    |
| **Legacy Mobile**       | `apps/mobile/`       | React Native    | **DEPRECATED**. Replaced by PWA/Web. |

---

## 💾 Data Flow & Sync

### The "Star" Topology (Hybrid Sync)

1. **Offline Core:** Master Portal holds the "Source of Truth" for its specific location.
   - Photos are stored on local disk (NAS/SSD).
   - Database is local SQLite.

2. **Kiosk Sync (LAN):**
   - Touch Kiosks request data from Master via HTTP/WebSocket (LAN).
   - No internet required.

3. **Cloud Sync (Background):**
   - Master Portal syncs data to the cloud-hosted **Management Hub** backend workers.
   - **Uploads:** Low-res watermarked previews + JSON metadata.
   - **Downloads:** Config updates, global settings.

4. **Online Apps (Management Hub & Gallery):**
   - Each has its **own Cloudflare Worker backend** (D1 for metadata, R2 for assets).
   - They operate independently and do NOT connect to Master Portal directly.
   - Data is synced from Master to the cloud workers via authenticated HTTP API.

---

## 🔒 Security Model

| Layer           | Implementation                                        |
| :-------------- | :---------------------------------------------------- |
| **Device Auth** | JWT Handshake + Hardware ID fingerprinting            |
| **User Auth**   | Cloudflare Worker Custom Auth (Email/Pass JWT)        |
| **Kiosk Lock**  | OS Level Kiosk Mode + Keyboard strictures             |
| **Local Net**   | Signed Requests + CORS locked to Localhost/LAN ranges |
| **E2E Testing** | CSRF Protection / Rate Limiting Active                |

---

## 🚀 Deployment Strategy

### Desktop Apps (Master/Touch)

- **Builder:** Electron Builder / Forge
- **Update:** Electron Updater (Auto-update from GitHub Releases)
- **OS:** Windows 10/11 IoT Enterprise (Preferred)

### Online Apps (Management Hub, Gallery)

- **Host:** Cloudflare Workers
- **Backend:** TS Worker + D1 SQL (Per App)
- **CI/CD:** GitHub Actions -> Wrangler Deploy

### Marketing Website

- **Host:** Cloudflare Pages
- **CI/CD:** GitHub Actions -> Next.js Build -> Deploy to CF Pages
- **Domain:** `*.clickandflash.com`

---

## 📦 Versioning

- **Monorepo:** Single version policy for shared packages.
- **Apps:** Independent semantic versioning (v5.0.0).
- **Sync Protocol:** Versioned API (`/api/v1/sync`) to handle backward compatibility.
