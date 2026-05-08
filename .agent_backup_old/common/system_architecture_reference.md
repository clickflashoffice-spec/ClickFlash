# ClickFlash Ecosystem: Comprehensive Architecture Reference

**Version**: 5.2 "Architect Ultimate"
**Date**: January 24, 2026
**Status**: Production Core Stabilized / Advanced Non-Destructive Engine Implemented

---

## 1. Executive Ecosystem Map

The **ClickFlash (Star Master OS)** ecosystem is a hybrid offline/online photography platform designed for high-latency environments (Cruise Ships, Resorts, Theme Parks). It consists of **6 distinct applications** working in concert.

### The "Core Trinity" (Offline-First)

These apps operate locally on the physical site, requiring NO internet for core revenue functions.

1. **Master App** ("The Brain"): Central local command hub (Desktop). Handles non-destructive edit engine, 2K preview pipeline, and hardware control.
2. **Touch App** ("The Experience"): Strictly **OFFLINE LOCAL NETWORK** desktop app (LAN/Ethernet). Communicates with Master through an offline local infrastructure with **Zero Internet Requirement**.
3. **Hardware Service**: Decoupled IO bridge for Thermal Sentinels and High-Performance Printing.

### The "Cloud Trinity" (Online)

These apps live on the web for global access and management.

1. **Unified Gallery / Customer Gallery**: Online cloud-based storefront. Allows customers to access and download "Ready-Edited" purchased orders **anytime, anywhere** from any device.
2. **Management Hub (Online Global HQ)**:
    * **Deployment**: Online.
    * **Core Role**: Dashboard for data from all Master nodes (Revenue, performance, staff oversight).
    * **Edit Sync**: Synchronizes staff non-destructive edits (v5.2 Architect Ultimate spec) for remote visual quality control.
    * **Fulfillment**: Capable of hi-res cloud fulfillment using unified `coordinateScaler`.

---

## 2. Application Deep Dive

### 2.1 Master App (`master-app/react-new-backup`)

**"The Brain" / Desktop Command Hub**

* **Type**: Hybrid Desktop Server (Electron + Node.js)
* **Stack**: Electron, React 19, Express, Better-SQLite3, Sharp, Canvas
* **Architecture**: **Non-Destructive Metadata-First** (Manual edts happen ONLY here)

**Key Responsibilities**:

* **Ingestion**: Watches SD cards, imports into **Structured Storage**.
* **2K Preview Pipeline**: standard 2048px previews for Touch/Gallery.
* **Edit List Engine**: Retouch and style filters are stored as JSON `RetouchAction` objects.
* **Hot-Rendering Fulfillment**: "Bakes" edits into Hi-Res source during Print/Export.
* **Law 13 Compliance**: Heavy IO/CPU tasks (Fulfillment) are decoupled from the main thread to ensure zero UI lag.
* **System Audit**: Comprehensive NDJSON logging for security (Logins, Data Access) and hardware diagnostics.
* **Sync Agent**: Uploads "Ready-Edited" albums to the Cloud for customer access.

### 2.2 Touch App (`touch-app/react`)

**"The Experience" / Kiosk Client**

* **Type**: Strictly Offline Desktop App
* **Stack**: Electron, React 19, Tailwind
* **Protocol**: **Operational Law 06 (Local LAN / Ethernet Only)**
* **Network**: Communicates exclusively with Master through an offline local network. **Zero internet required.**

**Key Responsibilities**:

* **Browse**: High-performance grid viewing using 2K Previews.
* **Order Creation**: Pushes selection JSONs to the local Master Node.
* **Selection Logic**: Strictly "Dumb Client". It receives finalized or ready-for-selection photos.

---

## 3. Cross-Cutting Architectures

### 3.1 Non-Destructive Data Flow (v5.2)

| Stage | Location | Actions | Asset Type |
| :--- | :--- | :--- | :--- |
| **1. Import** | Master | Ingestion + 2K Generation + AI Indexing | RAW / Hi-Res / 2K |
| **2. Edit** | Master | Staff applies Retouch/Grades (Saves JSON metadata) | JSON Metadata |
| **3. View** | Touch/Web | Renderer applies CSS Filters + Canvas Patches on-the-fly | 2K Preview + Style |
| **4. Fulfillment** | Master | Worker Pool "bakes" JSON edits into original Hi-Res pixels | Hi-Res (Modified) |
| **5. Output** | Hardware | Prints/Zips the newly-rendered Hi-Res asset | Physical/Digital |

### 3.2 Law 13: Zero-Block IO Mandate

Heavy processing is strictly isolated from the main event loop:

* **UI Thread**: Always responsive; pulls logs and telemetry via `/api/system/diagnostics`.
* **Worker Threads**: `photoWorker.ts` handles all Sharp/Canvas/NDJSON operations.
* **Print Queue**: Managed via `HardwareService` to prevent printer blocking from crashing the API.

### 3.3 Database Strategy

* **Master**: `better-sqlite3` (Master source of truth).
* **Audit**: Rolling NDJSON logs (`audit-YYYY-MM-DD.log`).
* **Online**: Data sync via Cloud Agent; Gallery displays rendered state pushed from Master.

---

## 4. Operational Laws (Current)

1. **Law 01 (Dual-Scope)**: Explicitly confirm [Master-App] or [Touch-App] before coding.
2. **Law 06 (Touch Fetch)**: Touch only reads from its own local folder (`/local/uploads`).
3. **Law 13 (Zero-Block)**: Watermarking and fulfillment must be decoupled from the critical path.
4. **Loop Rule**: Review architecture guidelines before starting any major refactor.
