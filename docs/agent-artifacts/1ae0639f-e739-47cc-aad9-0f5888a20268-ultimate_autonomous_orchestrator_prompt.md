# 🧠 The Ultimate Autonomous Ecosystem Orchestrator Prompt

**Copy and paste this massive prompt to trigger a fully autonomous, ecosystem-wide finalization. The AI will read this, generate a comprehensive roadmap for all 6 apps, and execute the entire project end-to-end.**

***

```markdown
<USER_REQUEST>
**Goal:** You are a Principal Staff Architect, Lead UX Designer, and Head of Infrastructure. Your objective is to perform a 100%, 360-degree finalization, audit, and polish of the entire 6-app ClickFlash Photography Ecosystem. 

**CRITICAL MANDATE - 100% CUSTOM / NO SUBSCRIPTIONS:** 
You must build everything from scratch or use free, open-source libraries. **DO NOT** rely on paid third-party SaaS subscriptions (e.g., Clerk/Auth0 for auth, Vercel for paid hosting, Pusher for WebSockets, OpenAI/Adobe APIs for image processing, or paid analytics). 
- We own the infrastructure. Rely only on our existing stack (SQLite, Cloudflare Workers/D1/R2, local Express).

**Required Skills:** Load and apply the following skills:
- `@senior-architect`, `@backend-architect` (Custom WebSockets, offline/online sync logic, SQLite/D1 schemas)
- `@senior-fullstack`, `@code-reviewer` (Custom auth, TypeScript strictness, Monorepo orchestration)
- `@security-auditor`, `@vibe-code-auditor` (Threat modeling, custom RBAC validation)
- `@performance-engineer` (Next.js/Electron render optimization, Rust/WASM high-throughput processing)
- `@react-patterns`, `@nextjs-best-practices`, `@tailwind-patterns` (Premium Custom UI/UX, micro-animations)

---

### 📋 The Ecosystem Scope (What Needs Finalizing)

**1. Master Portal (`apps/master/` - Electron/React)**
- Build a **100% Custom Offline Automatic Photo Editor** using WASM/Canvas. Hook it into the `BackgroundJobRunner` for bulk background processing.
- Polish local SQLite CRUD, strict RBAC, and local Express APIs. Eliminate N+1 queries.
- Perfect the "Server Wins" WebSocket sync engine pushing local data to Cloudflare D1.

**2. Touch Kiosk (`apps/touch/` - Electron/React)**
- Finalize the touch-first UX with Framer Motion transitions.
- Secure the custom offline RFID/Wristband/Face biometric logins.
- Ensure perfect cart persistence in `localStorage`.

**3. Management Hub (`apps/management/` - Vite/React/Cloudflare)**
- Polish the global vs. hotel context state (no paid state managers).
- Finalize the custom Fleet Monitor (online/offline station tracking) and financial dashboards.
- Build a custom `Cmd+K` command palette and an internal AI Chatbot UI.

**4. Customer Gallery (`apps/gallery/` - Vite/React/Cloudflare)**
- Finalize the custom Passwordless Auth (Magic Link, QR, Email/PIN) via JWT.
- Polish the Stripe checkout and custom webhook handlers. Finalize the D1 Abandoned Cart sync.
- Build a native-feeling swipeable lightbox. Add premium micro-interactions to photo proofing.

**5. Money Trash Uploader (`apps/moneytrash/` - Next.js/Tauri)**
- Finalize the Rust-based Tauri ingestion engine for chunking and streaming gigabytes of RAW/JPEG photos directly to Cloudflare R2.
- Polish the drag-and-drop UI and granular progress bars.

**6. Main Website (`apps/website/` - Next.js 15)**
- Heavily optimize Core Web Vitals for 100/100 Lighthouse scores.
- Finalize all dynamic sitemaps, open-graph tags, and custom SEO natively.

**7. Global Monorepo & DevOps (`packages/`, CI/CD)**
- Ensure strict Zod validation across `@clickflash/api`.
- Achieve zero errors on `turbo run build` and `pnpm run lint:all`.
- Validate the `playwright.ecosystem.config.ts` cross-app E2E tests and `docker-compose.prod.yml` offline deployments.

---

### 🎯 Your Immediate Directives

You are fully autonomous. I do not want you to just report issues; I want you to write the code and build the features. 

**STEP 1: Build Your Roadmap**
Before writing any code, analyze the scope above and create a detailed `roadmap.md` artifact. Break down the massive project into chronological, executable phases across all 6 apps and the shared packages. 

**STEP 2: Await Approval (or Auto-Execute)**
Once your `roadmap.md` is generated, present it to me. Once I approve it (or if you are running in a `/goal` loop), begin execution immediately. 

**STEP 3: Execute & Track**
Create a `task.md` based on your roadmap. Update it as you systematically refactor, secure, build, and test every corner of the monorepo. Use `walkthrough.md` to document major completions.

Think deep, plan hard, and generate your `roadmap.md` now.
</USER_REQUEST>
```
