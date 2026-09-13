# Interview Rubric: Senior Full-Stack Engineer (🔴 P0)

> **Role Focus:** React 19, Vite, Tailwind CSS v4, Fastify/Node.js, SQLite WAL concurrency, WebSockets, Stripe Checkout/Connect, and guest-facing UX polish (Gallery, Management Hub, Self-Service PWA).

---

## 1. Evaluation Dimensions (Score 1 to 5)

| Dimension | Weight | Poor (1–2) | Target (3–4) | Exceptional (5) |
|:---|:---|:---|:---|:---|
| **Frontend Architecture & React 19** | 30% | Relies on generic boilerplate; causes unnecessary re-renders in large photo grids; poor memoization/virtualization. | Masters React 19 hooks, TanStack Query/Zustand, Tailwind CSS v4, and virtualized masonry photo layouts ($1,000+$ items). | Optimizes Core Web Vitals to 99+; implements micro-interactions, layout animations, and responsive image pyramids flawlessly. |
| **Node.js / Fastify & Backend Concurrency** | 25% | Blocks event loop with heavy sync tasks; cannot handle multi-client photo ingest spikes. | Deep understanding of async streams, Fastify plugins, schema validation (Zod), and worker threads. | Profiles V8 memory heaps; designs zero-copy buffer pipelines and resilient rate-limiting under peak load. |
| **Database & SQLite WAL Concurrency** | 25% | Assumes Postgres/MongoDB; does not understand SQLite single-writer lock contention or `SQLITE_BUSY`. | Configures WAL mode, busy timeouts, proper indexed queries, and atomic transactions. | Understands SQLite memory-mapped I/O (`mmap_size`), batching queues (`DbWriteQueue`), and cross-process lock mitigation. |
| **Payments & Webhooks (Stripe)** | 20% | Naive payment flows; vulnerable to double-charges or unhandled webhook replay attacks. | Implements Stripe Checkout and Webhook signature verification with idempotency keys and clear error states. | Designs multi-party split payouts (Stripe Connect custom/express), offline cart caching, and dynamic yield price overrides. |

---

## 2. Practical Technical Challenge (Paid Take-Home / 48 Hours)

### Challenge: "High-Throughput Album Ingestion & Gallery Rendering"
- **Objective:** Build a mini full-stack feature simulating the ClickFlash Gallery Ingest & View pipeline:
  1. **Backend (Fastify + SQLite):**
     - Endpoint to receive batch photo metadata ($500$ records in one POST).
     - Persist into SQLite using WAL mode and a write queue without throwing `SQLITE_BUSY`.
     - Emit WebSocket events to connected frontend clients on each batch progress tick (every $10\%$).
  2. **Frontend (React 19 + Tailwind):**
     - Live progress bar driven by the WebSocket feed.
     - Virtualized gallery view that smoothly renders the 500 photos without frame drops ($60\text{ fps}$ scrolling).
     - 1-click cart action that calculates dynamic bundle pricing based on quantity selected.
- **Evaluation Criteria:**
  - TypeScript strict mode with zero errors (`tsc --noEmit`).
  - Idempotent SQLite write logic.
  - Smooth UI animations and responsive layout on mobile/desktop viewports.

---

## 3. Decision Matrix
- **Hire (Score $\ge 4.0/5$):** Writes clean, typed, modular code; exhibits high craftsmanship in UI polish; respects database limits.
- **No Hire (Score $< 3.5/5$):** Clutters state; ignores edge-case network drops; produces sluggish UI on large photo sets.
