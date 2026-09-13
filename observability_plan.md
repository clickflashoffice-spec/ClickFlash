# ClickFlash Ecosystem Observability Plan

> **V6 Unified Production Telemetry & Monitoring Architecture**

---

## 1. Distributed Trace Architecture
- **Framework**: OpenTelemetry 2.x (`@opentelemetry/sdk-trace-web`, `@opentelemetry/sdk-node`).
- **Span Context Propagation**: W3C Trace Context headers (`traceparent`, `tracestate`) automatically injected into all `fetch()` calls, Fastify handlers, and WebSocket connection handshakes.
- **Collector Endpoint**: Local OTLP trace exporter configured at `http://127.0.0.1:4318/v1/traces` on Master Edge Node with batch queuing and exponential backoff.
- **Test Guard**: All OTLP span processors are gated behind `!isTest` flags to prevent background timers from leaking into Vitest / Playwright runners.

---

## 2. Real-Time Metrics & Dashboards
- **Edge Station Metrics**:
  - `prom-client` exposing Node.js process metrics (RSS memory, heap usage, event loop lag, active handles) at `GET /metrics`.
  - Ingestion rate: Images ingested per minute, libvips thumbnail generation latency (p50, p95, p99).
  - SQLite WAL frame growth rate and checkpoint duration.
- **Client & Kiosk Metrics**:
  - Core Web Vitals (LCP, INP, CLS) monitored via `@opentelemetry/instrumentation-document-load`.
  - Touch interaction-to-display latency (<50ms target).
  - Offline queue depth and IndexedDB storage pressure.

---

## 3. Structured Logging & Audit Trails
- **Logger**: High-performance Pino logger with unified JSON schema:
  ```json
  {
    "level": "info",
    "time": 1789317000000,
    "service": "clickflash-master",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "spanId": "00f067aa0ba902b7",
    "msg": "Batch photo ingestion completed",
    "batchSize": 24,
    "durationMs": 412
  }
  ```
- **Air-Gap Compliance Audit**: Automated detection of biometric data in log payloads. Raw 512D vectors are redacted before serialization.

---

## 4. Health Probes & Service Mesh Status

| Service | Port | Probe Route | Success Criteria | Action on Failure |
|---|---|---|---|---|
| **Master Node** | 8090 | `GET /api/health` | HTTP 200, `{ status: "ok" }` | Electron supervisor auto-restart |
| **Touch Kiosk** | 8091 | `GET /health` | HTTP 200 | Kiosk watchdog reload |
| **Management Hub** | 5175 | `GET /` | HTTP 200 | Nginx container healthcheck |
| **Gallery Web** | 5176 | `GET /api/health` | HTTP 200 | Cloudflare Pages failover |
| **AI Worker** | 8000 | `GET /health` | HTTP 200, `{ model: "ready" }` | Docker restart policy |
| **Redis** | 6379 | `redis-cli ping` | `PONG` | Redis service restart |

---

## 5. Alerting Thresholds & Auto-Mitigation
- **Kiosk API Latency > 800ms**: Trigger automatic thumbnail cache compaction and drop background analytics flushes.
- **Edge SQLite Queue > 500 ops**: Master initiates priority batch transaction flush.
- **Event Loop Lag > 150ms**: Pause background AI face vector indexing until load decreases below 50ms lag.
