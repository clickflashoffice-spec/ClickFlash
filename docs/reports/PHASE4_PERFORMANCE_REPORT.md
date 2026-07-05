# Phase 4: Performance Tests Report

## 1. Benchmark Script Execution

**Script**: `apps/master-cpp/tools/benchmark.py`
**Target**: `http://localhost:8090` (Master Backend)
**Configuration**: 10 concurrent requests, 100 requests per endpoint

### Results Summary

| Endpoint | Method | Requests | Successful | Failed | RPS | Avg (ms) | P95 (ms) | P99 (ms) |
|----------|--------|----------|------------|--------|-----|----------|----------|----------|
| `/api/health` | GET | 100 | 100 | 0 | 27.6 | 347.65 | 816.39 | 833.73 |
| `/api/auth/login` | POST | 50 | 0 | 50 | 29.7 | 311.54 | 442.05 | 470.24 |
| `/api/collections/destinations` | GET | 100 | 0 | 100 | 24.7 | 331.28 | 426.44 | 1,308.20 |
| `/api/orders` | GET | 100 | 0 | 100 | 32.3 | 296.91 | 388.79 | 439.89 |
| `/api/sync/status` | GET | 100 | 0 | 100 | 25.8 | 371.90 | 1,080.60 | 1,089.66 |

**Total**: 450 requests, 100 successful (22.2%), 350 failed (77.8%)
**Average RPS**: 28.0

### Analysis
- **Health Endpoint**: 100% success rate, averaging ~348ms per request. This is the only unauthenticated public endpoint tested.
- **Protected Endpoints**: All failed with `AUTHENTICATION_ERROR` (expected behavior — these endpoints require valid JWT/session tokens).
- **Bug Fix**: The benchmark script had a Python scoping bug (`UnboundLocalError` for `successful`/`failed` variables inside the nested async function). Fixed by adding `nonlocal successful, failed` declaration.

---

## 2. Master Backend Performance Configurations (`apps/master/backend/server.ts`)

### Server Settings
| Setting | Value | Location |
|---------|-------|----------|
| Port | 8090 (env: `BACKEND_PORT`) | `config/constants.ts` |
| Body Parser Limit | 50 MB | `server.ts` (json + urlencoded) |
| Protocol | HTTP/HTTPS (TLS configurable) | `config/constants.ts` |

### Rate Limiting (`shared/rateLimiter.ts`)
| Limiter | Requests/Window | Window |
|---------|-----------------|--------|
| Default (IP-based) | 100 | 60 seconds |
| Strict (auth endpoints) | 5 | 60 seconds |
| User-based (authenticated) | 200 | 60 seconds |

### Background Services & Intervals
| Service | Interval | Purpose |
|---------|----------|---------|
| ResourceMonitor | 30,000 ms | CPU/memory/disk monitoring |
| Metrics Broadcast (SSE) | 5,000 ms | Real-time metrics streaming |
| MaintenancePoller | 60,000 ms | Pull admin commands from Hub |
| Cleanup (rate limiters) | 60,000 ms | Expire stale IP/user counters |

### Worker Pools
| Pool | Max Workers | Purpose |
|------|-------------|---------|
| PhotoProcessor | 4 | Image resizing/thumbnail generation |
| ML Pool | (inherited) | Face detection/indexing |
| FaceIndexingWorker | (via VectorIndexService) | Face vector indexing |

### Graceful Shutdown
- **Timeout**: 30 seconds force-exit if services hang
- **Sequence**: Stop tunnels → cloud sync → queue processor → campaign scheduler → money trash → resource monitor → maintenance poller → drain DbWriteQueue → terminate worker pools → close server → unpublish mDNS

---

## 3. Database Connection Configuration (Master + Touch)

### Architecture
Both backends use **better-sqlite3-multiple-ciphers** (SQLite). SQLite is a **single-connection, file-based database** — it does **not** support traditional connection pooling like PostgreSQL/MySQL. Instead, concurrency is managed via SQLite's own WAL (Write-Ahead Logging) mode and busy timeouts.

### SQLite Pragmas (Both Master & Touch)
| Pragma | Value | Purpose |
|--------|-------|---------|
| `journal_mode` | WAL | Enables concurrent readers + single writer |
| `synchronous` | NORMAL | Balances durability and performance |
| `busy_timeout` | 5000 ms | Waits up to 5s before returning BUSY error |
| `temp_store` | MEMORY | Temporary tables/indexes in RAM |
| `cache_size` | -20000 (~20 MB) | Page cache in memory |
| `foreign_keys` | ON | *(Touch only)* Enforce referential integrity |

### Key Observations
- **No Connection Pool**: SQLite operates with a single database handle per `DatabaseManager` instance. The `DatabaseManager` class wraps one `better-sqlite3` connection.
- **WAL Mode**: This is the primary concurrency mechanism. It allows readers to proceed without blocking the writer, and vice versa.
- **Busy Timeout**: 5 seconds is reasonable for a desktop photography app handling bursts of album/photo operations.
- **Zero-Block IO**: Master uses a `DbWriteQueue` service to batch and serialize database writes, preventing blocking the event loop.

---

## 4. Touch Backend Performance Configurations (`apps/touch/backend/server.ts`)

### Server Settings
| Setting | Value | Notes |
|---------|-------|-------|
| Port | 8091 | Fixed default |
| Body Parser Limit | 1 MB | **Much smaller than Master (50 MB)** — appropriate for kiosk API |
| Request Timeout | 30 seconds | Explicitly set per-request |
| Graceful Shutdown | 15 seconds | Half of Master's timeout |

### Rate Limiting
- Uses the **same rate limiter module** as Master (`shared/rateLimiter.ts`), but the Touch backend imports its own copy.
- Default limit: 100 req/min per IP.

### Connection / Concurrency
- **No explicit connection limits** on the HTTP server (Node.js `http.createServer` default = unlimited, bounded by OS file descriptors).
- **Same SQLite single-connection pattern** as Master.
- Has a `WorkerPool` for face indexing (similar to Master).

---

## 5. Issues & Recommendations

### Issues Found
1. **Benchmark Script Bug**: `nonlocal` declaration missing for `successful`/`failed` counters inside nested async function. **Fixed**.
2. **No Connection Pooling**: SQLite inherently doesn't support pooling, but for high-throughput scenarios (many concurrent kiosks), consider:
   - Increasing `busy_timeout` for heavier loads.
   - Using a dedicated write-queue with retry logic (Master already has `DbWriteQueue`).
3. **No HTTP Keep-Alive Tuning**: Neither backend explicitly configures `keepAliveTimeout` or `headersTimeout` on the Node.js HTTP server.
4. **No Request Timeout in Master**: Master does not set `req.setTimeout()` per-request (Touch does — 30s).

### Recommendations
1. **Add HTTP server timeouts** to both backends:
   ```ts
   server.keepAliveTimeout = 65000;
   server.headersTimeout = 66000;
   server.requestTimeout = 30000;
   ```
2. **Consider read replicas** or a connection pool wrapper if scaling beyond ~50 concurrent kiosk devices (SQLite WAL handles moderate concurrency well, but has limits).
3. **Add a `/api/health/load` endpoint** that returns current RPS, active connections, and DB queue depth for real-time monitoring.
4. **Benchmark with authenticated sessions** to get realistic throughput numbers for protected endpoints.

---

*Report generated: Saturday, June 13, 2026*
