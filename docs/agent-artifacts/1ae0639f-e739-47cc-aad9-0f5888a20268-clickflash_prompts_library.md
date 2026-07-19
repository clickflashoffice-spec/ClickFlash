# 📚 The ClickFlash Prompts Library

This library contains highly specialized, agent-ready prompts for finalizing, auditing, and scaling **each individual application**, plus a master orchestrator prompt for the **entire ecosystem together**. 

Copy and paste the specific prompt you need into a new session or `/goal` command.

**Universal Rule for All Prompts:** Build everything 100% custom. Do not use paid third-party SaaS subscriptions (no Vercel, no Clerk, no Pusher, no paid analytics). Rely only on our existing stack (SQLite, Cloudflare Workers/D1/R2, local Express).

---

## 1. 🖥️ The Master Portal Prompt (`apps/master`)
*Use this when focusing exclusively on the core studio application.*

```markdown
<USER_REQUEST>
**Goal:** You are a Principal Desktop Engineer. Your task is to finalize, secure, and polish the `apps/master` Electron application. This is the offline-first heart of the studio.

**Required Skills:** `@senior-architect` (Local APIs), `@performance-engineer` (SQLite tuning, Job Runners).

**Directives:**
1. **Offline Automatic Editor:** Build a 100% custom, offline photo editor using local WASM/Canvas logic. Integrate it into the `BackgroundJobRunner` to process massive albums without freezing the React UI.
2. **Local Database & API:** Audit the SQLite schema and local Express routes. Ensure there are zero N+1 queries.
3. **Sync Engine Hub:** Hard-audit the WebSocket server that feeds the Touch Kiosk. Ensure the "Server Wins" sync protocol that pushes to Cloudflare D1 is flawless and conflict-free.
4. **Custom UI/UX:** Polish the Dashboard, Albums, and Bookings views. Build custom charts (no paid libraries) for the Growth metrics.
5. **Security:** Enforce strict RBAC and Zod validation on every local route.
Do not ask for permission. Build it, test it, and update `walkthrough.md`.
</USER_REQUEST>
```

---

## 2. 👆 The Touch Kiosk Prompt (`apps/touch`)
*Use this when focusing on the customer-facing tablet experience.*

```markdown
<USER_REQUEST>
**Goal:** You are a Principal UI/UX Engineer. Your task is to finalize the `apps/touch` Electron kiosk app. This runs on a tablet and communicates ONLY with the local Master Portal.

**Required Skills:** `@react-patterns`, `@tailwind-patterns` (Touch-first UX, micro-animations).

**Directives:**
1. **Touch-First Aesthetics:** Inject premium aesthetics (glassmorphism, tailored dark modes). Use Framer Motion for buttery-smooth transitions between the grid and full-screen preview.
2. **Custom Biometrics/RFID:** Finalize the RFID/Wristband and Face login logic on the Welcome screen. Ensure it is secure and runs 100% locally without external APIs.
3. **Resilience:** Ensure the user's cart state is perfectly persisted in `localStorage` to survive accidental kiosk reboots.
4. **Security:** Verify the Admin Override (`Ctrl+Shift+Alt+F12`) is unbreakable by standard touch interactions.
Build the components, verify the UI, and update `walkthrough.md`.
</USER_REQUEST>
```

---

## 3. 📊 The Management Hub Prompt (`apps/management`)
*Use this for the global enterprise dashboard.*

```markdown
<USER_REQUEST>
**Goal:** You are an Enterprise Web Architect. Finalize the `apps/management` Vite + React app and its Cloudflare Workers/D1 backend.

**Required Skills:** `@backend-architect` (Cloudflare D1), `@performance-engineer` (Data tables).

**Directives:**
1. **Global State Context:** Ensure the context switcher (Global vs. Hotel level) cascades perfectly using native React tools. No paid state managers.
2. **Fleet Orchestration:** Polish the "Stations Overview" ping system. Ensure the UI dynamically shows offline/online Master portals globally.
3. **Data & Analytics:** Audit the financial data aggregation. Build custom data visualization charts. Fix any slow queries hitting the D1 edge database.
4. **Command Palette:** Build a custom `Cmd+K` global search bar for rapid navigation without using Algolia.
5. **AI Chatbot:** Finalize the internal chatbot UI with custom streaming text and typing indicators.
Write the code, fix the edge cases, and update `walkthrough.md`.
</USER_REQUEST>
```

---

## 4. 🛒 The Customer Gallery Prompt (`apps/gallery`)
*Use this for the public e-commerce client portal.*

```markdown
<USER_REQUEST>
**Goal:** You are a Lead E-Commerce Engineer. Finalize the `apps/gallery` app (Vite + React) and its Cloudflare Workers backend.

**Required Skills:** `@senior-fullstack`, `@security-auditor` (Auth & Payments).

**Directives:**
1. **Custom Auth:** Finalize the custom Passwordless Magic Link and QR Session login flows. Handle JWT verification via Cloudflare Workers. Do not use Auth0/Clerk.
2. **Store & Stripe:** Audit the Stripe checkout flow (the only accepted 3rd party). Write robust custom webhook handlers for order fulfillment.
3. **Abandoned Carts:** Finalize the custom D1-backed abandoned cart sync logic.
4. **Lightbox UX:** Build a native-feeling, highly optimized swiping lightbox. Ensure R2 edge image delivery is as fast as possible.
5. **Proofing:** Add premium micro-interactions (confetti, satisfying haptics) to the photo approve/reject workflow.
Execute the changes, ensure security, and update `walkthrough.md`.
</USER_REQUEST>
```

---

## 5. 🗄️ The Money Trash Uploader Prompt (`apps/moneytrash`)
*Use this for the heavy-duty batch upload gateway.*

```markdown
<USER_REQUEST>
**Goal:** You are a Systems & Desktop Engineer. Finalize the `apps/moneytrash` Next.js + Tauri desktop application.

**Required Skills:** `@performance-engineer` (Rust/Tauri multi-threading, memory management).

**Directives:**
1. **Heavy Ingestion Backend:** Finalize the Rust-based Tauri backend. Ensure it can handle gigabyte-scale folder drops, chunk the data, and upload directly to Cloudflare R2 without freezing. No paid upload services (like UploadThing).
2. **Custom UI:** Polish the Next.js drag-and-drop zone with satisfying hover states and animations.
3. **Granular Progress:** Implement ultra-precise progress bars per file and per batch that communicate seamlessly from Rust to the React frontend.
Write the Tauri/Next.js code, stress test it, and update `walkthrough.md`.
</USER_REQUEST>
```

---

## 6. 🌐 The Marketing Website Prompt (`apps/website`)
*Use this for the public-facing storefront.*

```markdown
<USER_REQUEST>
**Goal:** You are an SEO & Frontend Expert. Finalize the `apps/website` Next.js 15 App Router application.

**Required Skills:** `@nextjs-best-practices`, `@tailwind-patterns` (SEO, Core Web Vitals).

**Directives:**
1. **Custom SEO:** Finalize dynamic sitemaps, open-graph tags, and structured metadata for all 14+ routes. Do not rely on external SEO plugins.
2. **Performance Optimization:** Achieve 100/100 Lighthouse scores. Heavily optimize hero videos/images and ensure strict SSR/SSG caching.
3. **Premium Branding:** Ensure typography, spacing, and brand colors reflect a top-tier enterprise SaaS.
Refactor the pages, optimize the assets, and update `walkthrough.md`.
</USER_REQUEST>
```

---

## 7. 🌍 The Global Ecosystem Prompt (All Together)
*Use this to trigger a massive, cross-monorepo orchestrated audit and deployment.*

```markdown
<USER_REQUEST>
**Goal:** You are the Principal Staff Architect. Perform a 360-degree integration audit and finalization across all 6 apps (`master`, `touch`, `management`, `gallery`, `moneytrash`, `website`) and shared `packages/`. 

**CRITICAL MANDATE:** 100% Custom. No paid SaaS subscriptions (auth, analytics, queues, UI kits). Rely entirely on local SQLite, Cloudflare D1/R2, and custom logic.

**Directives:**
1. **Ecosystem Type Safety:** Audit `@clickflash/api` and `@clickflash/validation`. Ensure every single monorepo contract is Zod-validated.
2. **Sync Validation:** Trace the data flow from offline Master -> LAN Touch -> Cloud D1 -> Gallery Web. Fix any race conditions or data loss scenarios in our custom sync engine.
3. **Cross-App UI Consistency:** Ensure `@clickflash/ui` is used globally and that dark mode and branding variables are uniform across all apps.
4. **CI/CD & E2E:** Audit `playwright.ecosystem.config.ts`. Ensure `turbo run build` passes with zero lint/type errors across the monorepo. Fix all blockers.
5. **Docker:** Verify `docker-compose.prod.yml` spins up the local offline ecosystem flawlessly.
Do not stop until the entire monorepo is production-ready. Update `walkthrough.md` after each phase. Let's build a masterpiece!
</USER_REQUEST>
```
