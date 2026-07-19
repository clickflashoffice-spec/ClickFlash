# ADR 001: Dual Backend Architecture

**Status:** Accepted
**Date:** 2026-06-18
**Context:** ClickFlash Master Station

## Context and Problem Statement
The ClickFlash Master Station must process high volumes of RAW and JPEG images, perform face indexing, and handle hundreds of local network requests from Touch Kiosks simultaneously. While Node.js (Express) provides incredible developer velocity and ecosystem support, it becomes CPU-bound during extreme resort loads (e.g., 10,000+ photos ingested while serving 10 Kiosks).

## Decision
We will implement a **Dual Backend Architecture**.
1. **Node.js (Express) [Port 8090]:** The default, highly extensible backend. It remains the source of truth for the OpenAPI specification.
2. **C++ (Drogon) [Port 8092]:** An opt-in, ultra-high-performance engine designed for heavy multi-threading and I/O.

The React frontend will automatically detect the active backend by probing `/api/system/backend-type`.

## Consequences
- **Positive:** Massive performance headroom for enterprise deployments. Developer velocity is maintained for 90% of feature work in Node.js.
- **Negative:** Dual maintenance. Every new API endpoint must be implemented twice. We must rely on strict OpenAPI contract testing to ensure identical behavior.
