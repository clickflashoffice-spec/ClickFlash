# Ultimate Ecosystem Audit & Reconstruction Spec (v2.0)

## 0. The Mandate

Perform a 100% granular deep dive into all versions and languages. **Constraint**: Analysis only; zero code changes allowed at this stage.

---

## I. The Cross-Stack Language Matrix

**Goal**: Audit the same logic across different tech stacks to ensure 100% parity.

### 1. Python Audit (The Native Logic)

- **Directories**: `master-app/python`, `touch-app/python`.
- **Core Vector**:
  - Audit AI processing scripts (OpenCV integration).
  - Deconstruct the `PORT_CONFIG.md` and native socket servers.
  - Map legacy database structures used in the Python versions.

### 2. C++ Audit (The Performance / Hardware Layer)

- **Directories**: `master-app/cpp`, `touch-app/cpp`.
- **Core Vector**:
  - Review `OrderService.cpp` for hardware-level ordering logic.
  - Audit printer drivers and SD card detection mechanisms.
  - Inspect `Config.cpp` for native environment settings.

### 3. React/TypeScript Audit (The Modern Ecosystem)

- **Directories**: `master-app/react-new`, `touch-app/react`, `web/*`.
- **Core Vector**:
  - Deconstruct the Node.js worker threads in `photoWorker.ts`.
  - Audit the `vite.config` and `electron-main` bridges.
  - Review the Supabase/PocketBase sync logic in `CloudSyncService.tsx`.

---

## II. Version Parity Audit (Divergence Mapping)

**Goal**: Identify what was lost or modified between versions.

### 1. Master App Versions

- **Legacy Backup**: `master-app/react_legacy_backup`.
- **Locked Stable**: `master-app/react_locked`.
- **Modern Hub**: `master-app/react-new`.
- **Audit Task**: Compare how `Order` creation differs between these 3 tiers.

### 2. Touch App Versions

- **Python Kiosk**: The original operational version.
- **React Kiosk**: The modern web-view version.
- **Audit Task**: Verify if "Face Search" reliability matches between Python (Native) and React (tfjs).

---

## III. Mechanism Deep Dive (No-Code Discovery)

1. **Sync Pathing**: Map the physical file paths used by Python vs React for `local/uploads` and `local/orders`.
2. **Face Recog DNA**: Compare the Python face detection sensitivity/parameters against the `@vladmandic/face-api` settings in React.
3. **Database Schema Collision**: Verify if the SQLite tables in Master-App (React) are compatible with the data structures used in the C++ apps.

---

## IV. Execution Roadmap (NO-CODE)

1. **Census**: Catalog every file in all languages (Master/Touch/Web).
2. **Comparison**: Create a functional matrix comparing Python, C++, and React logic blocks.
3. **Discovery**: Document hidden dependencies in the C++ `lib` and Python `requirements`.
4. **Final Blueprint**: The "Source of Truth" document encompassing all languages and versions.
