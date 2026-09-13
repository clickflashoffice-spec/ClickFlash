# ClickFlash Ecosystem Observability Plan

> **V5 Telemetry & Monitoring Architecture**

## 1. Trace Architecture
- **E2E Distributed Tracing**: OpenTelemetry (`@opentelemetry/sdk-trace-web`, `@opentelemetry/sdk-node`).
- **Span Context Propagation**: Injected into `fetch()` and Express/Fastify request headers (W3C Trace Context).
- **Collector Hub**: Central OTLP collector listening on port 4318 (Master Edge Node) to sink traces.

## 2. Metrics & Dashboards
- **Edge Metrics**: Prom-client exposing Node.js GC, CPU, Memory, and Active WebSockets at `GET /metrics`.
- **UI Metrics**: Core Web Vitals (LCP, FID, CLS) emitted by `@opentelemetry/instrumentation-document-load`.

## 3. Logs & Event Sourcing
- **Structured JSON Logging**: Pino logger with unified context (`serviceName`, `env`, `trace_id`).
- **Log Archival**: SQLite persistent log buffering on Edge before Cloud sync.

## 4. Alerting & Health
- **Thresholds**: 
  - Kiosk Latency > 1000ms.
  - Edge Sync Queue Depth > 1000.
  - Rust Core OOM or Panic.
- **Health Probes**: `GET /health` mapped in all API gateways and Docker compose.
