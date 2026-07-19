# Tech Stack Modernization Roadmap

Based on the Phase 8 architecture audit, here is the strategic plan for modernizing the ClickFlash ecosystem to ensure long-term viability, performance, and scalability.

## 1. The Desktop Transition: Electron to Tauri

**Current State:** 
The Master and Touch apps are currently built on Electron (`^39.8.7`).
**The Challenge:**
Electron bundles a full Chromium browser and Node.js runtime, leading to heavy memory usage and massive installer sizes (evidenced by the `.pak` and `.asar` files in the scan). This is detrimental for field photographers running on battery power.
**The Path Forward:**
1. **Pilot Phase:** The `moneytrash` app is already built on Tauri (`@tauri-apps/api ^2.2.0`). We will use this as our proving ground.
2. **Migration Phase:** Port the `touch` kiosk application to Tauri first. It requires fewer native APIs than the Master app and will immediately benefit from running on a lightweight Webview.
3. **Core Phase:** Rewrite the `master` app's heavy background tasks (`WorkerPool.ts`, `photoProcessor.ts`) in Rust. This aligns with the existing but dormant `master-cpp` codebase, leapfrogging C++ in favor of memory-safe Rust via Tauri.

## 2. Web Framework Unification

**Current State:**
- The `gallery` and `management` apps use React 19 bundled with `vite`.
- The `website` and `moneytrash` apps use `next` (Next.js 15).
**The Challenge:**
Maintaining distinct build pipelines, routing paradigms (React Router vs App Router), and server-side rendering strategies increases cognitive load and slows feature velocity.
**The Path Forward:**
1. Next.js is the clear winner for SEO-critical public portals. The `website` is correctly positioned.
2. The `gallery` app requires heavy SEO to ensure clients can find their photos. It should be migrated from Vite to Next.js App Router to leverage React 19 Server Components for faster initial loads of heavy image grids.
3. The `management` app can remain on Vite, as it is an authenticated dashboard where SEO is irrelevant and SPA (Single Page Application) behavior is preferred.

## 3. Database Evolution

**Current State:**
Local encrypted SQLite -> Cloudflare D1.
**The Path Forward:**
1. **Near Term:** Maintain the current topology but introduce rigorous batching for `CloudSyncOrchestrator` to respect D1 limits.
2. **Long Term:** As the `management` app scales to handle aggregate analytics across thousands of photographers, D1 will struggle. We will plan a migration of the centralized analytics warehouse from D1 to a managed PostgreSQL cluster (e.g., Supabase or Neon), keeping D1 exclusively for edge-fast gallery serving.

## 4. State Management and Data Fetching

**Current State:**
Widespread use of `zustand` (`^5.0.0`) and `@tanstack/react-query` (`^5.90.10`).
**The Path Forward:**
This is an excellent stack. We will standardize entirely on this pattern, deprecating any legacy `Context` API usage for complex state in favor of Zustand, and ensuring all API interactions (including IPC calls in Electron/Tauri) are wrapped in TanStack Query for optimal caching and retry logic.

## Summary

The current architecture is solid but exhibits "growing pains" inherent to Electron and Serverless databases under high load. The strategic pivot to Tauri and Next.js (for the Gallery) will secure the ecosystem for the next 5 years.
