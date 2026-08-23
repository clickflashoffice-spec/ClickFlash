# ADR-008: Hierarchical Vector Search Strategy (Edge VP-Tree + WASM SIMD + Cloud DB)

## Status
Accepted

## Context
ClickFlash processes hundreds of thousands of guest photos daily across distributed theme park attractions and portrait studios. Guests expect instant selfie-based search (< 100ms) on Touch Kiosks and mobile PWAs. A purely cloud-based vector query introduces latency and fails during WAN outages. Conversely, a purely local index cannot serve guests once they leave the resort.

## Decision
ClickFlash adopts a 3-tier hierarchical vector search architecture:

1. **Edge Node In-Memory VP-Tree (C++ Native Addon / WASM)**:
   - On the Master OS edge node (`apps/desktop/master`), face embeddings (512D ArcFace) are indexed into an in-memory Vantage Point Tree (VP-Tree) with sub-5ms cosine metric lookup.
   - Used for immediate kiosk attract interactions and instant magic link generation upon guest capture.
2. **Client-Side WASM SIMD HNSW (`hnsw_wasm_simd.cpp`)**:
   - Touch Kiosks and Mobile Consumer apps load an embedded WebAssembly Hierarchical Navigable Small World (HNSW) vector index for 100% offline selfie search directly in the browser/app thread.
3. **Cloud Vector DB / Cloudflare D1 + Vectorize**:
   - Synchronized upstream to Cloudflare Vectorize / Milvus for cross-resort guest recall, lifetime album access, and web gallery queries.

## Consequences
- **Positive**:
  - Sub-millisecond face matching on edge hardware without cloud roundtrips.
  - Zero downtime: Kiosks continue matching faces even when the park internet link is severed.
  - Scalable to millions of photos across multi-venue enterprises.
- **Negative**:
  - Requires maintaining dual indexing logic across C++/WASM and Cloudflare Vectorize.
  - Requires periodic vector index compaction on edge nodes.
