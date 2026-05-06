# Click & Flash: Project Ecosystem Overview

**Version:** 5.2.0 "Architect Ultimate"
**Architecture:** Distributed "Desk Master" Model with Non-Destructive Edit-List Engine
**Scale Capacity:** Managed high-resolution photography libraries exceeding **100GB**.
**Hardware Baseline:** i5 (4-Core), 16GB (Master) / 8GB (Touch) RAM.

---

## 🏗️ System Architecture

The Click & Flash ecosystem is a high-performance, event-driven photography platform for extreme-scale environments (Hotels, Resorts, Cruise Ships). It operates on a **Split-Architecture** model governed by "Mission Control" logic:

1. **Master App (Mission Control):** The central local command hub (Desktop Offline-First). Handles all core operations: ingestion, non-destructive editing, AI processing, and hardware fulfillment. Syncs "Ready-Edited" orders to the cloud.
2. **Touch App (Client Interface)::** Strictly **OFFLINE LOCAL NETWORK** desktop app (LAN/Ethernet). Communicates with Master through an offline local infrastructure with **Zero Internet Requirement**.
3. **Unified Gallery (Customer Hub):** Online cloud-based storefront. Allows customers to access and download purchased orders "anytime, anywhere" from any device.

### 4. Management Hub (Online Global HQ)

**"Global Command & Oversight"**

- **Deployment:** Online (Anytime, Anywhere).
- **Core Role:** Central hub for data from all Master nodes (Global revenue, performance, staff oversight).
- **Edit Sync:** Synchronizes staff non-destructive edits (v5.2 spec: Filter + Transform + Vignette + Retouch) for remote visual quality control.
- **Fulfillment:** Capable of hi-res cloud fulfillment using unified `coordinateScaler`.

### 🧩 Component Breakdown

#### 1. Master App (The Brain)

- **Platform:** React 19 (Frontend), Node.js (Backend), Better-SQLite3, Sharp, node-canvas.
- **Role:** The only environment where manual photo editing (Retouch, Grading) occurs. Central sync agent for cloud uploads.

#### 2. Touch App (The Experience)

- **Platform:** React 19 (Web/Kiosk), Tailwind CSS.
- **Role:** Strictly Offline client viewer for legalized/ready content. No external network connectivity allowed.

#### 3. Unified Gallery / Customer Gallery (Online)

- **Platform:** Next.js 16, PocketBase, Tailwind v4.
- **Role:** Global cloud based server app for customer access.
- **Key Features:** Secure "Anytime, Anywhere" downloading of staff-approved Hi-Res content.

#### 4. Management Hub (The HQ)

- **Platform:** React 19, Vite, Chart.js.
- **Role:** Global management tier for fleet-wide monitoring (Income/Outcome/Staff).

---

## 🔄 Data Integrity Laws (The "Loop")

1. **Absolute Separation**: Master and Touch are physical, independent copies. No shared imports.
2. **Master Authority**: **Manual editing happens ONLY in the Master App.** All other clients (Touch/Gallery) are viewers/order-generators.
3. **Law 13 (Zero-Block)**: Heavy asset generation and file IO are decoupled into worker threads.
4. **Offline Mandate**: 100% functional without internet connectivity for core revenue.

---

## 🛠️ Technical Stack (Current)

- **Frontend:** React 19 (Vite), TailwindCSS, `react-virtuoso`.
- **Backend:** Node.js (Express), `better-sqlite3`, `worker_threads`.
- **Imaging:** `Sharp` (Fast transformations), `node-canvas` (Healing/Retouch Patches).
- **Logging:** `AuditLogger` (NDJSON logging with daily rotation).
