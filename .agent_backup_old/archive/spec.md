# ClickFlash "Star Master" Requirements Specification (`spec.md`)

> **Source of Truth** for Architectural Decisions, Data Models, and Edge Cases.

---

## 1. System Identity

- **Name**: Click & Flash (Internal: "Star Master OS")
- **Core Mission**: High-volume, offline-first photography ecosystem for Resorts & Cruise Ships.
- **Key Constraint**: Must operate 100% offline (LAN/Ethernet only) for core functions.
- **Hardware Architecture**:
  - **Master PC**: i5 (4-Core), 16GB RAM, SSD.
  - **Touch PC**: i5 (4-Core), 8GB RAM, SSD.
  - **Isolation**: Master and Touch are **strictly independent apps**. There are **no shared development files** between them. Any shared logic or types must be **physically duplicated** in both codebases.
  - **Communication**: Apps communicate exclusively via **local network (Ethernet bridge)**. Photos and orders are exchanged through **pre-configured shared paths** settings that are already operational in both applications.

## 2. Architecture Overview

### 2.1 The Distributed "Desk Master" Model

- **Topology**: 100+ local "Desk Masters" (Master App) operate independently.
- **Aggregation**: A single Cloud instance ("Unified Gallery") aggregates data from all masters.
- **Identity**: Each Master has a unique `DESK_ID` (e.g., `RESORT_A_MASTER_01`) to prevent data collisions in the cloud.

### 2.2 The "Moneytrash" Mechanism (Retention)

- **Asset Tiers**:
  - `Tiny`: Grid view thumbnails (100px).
  - `Preview`: High-quality preview (1200px) with optional watermark.
  - `Original`: **CRITICAL**: The Master App always delivers the full-resolution original file for kiosk fulfillment and cloud downloads.
- **Flow**: Master processes all tiers -> Pushes `Tiny`/`Preview` for browsing -> Pushes `Original` upon Album Finalization/Order.

## 3. Data Models

### 3.1 Album (Master & Cloud)

```typescript
interface Album {
  id: string; // UUID. If from Desk, prefixed? No, relies on DeskID.
  deskId: string; // CRITICAL: Origin Desk.
  name: string;
  customerEmail?: string; // For retention marketing.
  status: 'Draft' | 'Finalized' | 'Archived';
  assets: Asset[];
}
```

### 3.2 Asset

```typescript
interface Asset {
  id: string;
  deskId: string; // CRITICAL: Origin Desk.
  fileName: string; // Original filename.
  status: 'unsold' | 'sold';
  previewUrl: string; // Watermarked if unsold.
}
```

## 4. Security & Permissions

- **Master App**:
  - `Admin`: Full access + Settings.
  - `Photographer`: Import/Edit only. No delete.
- **Cloud**:
  - `Guest`: View own album (via Token/Link).
  - `Public`: No access without link/code.

## 5. Edge Cases

- **Desk Collision**: Two desks upload album with same ID? -> Prevented by `DESK_ID` partitioning or UUID v4.
- **Offline Sync**: What if Master is offline for 7 days? -> Queue builds up. Syncs processed in FIFO order upon reconnection.
- **Re-Edit**: Customer requests edit on Cloud -> Comment synced down to Master -> Operator assumes task.

## 6. Technology Standards

- **Frontend**: React 19 (Master), Next.js 14+ (Cloud), Tailwind CSS.
- **Backend**: Node.js (Master), PocketBase (Cloud).
- **Communication**: REST for Cloud, WebSocket/Bonjour for Local (Touch). **File Transfer**: Automated pushing/fetching via dedicated network paths for photos (Master to Touch) and orders (Touch to Master).

## 7. Reliability & Idempotency

- **Transactional Integrity**: All Orders must use UUID v4. Client retries submission until Server returns `201 Created` or `409 Conflict` (success).
- **Async Isolation**: Heavy compute (Face Recognition, Image Processing) must be offloaded to Worker Threads or Child Processes.
- **Adaptive Hardware Awareness**: Uses the **Thermal Sentinel** mechanism (Ported from legacy) to throttle background workers when CPU > 75°C to preserve i5 UI fluidity.
- **Storage Abstraction**: All data access must go through a unified `IStorageAdapter` interface.
