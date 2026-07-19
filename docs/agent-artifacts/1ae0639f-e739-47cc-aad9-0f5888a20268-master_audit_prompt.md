# 🚀 The Ultimate Ecosystem Finalization Prompt (100% Custom Edition)

**Copy and paste this massive prompt into your next request. It provides granular, explicit instructions for every single app, route, and feature in the ClickFlash ecosystem, with a strict mandate to build everything fully custom and avoid third-party subscriptions.**

***

```markdown
<USER_REQUEST>
**Goal:** You are a Principal Staff Engineer, Enterprise Architect, and Lead UI/UX Designer. Your objective is to perform a 100%, 360-degree finalization, audit, and polish of the entire ClickFlash Photography Ecosystem to ensure it is modern, smooth, smart, and fully production-ready.

**CRITICAL MANDATE - 100% CUSTOM / NO SUBSCRIPTIONS:** 
You must build everything from scratch or use free, open-source libraries. **DO NOT** rely on paid third-party SaaS subscriptions (e.g., Clerk/Auth0 for auth, Vercel for paid hosting, Pusher for WebSockets, or paid analytics). 
- Build custom JWT/session authentication.
- Build custom WebSockets for real-time sync.
- Build custom analytics trackers.
- Build custom UI components (using Tailwind/Framer) instead of paid UI kits.
- We own the infrastructure. Rely only on our existing stack (SQLite, Cloudflare Workers/D1/R2, local Express).

**Required Skills:** Load and apply the following skills to guide your execution:
- `@senior-architect`, `@architect-review` (Ecosystem structure, Custom WebSockets, offline/online sync logic)
- `@senior-fullstack`, `@code-reviewer` (Deep code quality, TypeScript strictness, custom auth implementation)
- `@security-auditor`, `@vibe-code-auditor` (Threat modeling, custom RBAC validation, input sanitization)
- `@performance-engineer` (Vite/Next.js/Electron render optimization, SQLite/D1 query tuning)
- `@react-patterns`, `@nextjs-best-practices`, `@tailwind-patterns` (Premium Custom UI/UX, micro-animations)

### 📋 Granular Execution Directives

You must execute this as a multi-stage process. Create a `task.md` to track your progress and do not stop until all phases are complete. Do not just report issues—FIX them directly in the code.

---

#### **Phase 1: Master Portal (`apps/master/`) - Offline Core Audit**
*Context: Electron + React 19, Port 8090. Runs the local studio, manages SQLite and Express backend.*
1. **Custom Analytics & Dashboards:** Build the live stats rendering from scratch. Do not use paid charting libraries; use open-source (e.g., Recharts) or build custom SVG charts.
2. **Background Jobs:** Ensure the custom `BackgroundJobRunner` and `ThermalMonitor` gracefully handle huge payloads without freezing the UI. No third-party job queues.
3. **Custom RBAC & Auth:** Enforce strict Zod validation on forms. Verify our custom RBAC (`can("view...")`) is applied to every route perfectly without external auth providers.
4. **Settings & Hardware:** Verify custom network setup forms and hardware pairing logic. Polish the "AI Ideas Modal" UI using local or direct API calls.
5. **PrintLayout & CustomerReceipt:** Ensure physical print CSS is pixel-perfect (`@media print`).
6. **Custom Sync Engine:** Hard-audit our bespoke "Server Wins" conflict resolution and custom WebSocket server for LAN communication. 

#### **Phase 2: Touch Kiosk (`apps/touch/`) - Customer Experience**
*Context: Electron + React 19, Port 8091. Customer-facing tablet, strict offline LAN mode.*
1. **Custom Biometrics/RFID:** Polish the attract screen. Ensure the custom RFID/Wristband and Face login logic is secure, fast, and does not rely on paid external APIs.
2. **Photo Selection UI:** Implement smooth Framer Motion layout transitions. Build a custom, highly-optimized virtualized grid for massive photo lists.
3. **Cart Persistence:** Ensure local cart state persistence (`localStorage`) works flawlessly. 
4. **Kiosk Security:** Verify the `Ctrl+Shift+Alt+F12` Admin Override logic is unbreakable.

#### **Phase 3: Management Hub (`apps/management/`) - Enterprise Cloud**
*Context: Vite + React 19 + CF Workers/D1. Global executive dashboard.*
1. **Global Context State:** Ensure the custom context switcher (Global vs Hotel) cascades state perfectly using React Context/Zustand—no paid state management tools.
2. **Custom Fleet Monitor:** Polish the custom ping system (`stations_overview`). Do not use third-party observability tools; rely on our own data.
3. **Financials & SQL:** Audit custom data aggregation logic. Fix any N+1 queries hitting the Cloudflare D1 database.
4. **Command Bar (Cmd+K):** Build or polish the custom command palette. No paid search plugins like Algolia.
5. **AI Chatbot:** Polish the chatbot UI with custom typing indicators and premium chat bubbles.

#### **Phase 4: Customer Gallery (`apps/gallery/`) - E-Commerce Polish**
*Context: Vite + React 19 + CF Workers/D1/R2/Stripe. Public customer portal.*
1. **Custom Passwordless Auth:** Audit our custom Magic Link (`?token=`), QR Session, and Email/PIN login flows. Ensure rate-limiting and token expiration are handled by our Cloudflare Workers.
2. **Custom Lightbox:** The swiping experience must feel like a native iOS app. Build this custom using Framer Motion. Ensure images are optimized via Cloudflare R2.
3. **Store & Checkout:** Audit the Stripe integration (the only accepted third-party for payments). Test our custom webhook handlers. Verify our custom "Abandoned Cart Sync" logic.
4. **Custom Proofing:** Ensure the approve/reject state mutations are optimistic. Add custom micro-interactions (confetti, satisfying clicks).

#### **Phase 5: Money Trash Uploader (`apps/moneytrash/`) - Heavy Lifting**
*Context: Next.js 16 + Tauri, Port 3000. Batch RAW/JPEG ingestor.*
1. **Custom Drag & Drop:** Polish the dropzone with satisfying drag-enter/leave animations built from scratch.
2. **Custom Tauri Backend:** Verify the Rust chunking and multi-threading logic for gigabyte-scale uploads directly to our R2 buckets. No paid upload services like UploadThing or AWS Amplify.

#### **Phase 6: Main Website (`apps/website/`) - Marketing & SEO**
*Context: Next.js 15 App Router + Tailwind 4, Port 3001. Public storefront.*
1. **Custom SEO:** Audit metadata, open-graph tags, and sitemaps. Handle everything natively in Next.js without paid SEO plugins.
2. **Performance:** Verify maximum Lighthouse scores. Ensure custom lazy-loading logic is flawless.

#### **Phase 7: Shared Packages (`/packages/`) - The Core**
1. **Custom Validation:** Ensure every API contract is strictly typed and backed by Zod schemas in `@clickflash/validation`.
2. **Custom Logger:** Remove ALL stray `console.log` statements. Ensure `@clickflash/logger` handles everything natively.
3. **Custom UI System:** Verify that `@clickflash/ui` is a fully custom design system using Tailwind. Do not use heavy, bloated, or paid component libraries.

#### **Phase 8: Production Deployment & DevOps Finalization**
1. **Self-Hosted / Custom CI:** Run `pnpm run lint:all` and `turbo run build`. Do not stop until there are ZERO errors.
2. **Custom E2E Testing:** Audit `playwright.ecosystem.config.ts`. Write robust tests covering our custom sync engines.
3. **Self-Managed Deployment:** Verify `docker-compose.prod.yml` spins up the entire offline ecosystem flawlessly. Ensure deployment scripts deploy to our Cloudflare workers seamlessly. No paid PaaS (like Heroku/Vercel) for hosting.

### 🎯 Execution Flow
1. Set up `task.md`.
2. Work through Phase 1 to Phase 8 systematically. 
3. Fix issues immediately as you find them (write code, refactor files).
4. **NEVER introduce a paid subscription.** Always build the solution custom or use free open-source code.
5. After each phase, update a `walkthrough.md` to show what was modernized, secured, and fixed.
6. Use `/goal` to maintain continuous execution. Let's build a masterpiece!
</USER_REQUEST>
```
