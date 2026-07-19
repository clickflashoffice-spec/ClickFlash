# Bottlenecks & Scalability Report

This report analyzes the current limits of the ClickFlash ecosystem based on the deep architectural scan.

## 1. Local Network Discoverability (mDNS)

**Current State:** 
The Master App connects to Touch Kiosks over a local network using mDNS for discovery (`mdnsDiscovery.ts`).
**Bottlenecks:** 
- mDNS broadcasts are frequently blocked or dropped on heavily secured hotel or convention center networks.
- If the local router isolates client devices (Client Isolation Mode), the Kiosk will completely fail to pair with the Master App.
**Risk Level:** High
**Mitigation:** 
Implement a hybrid handshake: attempt mDNS first, but fallback to a manual IP entry or a cloud-brokered WebRTC connection to bypass local router restrictions.

## 2. Database Constraints (SQLite -> D1)

**Current State:**
The Master App relies on an encrypted local SQLite database. Data is then synced to Cloudflare D1 via the `CloudSyncOrchestrator.ts`.
**Bottlenecks:**
- While Cloudflare D1 is excellent for read-heavy edge workloads, it has strict write concurrency limits and transaction size caps.
- The `CloudSyncOrchestrator` could overwhelm D1 with massive burst writes if a Master App comes back online after a long period of offline photo ingestion.
- D1 currently lacks robust cross-region write replication (writes are routed to a primary location), which might cause latency for global operations.
**Risk Level:** Medium
**Mitigation:**
Implement write batching and queuing in the `CloudSyncOrchestrator`. For the Management App (which requires complex analytical queries), we may eventually outgrow D1 and need to migrate to a PostgreSQL instance (like Neon or Supabase) connected via Prisma/Drizzle.

## 3. Storage and Asset Delivery

**Current State:**
Assets are generated via `photoProcessor.ts` and uploaded to Cloudflare R2.
**Bottlenecks:**
- Generating high-resolution watermarked images on-the-fly via the Node backend (`server.ts` using `sharp`) can CPU-starve the server during a viral traffic spike on a gallery.
- R2 egress is free, but frequent list/read operations incur costs.
**Risk Level:** Medium
**Mitigation:**
Offload all image transformations (watermarking, resizing) to Cloudflare Image Resizing or a dedicated edge worker at the time of upload, rather than at request time. The recent Phase 4 backend hardening improved security, but moving processing to the edge will drastically improve horizontal scalability.

## 4. Electron IPC and Memory Usage

**Current State:**
The Master App uses Electron with heavy Node.js integrations (`WorkerPool.ts`, ML models).
**Bottlenecks:**
- Running multiple ML models (e.g., BlazeFace) and heavy image processing in Node/Electron can lead to massive memory bloat (V8 heap limits) and thermal throttling on older laptops used by photographers in the field.
**Risk Level:** High
**Mitigation:**
Migrate core heavy-lifting logic from Node.js to Rust (via Tauri) or C++ Native Addons. The scan revealed a `master-cpp` folder containing `.cpp` and `.h` files, indicating an attempt at this. We should accelerate the transition to native processing for performance-critical paths.
