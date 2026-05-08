# Genomic Logic Registry - Phase 2 (Extraction)

## 1. Photo Processing Domain

**Core Functions**: Ingestion, Tiering, Watermarking, Thermal Throttling.

### Logic Parallelism: Python vs React/TS

| Property | Python (`photo_processor.py`) | React/TS (`photoWorker.ts`) | Divergence Notes |
| :--- | :--- | :--- | :--- |
| **Thermal Protection** | **Implements**: WMI-based monitoring. Hard pause at 88°C, throttles at 70/76/82°C. | **Omitted**. Node.js worker has no environmental awareness. | **Safety Gap**: Risk of CPU overheat during high-res batching in React version. |
| **Image Engine** | `Pillow` (PIL) | `Sharp` (libvips) | Node.js version is significantly faster due to C-level `libvips`. |
| **Edit Pipeline** | Includes `apply_edits_task` for Perspective, Straighten, and Temperature. | **Omitted**. Edit rendering logic is missing from the modern worker threads. | **Feature Gap**: High-res fulfillment cannot be completed by the React worker alone. |

---

## 2. Face Recognition Domain

**Core Functions**: Alignment, Embedding Generation, Vector Matching.

### Logic Extraction: Master Python (`face_service.py`)

- **Library**: Proprietary wrapper around `insightface` or `dlib`.
- **Logic**: Performs physical cropping of faces into a `pb_data/faces` directory for local caching.
- **Matching**: Uses `cosine_similarity` for vector lookup.

### Logic Extraction: Master React (`faceService.ts`)

- **Library**: `@vladmandic/face-api` (TensorFlow.js).
- **Logic**: Uses WASM-accelerated face detection in the Node process.
- **Gap**: Python version handles heavy detection externally; React version keeps it in-process.

---

## 3. Order Synchronisation Domain

**Core Functions**: File Watching, Conflict Resolution, Pushing to Master.

### Logic Extraction: Touch Python (`services/kiosk_sync_service.py`)

- **Mechanism**: Atomic file writes to a shared UNC path (`\\Master\orders`).
- **Protocols**: Simple JSON file-drop.

### Logic Extraction: Touch React (`backend/watcherService.ts`)

- **Mechanism**: WebSocket events + Chokidar file watching.
- **Protocol**: StarMaster Protocol (Custom headers).

---

## 4. Hardware & Security Domain (Native C++)

**Core Functions**: Path Traversal Protection, OS Signal Bridges, Printer Drivers.

### Logic Extraction: Master C++ (`OrderService.cpp`)

- **Security Logic**: Hardcoded Path Traversal Guard using `absoluteFilePath().startsWith()`. This prevents "Zip Slip" or malicious path injection from rogue Touch devices.
- **Hybrid Bridge**: Acts as a Qt-based proxy for the Node.js API on Port 8000.
- **Versioning**: Uses `DataVersionManager` for atomic state tagging across the system.

### Logic Extraction: Master C++ (`PhotoProcessor.cpp`)

- **Performance**: High-speed native processing unit (to be audited for TurboJPEG/OpenCV usage).
