# Star Master OS - Ultimate File Census (Phase 1)

## Master App [e:\ClickFlash\master-app]

### 1. Python Implementation [master-app/python]

- **Entrypoints**:
  - `START_MASTER.bat`: Local launcher.
  - `backend/main.py`: Main Flask/FastAPI server logic.
- **Core Logic (backend/services)**:
  - `ai_culling_service.py`: Automated sharpness/blink detection.
  - `face_service.py`: Face recognition indexing logic.
  - `photo_processor.py`: Watermarking and resolution tiering.
  - `sync_service.py`: Local to Cloud synchronization logic.
  - `order_watcher.py`: File-system monitor for Touch App orders.
- **Data Layer**:
  - `database.py`: SQLite connection and utility functions.
  - `models.py`: Python-based data schemas.
- **Infrastructure**:
  - `requirements.txt`: Python dependency list.
  - `installer_master.nsi`: NSIS installer script for Windows.

### 2. C++ Implementation [master-app/cpp]

- **Build Core**:
  - `CMakeLists.txt`: Build configuration.
  - `Build.bat`: Compilation script.
- **Logic (src/services)**:
  - `PhotoProcessor.cpp`: Native performance watermarking/resizing.
  - `FaceRecognition.cpp`: Native OpenCV/TensorFlow-Lite integration.
  - `OrderService.cpp`: Native Order management and terminal printing.
  - `SyncService.cpp`: High-speed binary sync protocol.
- **UI Core (src/ui)**:
  - Qt-based interface files (.cpp / .h).

### 3. React/TypeScript (Modern) [master-app/react-new]

- **Main App**:
  - `electron-main.js`: Electron wrapper and OS integration.
  - `backend/server.ts`: Modern Node.js orchestrator (Port 8090).
- **Services (backend/services)**:
  - `photoWorker.ts`: Multi-threaded photo processing (Sharp library).
  - `faceService.ts`: Web-based face API integration (@vladmandic/face-api).
  - `cloudSyncService.ts`: PocketBase/SupaBase sync bridge.
- **Frontend (src)**:
  - `main.tsx`: React entry point.
  - `components/modals/OrderEditModal.tsx`: Core order editing logic.

---

## Touch App [e:\ClickFlash\touch-app]

### 1. Python Implementation [touch-app/python]

- **Entrypoints**:
  - `START_TOUCH.bat`: Local launcher.
  - `backend/main.py`: Kiosk server.
- **Logic**:
  - `services/kiosk_sync_service.py`: Pushing orders to Master shared path.
  - `services/face_search.py`: Local selfie matching.

### 2. C++ Implementation [touch-app/cpp]

- **Logic (src/services)**:
  - `OrderExport.cpp`: Pushing orders to Master via secure Ethernet bridge.
  - `KioskManager.cpp`: Full-screen kiosk lifecycle management.

### 3. React/TypeScript [touch-app/react]

- **App**:
  - `src/main.tsx`: Guest interface entry point.
  - `backend/watcherService.ts`: Real-time updates from Master.

---

## Web Ecosystem [e:\ClickFlash\web]

### 1. Management Portal [web/management]

- **Role**: Cloud Admin / Fleet Management.
- **Core Components**:
  - `src/components/management/PerformancePage.tsx`: Data analytics.
  - `src/components/management/PayrollPage.tsx`: Salary/Commission engine.

### 2. Customer Gallery [web/customer-gallery]

- **Role**: Guest access and E-commerce.
- **Core components**:
  - `src/services/apiService.ts`: Cloud data fetching.
  - `src/components/GalleryView.tsx`: High-performance grid.

### 3. PixieSet Clone [web/pixieset-clone]

- **Role**: Brand Builder & CRM.
- **Core components**:
  - `src/app/dashboard/galleries/[id]/CollectionEditorClient.tsx`: High-end collection management.
  - `src/db/schema.sql`: Full Supabase relational schema.
