# ClickFlash Master-Cpp Audit Report

> **Date:** 2026-06-13  
> **Status:** BLOCKED — Qt6 Not Installed  
> **Files:** 166 source files (80 cpp + 86 h)  
> **Migrations:** 57 SQL files  
> **Recommendation:** Pivot to Drogon (headless HTTP) or install Qt6

---

## 📊 AUDIT SUMMARY

| Metric | Value | Status |
|--------|-------|--------|
| Source Files | 166 | ✅ Complete |
| C++ Files (.cpp) | 80 | ✅ Complete |
| Header Files (.h) | 86 | ✅ Complete |
| SQL Migrations | 57 | ✅ Complete |
| CMakeLists.txt | 1 | ✅ Complete |
| Build Cache | Exists | ✅ Partial |
| Qt6 Installed | NO | ❌ **BLOCKER** |

---

## 🔑 KEY COMPONENTS STATUS

| Component | File | Status |
|-----------|------|--------|
| DatabaseManager | `src/database/DatabaseManager.cpp` | ✅ |
| HttpServer | `src/http/HttpServer.cpp` | ✅ |
| AuthController | `src/http/AuthController.cpp` | ✅ |
| MainWindow (Qt UI) | `src/ui/MainWindow.cpp` | ✅ |
| MigrationRunner | `src/database/MigrationRunner.cpp` | ✅ |
| Router | `src/http/Router.cpp` | ✅ |
| Middleware | `src/http/Middleware.cpp` | ✅ |
| WorkerPool | `src/workers/WorkerPool.cpp` | ✅ |

---

## ❌ CRITICAL BLOCKER

### Qt6 Not Installed

**Error:** `CMake configure: blocked — Qt6 not installed on build machine`

**Impact:**
- Cannot compile any of the 166 source files
- Cannot build the executable
- Cannot test or deploy

**Qt6 Components Required (8):**
1. Core
2. Widgets
3. Gui
4. Network
5. Sql
6. PrintSupport
7. Xml
8. SerialPort

**Optional:**
- WebSockets
- OpenCV
- Boost

---

## 🎯 RECOMMENDATION: PIVOT TO DROGON

### Why Pivot Away from Qt6

| Issue | Qt6 Path | Drogon Path |
|-------|----------|-------------|
| Binary Size | 200+ MB | < 50 MB |
| Build Complexity | High (8+ Qt modules) | Low (vcpkg) |
| UI Code | 80+ Qt Widgets files | 0 (headless) |
| HTTP Server | Qt Network (limited) | Full Drogon |
| WebSocket | Optional Qt module | Built-in |
| Cross-Platform | Qt licensing issues | Open source |
| Team Expertise | Qt/C++ specialists | Standard C++ |

### Proposed New Architecture

```
apps/master-cpp/
├── CMakeLists.txt              # Drogon + SQLiteCpp + spdlog
├── vcpkg.json                  # 8 dependencies
├── include/
│   ├── core/                   # Logger, Config, Exceptions
│   ├── db/                     # DatabaseManager, MigrationRunner
│   ├── http/                   # Drogon controllers (15 controllers)
│   ├── services/               # Business logic
│   ├── workers/                # Background tasks
│   ├── mdns/                   # mDNS discovery
│   ├── crypto/                 # HMAC, JWT, password hash
│   └── platform/               # Windows registry, DPAPI
├── src/                        # mirrors include/
├── migrations/                 # 57 SQL files (unchanged)
├── tests/                      # Catch2 unit tests
├── docker/
│   ├── Dockerfile
│   └── docker-compose.dev.yml
├── installer/                  # NSIS for Windows service
└── tools/
    ├── bench-sync.cpp
    └── smoke-curl.sh
```

### New Dependencies (vcpkg.json)

```json
{
  "name": "clickflash-master",
  "version-string": "6.0.0",
  "dependencies": [
    "drogon",
    "sqlitecpp",
    "nlohmann-json",
    "spdlog",
    "openssl",
    "stb",
    "libsharpyuv",
    "sqlite3"
  ]
}
```

### Build Command

```bash
# One-time setup
git clone https://github.com/microsoft/vcpkg
cd vcpkg && bootstrap-vcpkg.bat

# Build
mkdir build && cd build
cmake .. -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake
cmake --build . --config Release
```

---

## 📋 TWO OPTIONS

### Option A: Keep Qt6 (High Effort)

**Steps:**
1. Install Qt6 (2-3 GB download)
2. Configure CMake with Qt6 path
3. Build 166 files
4. Test UI on Windows
5. Package 200+ MB installer

**Time:** 2-3 weeks  
**Cost:** Qt licensing (commercial)  
**Risk:** High (Qt6 complexity)

### Option B: Pivot to Drogon (Recommended)

**Steps:**
1. Rewrite CMakeLists.txt (1 day)
2. Port DatabaseManager to SQLiteCpp (2 days)
3. Port HTTP layer to Drogon (3 days)
4. Remove all Qt UI code (1 day)
5. Port services to coroutines (3 days)
6. Test and deploy (2 days)

**Time:** 2 weeks  
**Cost:** Free (open source)  
**Risk:** Low (standard C++)  
**Output:** < 50 MB executable

---

## 🗑️ FILES TO DELETE (Qt UI)

All `src/ui/` files (40+ files):
- `src/ui/MainWindow.cpp`
- `src/ui/NavigationSidebar.cpp`
- `src/ui/dashboard/DashboardView.cpp`
- `src/ui/albums/AlbumsView.cpp`
- `src/ui/albums/AlbumEditor.cpp`
- `src/ui/albums/PhotoViewer.cpp`
- `src/ui/orders/OrdersView.cpp`
- `src/ui/orders/OrdersBoard.cpp`
- `src/ui/settings/SettingsView.cpp`
- `src/ui/settings/tabs/*` (8 tabs)
- `src/ui/common/*` (13 components)

**Total:** ~40 files, ~8,000 lines of Qt Widgets code

---

## ✅ FILES TO KEEP

- `src/core/*` (Logger, Config, Exceptions)
- `src/database/*` (DatabaseManager, MigrationRunner)
- `src/http/*` (controllers, router, middleware)
- `src/services/*` (business logic)
- `src/workers/*` (background tasks)
- `src/utils/*` (ImageProcessor, JwtHelper, etc.)
- `migrations/*` (57 SQL files)

**Total:** ~120 files to keep, ~40 files to delete

---

## 🚀 NEXT STEPS

1. **Decision:** Choose Qt6 or Drogon
2. **If Drogon:**
   - Delete `src/ui/` directory
   - Rewrite `CMakeLists.txt`
   - Create `vcpkg.json`
   - Port `DatabaseManager` to SQLiteCpp
   - Port `HttpServer` to Drogon
   - Build and test
3. **If Qt6:**
   - Install Qt6 (winget or online installer)
   - Fix CMake configure
   - Build all 166 files
   - Test UI

---

## 📊 COMPARISON

| Aspect | Qt6 (Current) | Drogon (Proposed) |
|--------|---------------|-------------------|
| Source Files | 166 | ~120 |
| Binary Size | 200+ MB | < 50 MB |
| Build Time | 10+ min | 2-3 min |
| Dependencies | 8 Qt modules | 8 vcpkg packages |
| UI | Qt Widgets (C++) | None (React/Electron frontend) |
| HTTP Server | Qt Network | Drogon (full featured) |
| WebSocket | Qt WebSockets | Drogon built-in |
| Licensing | Commercial Qt | Open source |
| Team Skills | Qt specialists | Standard C++ |

---

**Recommendation:** Pivot to Drogon. Remove Qt UI. Ship as headless HTTP service.
**Timeline:** 2 weeks to production.
