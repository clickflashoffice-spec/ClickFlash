# Master C++ (COP Master Clone) - Development Plan

**Project:** Master C++  
**Type:** Desktop Application (Qt6/C++)  
**Purpose:** Feature-parity clone of Master Portal (React/Electron) in C++  
**Target:** Q3 2026  

---

## 1. Project Overview

Create a C++/Qt6 rewrite of the Master Portal Electron application, maintaining full feature parity while improving performance and reducing dependencies.

### Scope
- Replace Electron + Node.js + React with Qt6 + C++
- Maintain identical UI/UX and business logic
- Target same platforms (Windows, macOS, Linux)

### Justification
- Reduced binary size (~50MB vs ~150MB Electron)
- Native performance
- No Node.js runtime dependency
- Smaller attack surface

---

## 2. Architecture

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Qt6 | 6.5+ |
| Language | C++23 | GCC 13 / Clang 16 / MSVC 2022 |
| Build System | CMake | 3.20+ |
| Database | SQLite | 3.44+ (Qt SQL) |
| UI | Qt Widgets + Qt Quick | Qt6 |
| HTTP | Qt Network (QNetworkAccessManager) | Built-in |
| WebSocket | QWebSocket | Built-in |
| JSON | nlohmann/json | 3.11+ |
| Logging | spdlog | 1.12+ |
| Image Processing | OpenCV | 4.8+ (optional) |

### Directory Structure

```
apps/master-cpp/
├── CMakeLists.txt              # Main build
├── cmake/
│   ├── FindQt6.cmake
│   └── BuildSettings.cmake
├── include/
│   ├── core/                  # Core utilities
│   │   ├── Logger.h/cpp
│   │   ├── Config.h/cpp
│   │   └── Exceptions.h/cpp
│   ├── database/              # SQLite layer
│   │   ├── DatabaseManager.h/cpp
│   │   ├── MigrationRunner.h/cpp
│   │   └── Models.h
│   ├── http/                  # HTTP server
│   │   ├── HttpServer.h/cpp
│   │   ├── Router.h/cpp
│   │   ├── Middleware.h
│   │   └── controllers/
│   │       ├── AuthController.h/cpp
│   │       ├── CollectionsController.h/cpp
│   │       ├── OrdersController.h/cpp
│   │       └── ...
│   ├── services/              # Business logic
│   │   ├── AuthService.h/cpp
│   │   ├── SyncService.h/cpp
│   │   ├── FulfillmentService.h/cpp
│   │   └── ...
│   ├── workers/              # Background tasks
│   │   ├── WorkerPool.h/cpp
│   │   ├── PhotoWorker.h/cpp
│   │   └── ...
│   └── ui/                    # Qt UI
│       ├── MainWindow.h/cpp
│       ├── Theme.h/cpp
│       ├── views/
│       │   ├── DashboardView.h/cpp
│       │   ├── AlbumsView.h/cpp
│       │   ├── OrdersView.h/cpp
│       │   └── ...
│       └── widgets/
│           ├── PhotoGrid.h/cpp
│           ├── OrderCard.h/cpp
│           └── ...
├── resources/
│   ├── icons/
│   ├── styles/
│   └── fonts/
├── src/
│   ├── main.cpp
│   └── Application.cpp
├── tests/
│   ├── unit/
│   └── integration/
└── scripts/
    └── build.sh
```

---

## 3. Feature Parity Checklist

### Phase 1: Core Infrastructure

| Feature | Electron (React) | C++ (Qt) | Status |
|---------|------------------|----------|--------|
| SQLite database | better-sqlite3 | Qt SQL | Todo |
| Logger | shared/logger.ts | spdlog | Todo |
| Config management | config/*.ts | QSettings + JSON | Todo |
| Exception handling | shared/exceptions.ts | Custom exception hierarchy | Todo |

### Phase 2: Backend API (Express parity)

| Route | Electron | C++ | Status |
|-------|----------|-----|--------|
| `/api/auth/*` | auth.ts | AuthController | Todo |
| `/api/collections/*` | collections.ts | CollectionsController | Todo |
| `/api/orders/*` | orders.ts | OrdersController | Todo |
| `/api/files/*` | files.ts | FilesController | Todo |
| `/api/sync/*` | sync.ts | SyncController | Todo |
| `/api/pairing/*` | pairing.ts | PairingController | Todo |
| `/api/realtime` | realtime.ts | RealtimeController | Todo |
| HMAC signing | lanSigningMiddleware | LanSigning | Todo |

### Phase 3: Frontend UI (React parity)

| View | React Component | Qt Widget | Status |
|------|-----------------|-----------|--------|
| Dashboard | Dashboard.tsx | DashboardView | Todo |
| Albums | Albums.tsx | AlbumsView | Todo |
| Album Editor | AlbumEditor.tsx | AlbumEditorView | Todo |
| Orders | OrderManagementView.tsx | OrdersView | Todo |
| Order Detail | OrderDetail.tsx | OrderDetailView | Todo |
| Photographers | Photographers.tsx | PhotographersView | Todo |
| Settings | SettingsPage.tsx | SettingsView | Todo |

### Phase 4: Integrations

| Integration | Node.js | C++ | Status |
|-------------|---------|-----|--------|
| Stripe payments | stripeService | StripeService | Todo |
| Cloud sync | cloudSyncService | CloudSyncService | Todo |
| Face detection | @tensorflow/tfjs | OpenCV DNN | Todo |
| Image processing | sharp + ImageMagick | OpenCV + ImageMagick CLI | Todo |
| mDNS/Bonjour | bonjour-service | QtBonjour / Avahi | Todo |

### Phase 5: Desktop Integration

| Feature | Electron | Qt | Status |
|---------|----------|-----|--------|
| Window management | BrowserWindow | QMainWindow | Todo |
| System tray | Electron Tray | QSystemTrayIcon | Todo |
| Notifications | Electron Notification | QSystemTrayIcon + OS native | Todo |
| Auto-updater | electron-updater | QUpdater / GitHub releases | Todo |
| Printing | window.print() | QPrinter | Todo |

---

## 4. Database Schema Parity

```sql
-- Core tables (matching Electron schema)
CREATE TABLE users (...);
CREATE TABLE albums (...);
CREATE TABLE photos (...);
CREATE TABLE orders (...);
CREATE TABLE products (...);
CREATE TABLE kiosks (...);
CREATE TABLE destinations (...);
CREATE TABLE settings (...);
CREATE TABLE session_types (...);
CREATE TABLE bookings (...);
CREATE TABLE sync_sequences (...);
CREATE TABLE operation_logs (...);
CREATE TABLE photographer_ledger (...);
```

### Migrations
- Use identical SQL files from `apps/master/backend/migrations/`
- Translation layer maps JS types to C++ types

---

## 5. API Contract Parity

### HTTP Server
- Port: 8090 (same as Electron)
- JSON API with identical request/response shapes
- Middleware chain: Auth → RateLimit → Validation → Controller

### Request/Response Format
```cpp
// Identical to Express routes
struct OrderResponse {
    QString id;
    QString clientName;
    double total;
    // ... same fields as JS
};
```

---

## 6. Security Parity

| Feature | Electron | C++ | Status |
|---------|----------|-----|--------|
| Password hashing | bcrypt | bcrypt (via cppcryptlib) | Todo |
| JWT tokens | jsonwebtoken | Custom + jwt-cpp | Todo |
| HMAC signing | crypto | QMessageAuthenticationCode | Todo |
| CSRF protection | csrf.ts | Session-based tokens | Todo |
| Rate limiting | rateLimiter.ts | QRateLimiter | Todo |
| SQL injection | parameterized queries | Qt SQL parameterized | Todo |

---

## 7. Build & Deployment

### CMake Configuration
```cmake
cmake_minimum_required(3.20)
project(ClickFlashMaster CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 REQUIRED COMPONENTS
    Core Widgets Gui Network Sql WebSockets
    PrintSupport Xml SerialPort
)

add_executable(clickflash-master
    src/main.cpp
    src/Application.cpp
    # ... sources
)

target_link_libraries(clickflash-master PRIVATE
    Qt6::Core Qt6::Widgets Qt6::Gui Qt6::Network
    Qt6::Sql Qt6::WebSockets Qt6::PrintSupport
    spdlog::spdlog nlohmann_json::nlohmann_json
)
```

### Packaging (same electron-builder structure)
- Target: Windows (.exe/.msi), macOS (.dmg), Linux (.AppImage)
- Use CPack for native installers

---

## 8. Development Timeline

### Phase 1: Q2 2026 (12 weeks)
- Core infrastructure (Logger, Config, Database)
- Basic Qt UI shell
- HTTP server foundation

### Phase 2: Q3 2026 (12 weeks)
- Full backend API parity
- Frontend views (Dashboard, Albums, Orders)
- Business logic services

### Phase 3: Q4 2026 (8 weeks)
- Complete frontend UI
- Integrations (Stripe, Cloud, Face)
- Testing and polish

### Total: ~32 weeks (8 months)

---

## 9. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Qt learning curve | Medium | Qt experts on team |
| Feature parity gaps | High | Comprehensive checklist |
| Performance issues | Medium | Profiling from day 1 |
| Timeline slip | Medium | Weekly milestones |
| Missing libraries | Low | Qt has most features built-in |

---

## 10. Team Requirements

| Role | Count | Skills |
|------|-------|--------|
| C++/Qt Developer | 2-3 | Qt6, C++23, CMake |
| UI/UX Designer | 1 | Qt stylesheets, accessibility |
| QA Engineer | 1 | Qt testing, automated tests |
| DevOps | 0.5 | CMake, packaging |

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Feature parity | 100% with Electron version |
| Binary size | <80MB (vs ~150MB Electron) |
| Startup time | <2s (vs ~5s Electron) |
| Memory usage | <150MB (vs ~300MB Electron) |
| Test coverage | >80% |

---

## 12. Existing Codebase Reference

The C++ codebase at `apps/master-cpp/` already contains:
- Qt6 project structure
- CMakeLists.txt (290 lines)
- Core infrastructure (Logger, Config, Exceptions)
- Database layer (DatabaseManager, Models)
- HTTP server (custom, not Qtractor)
- Middleware stack
- Basic UI structure

**Next Steps:**
1. Audit existing C++ code
2. Map to Electron features
3. Fill gaps per phase plan
4. Begin Phase 1 implementation

---

## Appendix: Reference Documentation

| Document | Location |
|----------|----------|
| Master Portal Audit | `artifacts/03-assessment/audit-reports/01-Master-Portal-Audit.md` |
| C++ Audit Report | `artifacts/03-assessment/audit-reports/07-Master-CPP-Audit.md` |
| Architecture Doc | `docs/ARCHITECTURE.md` |

---

**Plan Version:** 1.0  
**Date:** 2026-04-08  
**Status:** Ready for Review