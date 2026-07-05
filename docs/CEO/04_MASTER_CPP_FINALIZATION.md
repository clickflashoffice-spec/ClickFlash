# 04 — master-cpp Finalization Plan

> **Decision (this plan recommends):** **Pivot master-cpp from a Qt6 desktop app to a headless Drogon HTTP service.** Kill the Qt6 UI for now. Keep all 59 SQL migrations and the controller skeletons. Ship in W6 of next quarter as a Docker container for cloud-side fallback, and as a Win32 service bundled with the Master installer for the "no-Electron" tier.

> **If the team rejects the pivot and insists on Qt6:** see §6 for the alternate plan. It is doable but adds 3 engineers × 6 months.

---

## 1. The honest state of `apps/master-cpp/`

### What exists (verified in `search_files`)
- **59 SQL migrations** — `migrations/001_initial_schema.sql` … `migrations/060_performance_indexes_v3.sql`. Covers destinations, kiosks, photos, albums, orders, ledger, sync, queues. These are **the same schemas Master uses**, ported to a fresh DDL.
- **Core:** `Logger.h/.cpp`, `Config.h/.cpp`, `Exceptions.h/.cpp`
- **Database:** `DatabaseManager.h/.cpp`, `MigrationRunner.h/.cpp` (auto-runs all 59 on first boot)
- **HTTP (Qt6-based, will be replaced):** `Router`, `AuthController`, `CollectionsController`, `OrdersController`, `SyncController`, `SystemController`, `FacesController`, `CullingController`, `PairingController`, `FilesController`, `RealtimeController`, `SessionTypesController`, `MarketingController`, `LedgerController`, `AnalyticsController`
- **Services:** `AuthService`, `CollectionService`, `OrderService`, `PhotoService`, `SyncService`, `FulfillmentService`, `QueueProcessor`, `RealtimeService`, `LedgerService`, `VectorIndexService`, `CloudSyncService`
- **Workers (thread pool):** `WorkerPool`, `ThumbnailWorker`, `WatermarkWorker`, `FaceWorker`, `MLWorker`, `FolderWorker`
- **Utils:** `ImageProcessor`, `LanSigning`, `JwtHelper`, `PasswordHash`, `FileUtils`
- **UI (Qt6 Widgets, will be dropped):** `MainWindow`, `NavigationSidebar`, `View`, `Theme`, `DashboardView`, `AlbumsView`, `AlbumEditor`, `PhotoViewer`, `Filmstrip`, `OrdersView`, `OrdersBoard`, `OrderDetail`, `BookingsView`, `PhotographersView`, `ClientsView`, `SettingsView` + 8 settings tabs + 13 common components
- **CMake config:** C++23, MSVC 19.50, Qt6 (Core, Widgets, Gui, Network, Sql, PrintSupport, Xml, SerialPort, optional WebSockets, optional OpenCV, optional Boost), spdlog 1.12.0, nlohmann_json 3.11.3

### What does **not** work today
- CMake configure **fails** because Qt6 is not installed on the build host (`BUILD.md` line 38: `CMake configure: blocked — Qt6 not installed on build machine`).
- The C++ port is a **desktop app** (Qt6 Widgets), not an HTTP service. The Electron frontend cannot talk to it.
- 200+ MB Windows installer when built.

### What this means
- We have a **3-engineer-year of architecture** to throw away if we keep the Qt6 path.
- We have a **clean, port-ready backend** in C++ if we drop the UI and swap Qt6 HTTP for a real HTTP server.

---

## 2. The decision: pivot to a headless Drogon service

### Why Drogon
| Option | Why not / why yes |
|---|---|
| **Crow** | Header-only, beautiful Express-like syntax. **But** WebSocket support is third-party, async story is incomplete. |
| **Drogon** ✅ | **Built-in HTTP + WebSocket + async I/O + filters + ORM.** Best Express analogue. Tencent-maintained, 33k stars, MSVC support. |
| **Pistache** | REST-only. No WebSocket. |
| **oatpp** | Powerful but steep learning curve; Drogon's API is closer to Express. |
| **Keep Qt6 HTTP** | Stays in CMake, but Qt6's HTTP server is barely maintained; it's a *desktop* networking module, not a server. |

### Final recommended stack
| Component | Library | Why |
|---|---|---|
| HTTP + WebSocket server | **Drogon** (vcpkg) | Express-like, async, built-in WS |
| SQLite + SQLCipher | **SQLiteCpp** (vcpkg) + SQLCipher | Mature, supports custom SQLite builds |
| JSON | **nlohmann::json** (already in) | Standard, JS-like |
| Logging | **spdlog** (already in) | Fast, fmt-based |
| Image | **stb** (header-only) + **libsharpyuv** (from libwebp, vcpkg) | For thumbnail/watermark/face work, sharp-equivalent |
| Face detection | **OpenCV 4** (vcpkg, optional) | When OpenCV_FOUND, use; else degrade to upload-only |
| mDNS | **mjansson/mdns** (single C file) | Cross-platform, zero deps |
| Crypto (HMAC, JWT) | **OpenSSL** (vcpkg) | Standard, everywhere |
| Build | **CMake + vcpkg** | Microsoft-native on Windows |

### New top-level layout
```
apps/master-cpp/
├── CMakeLists.txt
├── vcpkg.json                  ← manifest of all deps
├── include/
│   ├── core/                   ← Logger, Config, Exceptions
│   ├── db/                     ← DatabaseManager, MigrationRunner, Migrations*
│   ├── http/                   ← Drogon controllers
│   ├── services/               ← Business logic (AuthService, OrderService, ...)
│   ├── workers/                ← WorkerPool, ThumbnailWorker, ...
│   ├── mdns/                   ← mjansson wrapper
│   ├── crypto/                 ← HMAC, JWT, password hash
│   └── platform/               ← Windows registry, DPAPI keychain
├── src/                        ← mirrors include/
├── migrations/                 ← the 59 SQL files (unchanged)
├── tests/                      ← Catch2 unit tests
├── docker/
│   ├── Dockerfile
│   └── docker-compose.dev.yml
├── installer/                  ← NSIS template for Windows service install
└── tools/
    ├── bench-sync.cpp          ← micro-benchmark
    └── smoke-curl.sh
```

---

## 3. The 8-step port plan (W1–W6 next quarter)

### Step 1: Rebuild CMake with Drogon (W1)
**Deliverable:** `cmake -B build` succeeds on Windows + Linux.
```cmake
# apps/master-cpp/CMakeLists.txt (REWRITE — Drogon version)
cmake_minimum_required(VERSION 3.20)
project(ClickFlashMasterService VERSION 6.0.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# vcpkg manifest mode
find_package(Drogon CONFIG REQUIRED)
find_package(SQLiteCpp CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Stb REQUIRED)
find_package(unofficial-libsharpyuv CONFIG QUIET)

# Sources
file(GLOB_RECURSE SRC CONFIGURE_DEPENDS src/*.cpp)
add_executable(${PROJECT_NAME} WIN32 ${SRC})

target_include_directories(${PROJECT_NAME} PRIVATE include)
target_link_libraries(${PROJECT_NAME} PRIVATE
    Drogon::Drogon
    SQLiteCpp::SQLiteCpp
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    OpenSSL::SSL OpenSSL::Crypto
    Stb::Stb
)

# Conditional OpenCV
find_package(OpenCV QUIET)
if(OpenCV_FOUND)
    target_link_libraries(${PROJECT_NAME} PRIVATE opencv_core opencv_objdetect opencv_imgproc)
    target_compile_definitions(${PROJECT_NAME} PRIVATE USE_OPENCV=1)
endif()

# SQLCipher
target_compile_definitions(${PROJECT_NAME} PRIVATE SQLITE_HAS_CODEC=1)
target_link_libraries(${PROJECT_NAME} PRIVATE sqlite3)

install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION bin)
```
```json
// apps/master-cpp/vcpkg.json
{
  "name": "clickflash-master",
  "version-string": "6.0.0",
  "dependencies": [
    "drogon", "sqlitecpp", "nlohmann-json", "spdlog", "openssl",
    "stb", "libsharpyuv", "sqlite3", "pugixml"
  ]
}
```

**Acceptance:** `cmake -B build -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake && cmake --build build --config Release` produces `ClickFlashMasterService.exe` < 50 MB.

### Step 2: Port DatabaseManager to Drogon coroutines + SQLCipher (W1)
**Deliverable:** All 59 migrations apply on a fresh DB; the first `SELECT 1` returns.
```cpp
// include/db/DatabaseManager.h (NEW)
#pragma once
#include <sqlite3.h>
#include <SQLiteCpp/SQLiteCpp.h>
#include <drogon/drogon.h>
#include <string>
#include <memory>
#include <mutex>

namespace cf::db {
class DatabaseManager {
public:
    // key is a 32-byte raw key (NOT the passphrase). Passphrase is PBKDF2'd at boot.
    static DatabaseManager& instance();
    drogon::Task<void> initialize(const std::string& dbPath, const std::string& rawKey);
    SQLite::Database& conn();             // throws if not initialized
    drogon::Task<void> runMigrations(const std::string& migrationsDir);
private:
    DatabaseManager() = default;
    std::unique_ptr<SQLite::Database> db_;
    std::mutex mtx_;
};
}

// include/db/MigrationRunner.h
namespace cf::db {
class MigrationRunner {
public:
    drogon::Task<void> applyAll(const std::string& dir);
private:
    drogon::Task<void> applyFile(const std::string& path);
    drogon::Task<bool> isApplied(const std::string& filename);
};
}

// src/db/DatabaseManager.cpp
drogon::Task<void> DatabaseManager::initialize(const std::string& dbPath, const std::string& rawKey) {
    // SQLCipher: PRAGMA key must be the FIRST statement after open
    db_ = std::make_unique<SQLite::Database>(dbPath, SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE);
    // Quote as blob literal for raw key
    std::string keySql = "PRAGMA key = \"x'" + rawKey + "'\"";
    db_->exec(keySql);
    // Verify
    try { db_->exec("SELECT count(*) FROM sqlite_master"); }
    catch (const SQLite::Exception& e) {
        throw std::runtime_error("Wrong SQLCipher key: " + std::string(e.what()));
    }
    // WAL + busy timeout
    db_->exec("PRAGMA journal_mode = WAL");
    db_->exec("PRAGMA synchronous = NORMAL");
    db_->exec("PRAGMA busy_timeout = 5000");
    db_->exec("PRAGMA foreign_keys = ON");
    co_return;
}
```

**Acceptance:** `tests/db/MigrationRunner.spec.cpp` opens an empty file, runs `applyAll("migrations/")`, asserts `SELECT count(*) FROM sqlite_master` > 200 (every table + index across 59 files).

### Step 3: Port the 21 Express routes to Drogon controllers (W2–W3)
**Pattern (one file per Express route group)**
```cpp
// include/http/AuthController.h
#pragma once
#include <drogon/HttpController.h>
namespace cf::http {
class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuthController::login,    "/api/auth/login",     drogon::Post);
    ADD_METHOD_TO(AuthController::logout,   "/api/auth/logout",    drogon::Post);
    ADD_METHOD_TO(AuthController::me,       "/api/auth/me",        drogon::Get,  "AuthFilter");
    METHOD_LIST_END
    drogon::Task<> login(drogon::HttpRequestPtr, std::function<void(const drogon::HttpResponsePtr&)>);
    drogon::Task<> logout(drogon::HttpRequestPtr, std::function<void(const drogon::HttpResponsePtr&)>);
    drogon::Task<> me(drogon::HttpRequestPtr, std::function<void(const drogon::HttpResponsePtr&)>);
};
}

// src/http/AuthController.cpp (excerpt — same body as master/backend/routes/auth.ts)
#include "http/AuthController.h"
#include "db/DatabaseManager.h"
#include "crypto/PasswordHash.h"
#include "crypto/JwtHelper.h"
using namespace drogon;

Task<> AuthController::login(HttpRequestPtr req, std::function<void(const HttpResponsePtr&)> cb) {
    auto body = req->getJsonObject();
    if (!body || !body->isMember("email") || !body->isMember("password")) {
        auto r = HttpResponse::newHttpJsonResponse({{"error","missing email or password"}});
        r->setStatusCode(k400BadRequest);
        return cb(r);
    }
    auto& db = DatabaseManager::instance().conn();
    SQLite::Statement q(db, "SELECT id, password_hash, role FROM users WHERE email = ? AND active = 1");
    q.bind(1, (*body)["email"].asString());
    if (!q.executeStep()) {
        auto r = HttpResponse::newHttpJsonResponse({{"error","invalid credentials"}});
        r->setStatusCode(k401Unauthorized);
        return cb(r);
    }
    std::string hash = q.getColumn(1).getString();
    if (!PasswordHash::verify((*body)["password"].asString(), hash)) {
        auto r = HttpResponse::newHttpJsonResponse({{"error","invalid credentials"}});
        r->setStatusCode(k401Unauthorized);
        return cb(r);
    }
    auto token = JwtHelper::sign({ {"sub", q.getColumn(0).getString()}, {"role", q.getColumn(2).getString()} });
    cb(HttpResponse::newHttpJsonResponse({{"token", token}}));
    co_return;
}
```

**Controllers to write:** 21 (one per Express route group). Some are trivial passthroughs; the heavy ones are `OrdersController`, `SyncController`, `FilesController`, `RealtimeController`. Estimate: 1 engineer × 2 weeks.

### Step 4: WebSocket sync engine (W3)
**Pattern — Drogon's WS handler mirrors `SyncManager` from `master/backend/services/SyncManager.ts`**
```cpp
// include/http/SyncController.h
class SyncController : public drogon::WebSocketController<SyncController> {
public:
    void handleNewMessage(const WebSocketConnectionPtr&, std::string&&, const WebSocketMessageType&) override;
    void handleNewConnection(const HttpRequestPtr&, const WebSocketConnectionPtr&) override;
    void handleConnectionClosed(const WebSocketConnectionPtr&) override;
    WS_PATH_LIST_BEGIN
    WS_PATH_ADD("/api/sync/ws");
    WS_PATH_LIST_END
};

// src/http/SyncController.cpp (excerpt)
void SyncController::handleNewConnection(const HttpRequestPtr& req, const WebSocketConnectionPtr& conn) {
    // Verify HMAC challenge in the upgrade request
    auto sig = req->getHeader("x-signature");
    auto ts  = req->getHeader("x-timestamp");
    auto id  = req->getHeader("x-kiosk-id");
    if (!LanSigning::verify(id, ts, sig, conn->peerAddr().toIp())) {
        conn->shutdown();   // reject
        return;
    }
    SyncManager::instance().registerClient(id, conn);
}

void SyncController::handleNewMessage(const WebSocketConnectionPtr& conn, std::string&& msg, const WebSocketMessageType& type) {
    auto payload = nlohmann::json::parse(msg);
    SyncManager::instance().onMessage(conn, payload);   // vector clock + idempotency
}
```

### Step 5: Photo pipeline (W4)
**Pattern — stb + libsharpyuv for sharp-equivalent quality**
```cpp
// src/utils/ImageProcessor.cpp
#include "stb_image.h"
#include "stb_image_resize2.h"
#include "stb_image_write.h"
#include <sharpyuv/sharpyuv.h>
#include <span>
namespace cf::img {
struct Decoded { int w, h, channels; std::vector<uint8_t> pixels; };

Decoded read(const std::filesystem::path& p) {
    Decoded d;
    d.pixels.resize(std::filesystem::file_size(p));
    auto* ptr = stbi_load(p.string().c_str(), &d.w, &d.h, &d.channels, 0);
    if (!ptr) throw std::runtime_error("stbi_load failed");
    d.pixels.assign(ptr, ptr + (d.w * d.h * d.channels));
    stbi_image_free(ptr);
    return d;
}

void writeThumbnail(const Decoded& src, const std::filesystem::path& dst, int maxSide = 200) {
    int tw = src.w > src.h ? maxSide : int(src.w * maxSide / src.h);
    int th = src.h > src.w ? maxSide : int(src.h * maxSide / src.w);
    std::vector<uint8_t> out(tw * th * src.channels);
    stbir_resize(src.pixels.data(), src.w, src.h, 0,
                 out.data(), tw, th, 0, (stbir_pixel_layout)src.channels);
    stbi_write_jpg(dst.string().c_str(), tw, th, src.channels, out.data(), 85);
}
}
```

### Step 6: mDNS + LAN signing (W5)
```cpp
// src/mdns/MasterAdvertiser.cpp — wraps mjansson/mdns
#include "mdns.h"
void advertise(const std::string& deskId, const std::string& tenantId, uint16_t port) {
    mdns_daemon_t* d = mdns_daemon_create();
    mdns_record_t record;
    mdns_daemon_register(d, &record, MDNS_ENTRYTYPE_SERVICE,
        "clickflash-master", "_clickflash-master._tcp.local", nullptr, nullptr,
        port, {{"desk_id", deskId}, {"tenant_id", tenantId}, {"version", "6.0.0"}}, 0);
    mdns_daemon_announce(d);
}
```

### Step 7: Ship as Docker (W5) and Win32 service (W6)
**Dockerfile (cloud-side fallback for the cloud sync path)**
```dockerfile
# apps/master-cpp/docker/Dockerfile
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y libsqlite3-0 libssl3 libstdc++6 && rm -rf /var/lib/apt/lists/*
COPY build/ClickFlashMasterService /usr/local/bin/
COPY migrations /opt/clickflash/migrations
EXPOSE 8090
ENTRYPOINT ["/usr/local/bin/ClickFlashMasterService", "--config", "/etc/clickflash/config.json"]
```

**Win32 service install** (no UI, runs alongside the Electron Master as a high-availability shadow)
```cpp
// src/platform/Win32Service.cpp (excerpt, uses Qt-free plain Win32)
SERVICE_TABLE_ENTRY ServiceTable[] = {
    { (LPWSTR)L"ClickFlashMasterService", (LPSERVICE_MAIN_FUNCTION)ServiceMain },
    { NULL, NULL }
};
void ServiceMain(DWORD argc, LPWSTR* argv) {
    // Report status to SCM, start HTTP server, log to file
    startServer("C:\\ProgramData\\ClickFlash\\master.db");
    SetServiceStatus(hStatus, &SERVICE_STATUS{ .dwCurrentState = SERVICE_RUNNING });
}
```

### Step 8: CI + first real install (W6)
- GitHub Actions matrix: `windows-2022`, `ubuntu-24.04`, `macos-14`.
- A "Master shadow" smoke test: spin up the container + Electron Master, push a sync mutation, verify it lands in Drogon's DB.

---

## 4. Why we keep this and kill the Qt6 UI

- We **reuse the 59 SQL migrations verbatim** — no schema fork.
- We **reuse the controller skeletons** — most logic is in the SQLite query, which ported 1:1.
- We **build a shadow service** that the Electron Master can hot-failover to (mDNS, sync, photo processing). The Electron app stays the customer-facing UI; the C++ service is the durable worker.
- We **don't lose 3 engineer-quarters of work** — only the 4–6 weeks of Qt6 UI code, which we already have in the React/TS frontend.

---

## 5. The Docker use case (the real reason to keep master-cpp)

A "Master shadow" in the cloud:
- Runs the same Drogon service in a Cloudflare container (or Fly.io / Railway / a customer's own VM).
- Subscribes to the same `operation_logs` from the Hub.
- Re-runs all heavy image work (thumbnails, watermarks, face detection, EXIF strip) server-side, offloading it from the local Master.
- Gives the customer a "sync to our private cloud, not just Cloudflare" story for compliance-sensitive enterprise.

---

## 6. Alternate plan: keep the Qt6 UI (NOT recommended)

If the team insists on Qt6, the path is:
- 1 engineer × 1 week: install Qt6 + dependencies, get CMake green on Windows.
- 1 engineer × 4 weeks: complete the ~50 UI files (currently 50% scaffolded — only `.h` files exist for some, only `.cpp` for others).
- 1 engineer × 2 weeks: wire the Qt6 HTTP server to the controllers (replace the stub `HttpServer.cpp`).
- 1 engineer × 4 weeks: parity testing against the TS Master.
- Result: 200 MB Windows installer, 3 engineer-quarters, **delivered in 6 months**, still need to build a separate "no UI" service for the cloud.

This is a worse outcome. We are not doing it.

---

## 7. Acceptance for "master-cpp done"

- [ ] `cmake -B build` succeeds on Windows + Linux + macOS.
- [ ] All 59 SQL migrations apply on a fresh DB.
- [ ] All 21 route groups have C++ equivalents with **the same request/response shapes** as the TS Master.
- [ ] CloudSyncService runs the same 15+ pipelines.
- [ ] WebSocket sync roundtrip with the TS Touch works end-to-end.
- [ ] SQLite is SQLCipher-encrypted at rest by default.
- [ ] Docker image builds, runs, and serves `/api/health` in < 2 seconds.
- [ ] Win32 service installs with `sc create ClickFlashMasterService binPath= "C:\Program Files\ClickFlash\ClickFlashMasterService.exe"`.
- [ ] C++ service passes the same Playwright E2E suite that the TS Master passes (with a `CF_BACKEND=cpp` env switch).
- [ ] C++ service uses < 200 MB RAM idle, < 1 CPU second per 100 photos processed.

---

*End of master-cpp plan — proceed to file 05.*
