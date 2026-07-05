# ADR-005: Pivot master-cpp from Qt6 Desktop to Drogon Headless Service

> **Status:** Accepted  
> **Date:** June 14, 2026  
> **Deciders:** Principal Software Architect, Engineering Lead, C++ Engineer  
> **Affected:** master-cpp, Master Station (Electron frontend), DevOps pipeline

---

## Context

The `master-cpp` directory contains approximately 70% of a C++ port of the Master backend, including:

- 59 SQL migrations (SQLite schema)
- 50+ controller classes
- WorkerPool implementation
- ImageProcessor scaffolding
- JWT helper (JwtHelper.h)
- LAN signing module (LanSigning.h)
- CloudSyncService scaffolding
- Vector clock conflict resolution scaffolding
- Persistent write queue scaffolding

However, the project is currently built as a **Qt6 desktop application**, not an HTTP service. The Electron frontend in `apps/master/` communicates with backends via HTTP API calls (REST + WebSocket). A Qt6 desktop app cannot be consumed by the Electron frontend, creating a fundamental architectural mismatch.

### Problem Statement

The master-cpp project, as currently architected, cannot serve as a drop-in replacement for the Node.js/Express backend that the Master Station Electron app depends on. The Qt6 UI framework adds unnecessary complexity, compile-time overhead, and deployment constraints (requires display server, cannot run headless in CI or Docker).

### Goals

1. Enable the Electron frontend to switch between Node.js and C++ backends transparently
2. Maintain API compatibility (same routes, same request/response shapes)
3. Support headless deployment (CI, Docker, server environments)
4. Reuse all existing SQL migrations and database schemas
5. Achieve performance benefits of C++ (lower memory, faster photo processing)

---

## Decision

**Pivot master-cpp to a headless HTTP service using the Drogon C++ web framework.**

### Architecture

```
┌─────────────────────────────────────────┐
│         Master Station (Electron)       │
│         React 19 Frontend               │
│              Port 8090                  │
└─────────────────┬───────────────────────┘
                  │ HTTP API (same contract)
                  │
        ┌─────────┴──────────┐
        │                    │
   ┌────▼────┐          ┌────▼────┐
   │ Node.js │    OR   │ Drogon  │
   │ Express │         │  C++    │
   │ Backend │         │ Backend │
   └─────────┘          └─────────┘
        │                    │
        └─────────┬──────────┘
                  │
           ┌──────▼──────┐
           │  SQLite +   │
           │  SQLCipher  │
           └─────────────┘
```

### Technology Stack

| Component | Before (Qt6) | After (Drogon) |
|-----------|---------------|----------------|
| HTTP server | None (Qt6 app) | Drogon (built-in) |
| WebSocket | None | Drogon (built-in) |
| Database | SQLiteCpp (planned) | SQLiteCpp + SQLCipher |
| JSON parsing | QJson | nlohmann/json |
| HTTP client | QNetworkAccessManager | Drogon HTTP client |
| Threading | QThreadPool | std::thread + Drogon event loop |
| Testing | Qt Test | Catch2 |
| Build | qmake / CMake | CMake + vcpkg |
| Deployment | Desktop installer | Docker container / systemd |

### API Compatibility Strategy

The C++ backend will implement the **exact same API contract** as the Node.js backend:

- Same route paths (`/api/orders`, `/api/photos`, etc.)
- Same request/response JSON shapes
- Same HTTP status codes
- Same WebSocket event names
- Same HMAC-SHA256 LAN signing protocol
- Same JWT authentication scheme

The Electron frontend will detect which backend is running via a `/api/system/backend-type` endpoint and adjust behavior if needed (primarily for feature parity gaps during transition).

---

## Consequences

### Positive

1. **Testable in CI** — No display server required; can run in GitHub Actions, Docker containers, and headless servers
2. **Faster compilation** — Qt6 is a massive dependency; Drogon + vcpkg compiles 10x faster
3. **Docker deployment** — Can ship as a lightweight container for on-premise Enterprise customers
4. **Reuse all migrations** — The 59 SQL migrations and database schemas are backend-agnostic
5. **Performance gains** — C++ photo processing (libsharpyuv, stb) will be significantly faster than Sharp/Node.js
6. **Memory efficiency** — C++ backend uses ~10x less RAM than Node.js for equivalent throughput
7. **Transparent switching** — Frontend can switch backends without code changes

### Negative

1. **3 engineer-months of Qt6 UI work discarded** — The Qt6 desktop interface, forms, and widgets are no longer needed
2. **Learning curve** — Team must learn Drogon framework patterns (similar to Express but C++)
3. **Debugging complexity** — C++ debugging is harder than Node.js (no `console.log`, need gdb/lldb)
4. **Build time** — First vcpkg install is slow (but cached afterward)

### Neutral

1. **Node.js remains default** — C++ backend is opt-in via configuration; no forced migration
2. **Feature parity will be gradual** — 70% parity target for Q3 2026, 100% for Q4 2026
3. **Both backends coexist** — Customers can choose based on their needs (rapid iteration vs. performance)

---

## Alternatives Considered

### Alternative 1: Keep Qt6 Desktop App

**Description:** Continue building master-cpp as a Qt6 desktop application with its own UI.

**Rejected because:**
- Cannot be used by the Electron frontend (no HTTP API)
- Would require maintaining two separate Master applications (Electron + Qt6)
- Qt6 adds ~500MB to installer size
- Cannot run headless in CI or Docker
- Conflicts with the single-frontend, dual-backend architecture vision

### Alternative 2: Use Crow Framework

**Description:** Use Crow (C++ micro web framework) instead of Drogon.

**Rejected because:**
- Crow's WebSocket support is third-party and less mature
- No built-in ORM or database helpers
- Smaller community and fewer examples
- Drogon has built-in SQLite support, connection pooling, and plugin system

### Alternative 3: Use oatpp Framework

**Description:** Use oatpp (modern C++ web framework) instead of Drogon.

**Rejected because:**
- Steeper learning curve than Drogon
- More verbose code (heavy use of macros and dependency injection)
- Smaller ecosystem for SQLite and image processing
- Drogon's API is more similar to Express (familiar to team)

### Alternative 4: Abandon C++ Backend Entirely

**Description:** Delete master-cpp and focus 100% on Node.js backend.

**Rejected because:**
- Node.js photo processing (Sharp) is a memory bottleneck at scale
- Enterprise customers may require on-premise deployment with lower resource requirements
- C++ backend is a strategic differentiator for performance-critical deployments
- 70% of the work is already done; pivoting is cheaper than restarting

---

## Implementation Plan

### Week 1: Foundation
- [ ] Rewrite `CMakeLists.txt` with Drogon dependencies (vcpkg)
- [ ] Remove all Qt6 includes, headers, and UI files
- [ ] Create `main.cpp` with Drogon app initialization
- [ ] Add `/api/health` endpoint for backend detection

### Week 2: Database Layer
- [ ] Port `DatabaseManager` to SQLiteCpp + SQLCipher
- [ ] Verify all 59 migrations run correctly
- [ ] Add connection pooling (Drogon's built-in)
- [ ] Write Catch2 tests for database operations

### Week 3: Core Controllers
- [ ] Port `AuthController` (JWT validation, session management)
- [ ] Port `CollectionsController` (albums CRUD)
- [ ] Port `OrdersController` (order lifecycle)
- [ ] Verify API contract matches Node.js backend

### Week 4: LAN & Sync
- [ ] Port `LanSigning` module (HMAC-SHA256)
- [ ] Port `CloudSyncService` (15+ pipelines)
- [ ] Add WebSocket server for real-time events
- [ ] Add mDNS discovery (mjansson library)

### Week 5: Testing & Integration
- [ ] Add Catch2 unit tests for all controllers
- [ ] Add integration tests (HTTP client → C++ backend)
- [ ] Test backend switching mechanism from Electron frontend
- [ ] Performance benchmark vs. Node.js backend

---

## Feature Parity Matrix

| Feature | Express (Node.js) | Drogon (C++) | Target | Current |
|---------|-------------------|--------------|--------|---------|
| 21 API route groups | ✅ | 🟡 | 100% | ~70% |
| SQLite + SQLCipher | ✅ | 🟡 | 100% | 0% |
| HMAC-SHA256 LAN signing | ✅ | 🟡 | 100% | ~50% |
| JWT auth | ✅ | 🟡 | 100% | ~50% |
| WebSocket server | ✅ | 🟡 | 100% | 0% |
| mDNS discovery | ✅ | 🟡 | 100% | 0% |
| WorkerPool | ✅ | ✅ | 100% | 100% |
| Image processing (Sharp) | ✅ | 🟡 | 100% | 0% |
| Face detection | ✅ (TensorFlow.js) | 🟡 (OpenCV optional) | 80% | 0% |
| Cloud sync (15+ pipelines) | ✅ | 🟡 | 100% | ~30% |
| Vector clock conflict resolution | ✅ | 🟡 | 100% | ~30% |
| Persistent write queue | ✅ | 🟡 | 100% | ~30% |

**Target:** 70% parity by end of Q3 2026, 100% by end of Q4 2026.

---

## Migration Path

### For Existing Customers

No action required. The Node.js backend remains the default. The C++ backend is opt-in via:

```json
// config.json
{
  "backend": {
    "type": "node",
    "fallback": "node"
  }
}
```

To switch:

```json
{
  "backend": {
    "type": "cpp",
    "fallback": "node",
    "cppPath": "/opt/clickflash/master-cpp"
  }
}
```

### For New Enterprise Customers

Enterprise customers can choose the C++ backend for:
- Lower resource usage (embedded hardware, edge deployments)
- On-premise Kubernetes deployment
- Compliance requirements (no Node.js runtime)

---

## Related ADRs

- [ADR-001: Monorepo Structure with pnpm + Turborepo](./001-monorepo-structure.md)
- [ADR-002: Dual Backend Architecture (Node.js + C++)](./002-dual-backend.md)
- [ADR-003: Cloudflare Workers for Cloud Services](./003-cloudflare-workers.md)
- [ADR-004: SQLite Encryption with SQLCipher](./004-sqlite-encryption.md)

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-06-14 | 1.0 | ADR created and accepted |

---

*Document generated from ClickFlash Master Plan v8.0 — June 14, 2026*
