# ClickFlash Ecosystem v6.0 — CEO Master Plan

> **Status:** DRAFT v6.0 — June 2026  
> **Author:** Acting CTO/CEO (Kimi 2.7 + Hermes CEO perspective)  
> **Replaces:** 8-phase plan from `EXECUTIVE_SUMMARY.md` (which already produced a 92/100 baseline)  
> **Goal of this document:** A single source of truth that makes the answer to *"what must we do next, in what order, and why?"* obvious to anyone — including a new VP Engineering joining next quarter.

---

## 0. CEO One-Page Summary

### What we are
**ClickFlash** is the operating system for professional photography businesses that run across multiple physical locations (resorts, cruise ships, event venues, regional portrait studios). Each location has at least one **Master** PC (the studio brain) and zero-to-many **Touch** kiosks (customer-facing), all wired over ethernet. Every Master connects to a **global Cloudflare Management Hub** that aggregates analytics, payroll, inventory, moneytrash, and customer galleries across the entire fleet.

### The single hardest problem we must solve
**Onboarding a new destination in < 10 minutes, with zero engineering involvement, on a flaky resort Wi-Fi, with a non-technical staff.** Every feature, doc, and code decision should be evaluated against this. If it does not shorten or harden that first 10 minutes, it is not a P0.

### Where we are (post v5.0)
| Domain | Status | Score | Why it matters |
|---|---|---|---|
| Master (Electron + Express + SQLite) | Production | 8.5/10 | The brain. Has all 21 route groups, sync, health. |
| Touch (Electron + Express + SQLite) | Production | 8.0/10 | Customer kiosk. Pairs to Master over LAN. |
| Management Hub (Cloudflare Worker + D1) | Functional | 8.0/10 | Global brain. Has fleet routes + masters register. |
| Gallery (Cloudflare Worker + R2) | Functional, narrow | 6.0/10 | Customer-facing sales. Needs PCI + 12 failing tests. |
| MoneyTrash (Tauri + Cloudflare + R2) | Functional | 6.5/10 | Unsold-photo marketplace. Worker is solid; Tauri is feature-light. |
| Website (Next.js static) | Production | 10/10 | Marketing surface. Done. |
| Installer (Electron wizard) | Scaffolded | 7.0/10 | The "1-click" experience. Built but unverified end-to-end. |
| master-cpp (Qt6 desktop) | Scaffolded, blocked | 5.0/10 | 59 migrations + 50+ controllers scaffolded, but cannot build without Qt6. Strategic decision needed (see §5). |
| Shared packages (`@clickflash/types`, `@clickflash/ui`) | Unaudited | ?/10 | Every app imports these. Unknown risk. |
| Documentation | Fragmented | 6/10 | 7 great guides exist; nothing is end-user facing. |

### The 4 things we will do this quarter, in this order
1. **Ship a 1-click "new destination" flow** — installer registers a Master with the Hub, pairs every Touch over ethernet, provisions Cloudflare resources, and ends in a green dashboard — all in one wizard. (Phase 3 below.)
2. **Harden what is in production** — fix the 12 Gallery test failures, clean up dual backends, close MoneyTrash auth gaps, lock down Touch CORS, encrypt every SQLite. (Phase 4.)
3. **Decide the master-cpp future** — Qt6 desktop binary or kill the port and keep the Node backend with a Rust shim for image work. (Phase 5.)
4. **Write end-user manuals** — Studio Manager, Photographer, Kiosk Customer, IT Admin. (Phase 6.)

Everything else (mobile companion, AI culling v2, public marketplace) is a Q3+ bet.

---

## 1. Product Vision (CEO-Grade)

### 1.1 Who pays us, and why
| Buyer | What they pay for | ACV target |
|---|---|---|
| **Independent studio** (1 location, 1 Master) | All-in-one studio OS | $200–500/mo |
| **Regional chain** (2–5 locations) | Multi-master dashboard, shared products/pricing, payroll | $1,500–3,000/mo |
| **Resort group** (5–50 locations globally) | Per-desk SaaS, GDPR, on-call, on-prem option | $2k+/mo per location + setup |

### 1.2 What we will NOT do (focus)
- We are **not** a generic photo-sharing app (SmugMug, Pic-Time do that). We are a **workflow system for studios that have a front desk, a print lab, and customers who touch the screen**.
- We are **not** a horizontal CRM. HoneyBook does that. Our CRM is **vertical** (sessions, photographers, products, prints, albums, kiosk orders).
- We are **not** a self-serve cloud. Studios want **offline-first, on-prem-feel** software. The cloud is sync, not the source of truth.

### 1.3 The 3 jobs our product must do brilliantly
1. **"Move a shoot from camera to print without a human touching a USB stick."** Ingest → cull → face-tag → kiosk order → print.
2. **"Show my boss every shoot at every resort, this morning, in one report."** Cross-location analytics.
3. **"Turn the unsold photos of 2,000 guests into $4,000 of recurring marketplace revenue."** MoneyTrash.

### 1.4 Success metrics (next 12 months)
| Metric | Today | Q4 2026 | Q2 2027 |
|---|---|---|---|
| New destination onboarding time | ~4 hours | 10 min | 5 min |
| Installer success rate (no engineer on phone) | 60% | 95% | 99% |
| Locations per fleet (avg) | 1.3 | 3.0 | 6.0 |
| Monthly churn | n/a | < 3% | < 2% |
| Net Promoter Score | n/a | 40+ | 50+ |
| Mean time to recover (master crash) | 30 min | 5 min | 1 min |

---

## 2. Current Architecture (Locked-In Baseline)

### 2.1 Topology (verified in code)
```
                  ┌──────────────────────────────────────────────────────┐
                  │        CLOUDFLARE (Global, Multi-Region)             │
                  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
                  │  │ Management   │  │  Gallery     │  │Website   │  │
                  │  │ Hub Worker   │  │  Worker+R2   │  │Pages     │  │
                  │  │ D1 (multi-   │  │  D1 + R2     │  │Static    │  │
                  │  │  tenant by   │  │  Stripe      │  │          │  │
                  │  │  desk_id)    │  │              │  │          │  │
                  │  └──────▲───────┘  └──────▲───────┘  └──────────┘  │
                  │         │                 │                         │
                  │         │ RS256 JWT       │ Signed URLs            │
                  │         │ + HW fp         │                        │
                  └─────────┼─────────────────┼────────────────────────┘
                            │                 │
            ┌───────────────┼─────────────────┼───────────────┐
            │               │                 │               │
        ┌───▼────┐    ┌─────▼──────┐    ┌─────▼──────┐    ┌───▼────┐
        │Master A│    │ Master B   │    │ Master C   │    │  ...  │
        │MAL01   │    │ DXB01      │    │ BALI01     │    │       │
        │:8090   │    │ :8090      │    │ :8090      │    │       │
        └───┬────┘    └─────┬──────┘    └─────┬──────┘    └───────┘
            │ HMAC          │                 │
            │ WebSocket     │                 │
        ┌───▼────┐    ┌─────▼──────┐    ┌─────▼──────┐
        │Touch 1 │    │ Touch 2    │    │ Touch 3    │
        │(ether) │    │ (ether)    │    │ (ether)    │
        │:8091   │    │ :8091      │    │ :8091      │
        └────────┘    └────────────┘    └────────────┘
            │
        ┌───▼────┐
        │Money   │ (per Master, optional)
        │Trash   │
        │uploader│
        └────────┘
```

### 2.2 Critical invariants we will not break
- **Local SQLite is the source of truth** for operational data. Cloud is a replica.
- **Touch never talks to the cloud** directly. Master is the only egress point.
- **Every API call from a Master carries `desk_id` in the JWT** and is validated server-side. No header trust.
- **MoneyTrash is opt-in per studio.** Unsold photos never leave a Master without an explicit `opt_in` flag.
- **Idempotency on every write** — `clientMutationId` (Touch→Master), `X-Idempotency-Key` (Master→Cloud), `mutation_ack_log` (Master).

### 2.3 Things we will not do in this plan
- Replace Cloudflare D1 with Postgres. The cost/ops trade is wrong at our scale.
- Build a mobile app from scratch. If we need one, it ships as a PWA on the existing Customer Gallery.
- Re-platform Touch to Tauri in this cycle. Risk > reward.

---

## 3. New Destination Onboarding — The 10-Minute Flow (FULL DETAIL in `02_NEW_DESTINATION_ONBOARDING.md`)

> This is the single most important workflow in the product. Every architectural decision in this plan ladders up to it.

### 3.1 The user-visible flow (one wizard, 7 steps)
```
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Welcome + license key entry         (~10s)          │
│  STEP 2: Cloudflare account link (OAuth PKCE) (~30s)         │
│  STEP 3: This destination profile           (~20s)          │
│  STEP 4: Pair Touch kiosks over ethernet    (~2 min)        │
│  STEP 5: First sync test + heartbeat        (~30s)          │
│  STEP 6: Studio profile (name, branding)    (~30s)          │
│  STEP 7: Launch + show "ready" dashboard    (~5s)           │
│                                                              │
│  Total target: < 10 min including a 5-min coffee.            │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 The 4 things that make this work (and where they already exist)
1. **Bootstrap token** from Hub (one-time, single-use, 24h) — `apps/management/backend/src/routes/masters.ts` already has the `register` endpoint, needs a `/claim` flow.
2. **mDNS + QR pairing** between Master and Touch — `apps/master/backend/services/mdnsDiscovery.ts` + `apps/touch/backend/services/mdnsDiscovery.ts` already ship, just need a Touch-side LAN sweep to find Masters that block mDNS.
3. **Cloudflare provisioning** (D1, R2, KV, Workers, Pages) — `apps/installer/src/services/cloudflareProvision.ts` is built; needs CI token wiring.
4. **Heartbeat → "device online"** in the Hub within 5 seconds — `FleetService.handleHeartbeat` exists, needs to return pending commands (e.g., "new product launched, please pull").

### 3.3 The 3 things that will probably break (and the design-around for each)
| Failure | Design-around |
|---|---|
| No internet at the resort during install | **Offline bootstrap**: pre-sign a `desk_id`+`hub_token` bundle that the installer carries on a USB stick. Replays to Hub on first online. |
| Touch is on a different VLAN from Master (firewall blocks mDNS) | **LAN sweep + static IP fallback**: Touch broadcasts a `_clickflashtouch._tcp` mDNS, then tries `192.168.0.0/16` + `10.0.0.0/8` if no Master responds, then shows a "enter Master IP" screen. |
| Hub unreachable when Master first boots | **Local-first**: Master writes to its own SQLite first, queues the registration in `pending_writes`, sends it the moment Hub is reachable. The Hub treats the registration as authoritative once it lands. |

---

## 4. Per-App Audit & Hardening (FULL DETAIL in `03_PER_APP_AUDIT_AND_HARDENING.md`)

The full per-app audit table, code previews of the fixes, and the 90-day hardening sequence are in the linked document. Headline:

| App | Critical | High | Medium | Top 3 fixes (this quarter) |
|---|---|---|---|---|
| Master | 0 | 2 | 6 | 1. Encrypt SQLite at rest by default. 2. Move CloudSyncService to a 3-file modular split. 3. Auto-update Touch without manual admin. |
| Touch | 0 | 1 | 5 | 1. Wire autoUpdater that exists but is unused. 2. Add `conflicts` UI. 3. Add HTTPS photo pull. |
| Management | 0 | 1 | 4 | 1. Add Zod validation to all routes. 2. Wire `/claim` endpoint. 3. Move `auditService` from in-memory to D1. |
| Gallery | 1 | 3 | 4 | 1. **Fix the 12 failing test suites**. 2. Delete the dual-backend `backend/server.js`. 3. Add Zod schemas on Stripe webhook. |
| MoneyTrash | 1 | 2 | 3 | 1. Full security audit. 2. Webhook idempotency. 3. EXIF scrubbing on upload. |
| Website | 0 | 0 | 0 | None — done. |
| Installer | 0 | 2 | 3 | 1. End-to-end smoke test in CI. 2. Silent/unattended mode for `/S` flag. 3. macOS + Linux build verification. |
| master-cpp | 1 | 1 | 4 | 1. **Strategic decision: ship as Windows-only service, or kill it.** 2. Get a Qt6 build green on Windows. 3. Wire SQLite + SQLCipher. |

---

## 5. master-cpp Decision (FULL DETAIL in `04_MASTER_CPP_FINALIZATION.md`)

The honest read: **apps/master-cpp/** is ~70% scaffolded (59 SQL migrations, 50+ controllers, WorkerPool, ImageProcessor, JWT, LAN signing, all UI views) but **it does not build on this machine** because Qt6 is not installed and the C++ port is a Qt6 **desktop app**, not an HTTP server. That is a strategic mismatch with our actual deployment.

**The decision (this plan recommends):** **Pivot master-cpp to a headless HTTP service using Drogon + SQLiteCpp + spdlog + nlohmann::json + SQLCipher + libsharpyuv.** Keep the Qt6 UI only as an optional admin console. Reasons:
1. The Electron frontend already works. The C++ value is in the **image pipeline + sync engine + offline durability**, not the UI.
2. A headless service is testable in CI (no display required), ships in a container for the cloud side, and compiles 10× faster.
3. We get to reuse the existing 59 SQL migrations verbatim. The C++ port becomes a *port of the backend*, not a re-architecture.

If we keep the Qt6 desktop path: we are 3 engineers × 6 months away from feature parity and a 200 MB Windows installer. Recommend kill + pivot.

---

## 6. Documentation Suite (FULL DETAIL in `05_DOCS_AND_MANUALS.md`)

| Audience | Doc | Format | Length |
|---|---|---|---|
| **Studio Manager** (non-technical) | `USER_MANAGER.md` | Markdown, 1 PDF, 5-min video | 40 pages |
| **Photographer** (tech-curious) | `USER_PHOTOGRAPHER.md` | Markdown, 1 PDF, quick-ref card | 20 pages |
| **Kiosk Customer** | `KIOSK_QUICKSTART.md` | Single A4, large print, pictograms | 1 page |
| **On-site IT Admin** | `INSTALL_ADMIN.md` | Markdown + PowerShell scripts | 60 pages |
| **Cloud Admin (HQ)** | `OPS_RUNBOOK.md` | Markdown, command-rich | 80 pages |
| **Developer** | `DEV_SETUP.md`, `API.md` (exists), `ARCHITECTURE.md` (exists) | Markdown | 100+ pages |
| **Security auditor** | `SECURITY.md` (exists, refresh) | Markdown | 30 pages |
| **End-user license** | `EULA.md`, `PRIVACY.md`, `DPA.md` | Markdown → PDF | 15 pages |

---

## 7. Skills Matrix & Team (FULL DETAIL in `06_SKILLS_AND_RESOURCES.md`)

| Skill | Needed for | Headcount now | Headcount target Q4 |
|---|---|---|---|
| Electron + React 19 | Master, Touch, Installer | 1.5 | 3 |
| Cloudflare Workers + D1 + R2 | Management, Gallery, MoneyTrash | 1 | 2 |
| C++17/20 + CMake + Drogon | master-cpp (if we keep it) | 0.5 | 1–2 |
| Stripe + payments | Gallery, Master checkout | 0.3 | 1 |
| DevOps + CI/CD | All apps | 0.3 | 1 |
| UX / product design | All | 0.5 | 1 |
| Security / GDPR | All | 0.1 | 0.5 |
| QA + Playwright | All | 0.5 | 1 |
| Tech writing | Docs suite | 0.2 | 0.5 |
| **Total engineers** | | **5** | **12** |

We cannot hire our way out of this quarter. The plan is: 5 engineers in parallel, owned by phase.

---

## 8. Roadmap (Quarter View)

```
Q3 2026 (this quarter)                              Q4 2026
─────────────────────────────────────────────────  ─────────────────────────────────────────────
W1–2  Ship 1-click onboarding (Phase 3)             Mobile companion PWA (photographer)
W3    Fix Gallery 12 failing tests + dual backend    Multi-brand / multi-region
W4    Encrypt SQLite at rest (Master + Touch)       AI culling v2 (background)
W5    Wire Touch autoUpdater                         Public API v1
W6    MoneyTrash security audit + webhook idempot.   Stripe Tax + multi-currency
W7    Decide master-cpp: pivot or kill              Customer Gallery v2 (search, share)
W8    Ship user manuals (manager + IT admin)         Annual conference talk
W9    End-to-end smoke for the onboarding flow       Q4 OKR review
W10   Hardening week (no new features)               Q1 2027 planning
W11–12 Buffer / on-call rotation / retros
```

---

## 9. Risks & Open Questions

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Onboarding time does not hit 10 min because Hub is slow in first 60s | Med | High | Ship onboarding with a 60s hard timeout + retry; pre-warm Cloudflare D1 with skeleton schema on first register. |
| 2 | Gallery 12 failing tests block PCI | Med | Critical | This is the one thing we cannot ship around. P0 for week 3. |
| 3 | master-cpp Qt6 build is a 4-week yak-shave | High | Med | Pre-commit to a decision in W7. If we keep it, we fund a dedicated 1-engineer sprint. |
| 4 | Cloudflare API rate limits us during mass onboarding | Med | Med | Pre-warm 1 D1 + 1 R2 per region, route by region. Add 429 retry with jitter. |
| 5 | A resort with no internet on install day | Med | Med | Offline bootstrap bundle (USB stick) + local-first. |
| 6 | GDPR / data-residency request from EU resort | Low–Med | High | Region-pinned R2 bucket, D1 regional replication, DPA doc. |
| 7 | Stripe outage during a busy day | Low | High | Gallery already caches orders in `pending_writes`; verify recovery path. |
| 8 | A studio clones a Master disk to a new resort | Med | Med | Hardware fingerprint + `desk_id` mismatch triggers re-registration. |
| 9 | We do not have a security auditor | Med | Med | Hire fractional CISO; run quarterly-audit.yml on schedule. |
| 10 | 12-month plan assumes 12 hires we may not make | High | Med | Stay scrappy: 5 engineers + smart outsourcing for docs and security. |

---

## 10. CEO Decision Log (this week)

1. ✅ **Approve the 4 priorities in §0.**
2. ✅ **Approve the 1-click onboarding flow (§3) as the only P0 product surface this quarter.**
3. ⏳ **Decide master-cpp (§5) by end of W7.** Recommend: pivot to Drogon headless.
4. ⏳ **Decide go/no-go on Touch macOS** (it is Windows-only today). Recommend: stay Windows-only this year, revisit in Q1 2027.
5. ⏳ **Decide whether to charge for the 1-click onboarding service** (white-glove setup at $1k per location) as a revenue line. Recommend: yes, $500/location for studios > 5 locations.

---

## 11. Document Map

| # | File | Purpose |
|---|---|---|
| 0 | `ECOSYSTEM_MASTER_PLAN_V6.md` (this file) | CEO one-pager, priorities, decisions |
| 1 | `docs/CEO/01_PRODUCT_VISION.md` | Market, ICP, pricing, GTM |
| 2 | `docs/CEO/02_NEW_DESTINATION_ONBOARDING.md` | The 10-minute flow, APIs, code |
| 3 | `docs/CEO/03_PER_APP_AUDIT_AND_HARDENING.md` | Audit, code previews, hardening |
| 4 | `docs/CEO/04_MASTER_CPP_FINALIZATION.md` | Pivot-or-kill decision + port plan |
| 5 | `docs/CEO/05_DOCS_AND_MANUALS.md` | User manuals outline + writing plan |
| 6 | `docs/CEO/06_SKILLS_AND_RESOURCES.md` | Hiring plan, skills matrix, training |
| 7 | `docs/CEO/07_CLOUD_DELIVERY_OPTIONS.md` | **2 versions per app** (offline + online), 14-week build plan, pricing matrix |

---

## 11. The 2 versions per app (NEW in v6.1)

Every app ships in **2 versions** — **Offline** (existing Electron/Tauri/SQLite) and **Online** (new Cloudflare Worker + PWA). The customer picks at install time, and can switch with a 30-second config change. The 2×2 matrix is:

| | **Touch: Offline** (Local) | **Touch: Online** (PWA) |
|---|---|---|
| **Master: Offline** | **Option A — On-Premise Full Offline** | (rare) Hybrid |
| **Master: Online** | (common) Hybrid — HQ in cloud, resort offline | **Option C — Full Online** |

Plus **Option B** is a separate "Cloud Master only" SKU.

**Shared code, not forks:** `packages/master-core/`, `packages/touch-core/`, `packages/installer-wizard/`, `packages/trash-core/` are new shared packages that both versions import. PRs that touch shared code must pass tests in **both** Electron and Worker environments.

**Pricing:** Standard (A) €2k/mo, Cloud Master (B) €2.5k/mo, Cloud Touch (C) €1.5k/mo, Cloud All (B+C) €1.8k/mo. Full architecture and 14-week plan in `07_CLOUD_DELIVERY_OPTIONS.md`.
