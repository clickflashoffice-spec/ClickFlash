# Ingestion Studio UI Specification

This document outlines the design and functional requirements for the **Ingestion Studio**, a centralized area within the Management Hub where edge ingestion flows (SD cards, tethered DSLR captures, direct WebRTC streams) are monitored, verified, and manually uploaded if necessary.

## 1. Core Principles

- **Zero-Friction Hybrid Sync:** The studio must seamlessly blend photos syncing autonomously from the Edge Node (Rust/Electron) and photos manually dragged and dropped by administrators via the web interface.
- **High-Performance Grid:** Must handle thousands of thumbnails locally using virtualized rendering.
- **Immediate Feedback:** Clear progress bars for parsing, AI-culling, and uploading.

---

## 2. Component System

### 2.1 Reusable UI Primitives
- **`Dropzone`**: `@clickflash/ui` — Drag and drop target for folders and files. Must support directory-level drops for nested SD card structures (e.g., `DCIM/100CANON`).
- **`ProgressRing`**: `@clickflash/ui` — Circular progress indicator for batch parsing operations.
- **`Toast`**: `@clickflash/ui` — Success / Error notifications for completed syncs.
- **`ProgressiveImage`**: `@clickflash/ui` — Local preview rendering for raw or high-res JPEGs before they are sent to the cloud.

### 2.2 Iconography
- **Library:** [Lucide React](https://lucide.dev/)
- **Icons:** `HardDrive` (Local Storage), `CloudUpload` (Syncing), `CheckCircle2` (Ingested), `AlertTriangle` (Corrupt).

---

## 3. Layout Architecture

### 3.1 Split View (Master-Detail)

Like the Gallery Oversight UI, the Ingestion Studio relies on a persistent split view to manage sessions and inspect individual uploads.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER BAR (Ingestion Studio + Active Sync Status + Global Stats)    │
├──────────────────────┬───────────────────────────────────────────────┤
│                      │                                               │
│   INGEST SESSIONS    │       SESSION DETAIL / DROPZONE               │
│   (Master Pane)      │       (Detail Pane)                           │
│                      │                                               │
│   ┌───────────────┐  │  ┌──────────────────────────────────────────┐ │
│   │ Node: MainLobby│◄─┼─►│                                          │ │
│   │ Syncing 84%   │  │  │   [Drag & Drop Files or Folders Here]    │ │
│   ├───────────────┤  │  │                                          │ │
│   │ Node: Cabana 1│  │  ├──────────────────────────────────────────┤ │
│   ├───────────────┤  │  │ 📷 IMG_8911.JPG  [==== 100% ===] ✅      │ │
│   │ Web Upload    │  │  │ 📷 IMG_8912.JPG  [==== 45%  ===] ⏳      │ │
│   │ Completed     │  │  │ 📷 IMG_8913.JPG  [ Queued      ] ⏳      │ │
│   └───────────────┘  │  └──────────────────────────────────────────┘ │
└──────────────────────┴───────────────────────────────────────────────┘
```

### 3.2 Pane Dimensions

| Pane | Width | Constraints |
|---|---|---|
| **Master (Sessions)** | `w-[350px]` fixed | `bg-slate-950 border-r border-slate-800` |
| **Detail (Dropzone)** | `flex-1` | `bg-slate-900/50` with subtle dashed border when drag is active |

---

## 4. Header Bar & KPI Strip

### 4.1 KPIs
Positioned at the top. Displays:
- **Total Ingested (Today):** `text-emerald-400`
- **Active Edge Nodes:** Count of online Rust Edge clients.
- **Culling Rate:** % of photos dropped by the AI auto-culling engine.

---

## 5. Master Pane — Ingestion Sessions

Displays a list of currently active or recently completed ingestion sessions. 
- **Session Card:** Shows source (e.g., "Edge Node 4", "Web Browser"), status badge (`Syncing`, `Complete`, `Failed`), and photo count.
- **Hover State:** `bg-slate-800/80`
- **Selected State:** `border-l-2 border-l-blue-500 bg-slate-800`

---

## 6. Detail Pane — The Dropzone & Queue

### 6.1 Empty / Default State
When a "Web Upload" session is active or created, the center is a massive dropzone.
- **Visuals:** `border-2 border-dashed border-slate-700 rounded-3xl flex items-center justify-center`
- **Action:** Clicking opens the OS file picker.

### 6.2 Active Upload State
Once files are dropped, a virtualized list appears:
- **File Row:** Compact row showing thumbnail (if generated), filename, resolution, and upload progress.
- **Progress Bar:** `h-1.5 bg-slate-800 rounded-full` with a `bg-blue-500` fill.

## 7. Edge Cases & Resilience

1. **Duplicate Prevention:** The UI must display a warning if dropped files have identical SHA-256 hashes to already ingested files.
2. **Network Drops:** If the network drops, the queue must pause and enter an `Offline` state, resuming automatically when `navigator.onLine` returns to true.
3. **Corrupt Files:** Files that cannot be parsed are highlighted in `bg-red-950/30` with an option to discard.
