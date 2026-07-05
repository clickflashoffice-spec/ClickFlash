# 07 — Offline & Online Versions (2 delivery modes per app)

> **The product now ships in 2 versions — Offline-First and Online-First — for every app, with a 3rd delivery option that mixes the two.**  
> The Cloud Delivery Options (file 07 was earlier draft; this v6.1 update supersedes it) are now framed as a 2×2 matrix: **(Master mode × Touch mode)**.

---

## 0. The mental model

| | **Touch: Offline** (Local) | **Touch: Online** (PWA) |
|---|---|---|
| **Master: Offline** (Local Windows PC) | **Option A — On-Premise Full Offline** | (rare) Hybrid: Master offline, Touch online |
| **Master: Online** (Cloudflare Worker) | (common) Hybrid: Master in cloud, Touch offline at the resort | **Option C — Full Online (PWA Master + PWA Touch)** |

Plus **Option B** is a separate "Cloud Master only" SKU where the customer doesn't even get a Master installer.

**The user's instruction:** *"offline version and online version"* = every app ships in both flavors. The customer picks at install time, and can switch with a 30-second config change.

---

## 1. What "Offline" means for each app

| App | Offline version | Online version |
|---|---|---|
| **Master** | Electron + local SQLite, runs at the resort. Works for weeks without internet; syncs to cloud async when online. | A Cloudflare Worker + D1 + R2. No local install. |
| **Touch** | Electron + IndexedDB on a Windows tablet, paired to a Master over ethernet. Works for the duration of the resort's outage. | A PWA served from Cloudflare Pages. Camera, install-to-homescreen, fails closed when offline. |
| **Installer** | Single .exe that installs the Offline Master + Touch from a USB stick. | A web-based "Setup Wizard" at `setup.clickflash.app` that provisions a Cloud Master + gives the admin a Touch PWA URL. |
| **Customer Gallery** | Static export of the Gallery frontend, hosted on R2 + Pages. Same code. | Same code. (Gallery is already online-only by nature; "offline" is the read-only local cache in the PWA Touch's service worker.) |
| **MoneyTrash** | Windows .exe that uploads from the resort's local network to R2 via the Master. | A web uploader that the photographer opens in any browser. |
| **Management Hub** | (None — the Hub is online-only by definition; it's the *control plane*.) | Cloudflare Worker — already online. |
| **Website** | (None — marketing.) | Next.js static — already online. |

**The 2 versions of each app share the same TypeScript code** where possible. The differences are:

- **Bundler target:** Electron (offline) vs Web (online).
- **Storage:** better-sqlite3 (offline) vs D1 + R2 (online).
- **Auth:** local JWT signed by Master (offline) vs Hub JWT (online).
- **Update mechanism:** electron-updater (offline) vs auto-deploy via wrangler (online).

---

## 2. The 2 versions of Master

### 2.1 Master Offline (`apps/master/`)

- **Already exists.** Electron + Express + better-sqlite3 (SQLCipher when encryption lands).
- **Works for weeks without internet.** Queue of operations in `pending_writes`; replays on reconnect.
- **Updates** via electron-updater. Same code path as Touch offline.
- **Customer pays for:** €2k/mo + €200/site setup.

### 2.2 Master Online (new — `apps/management/backend/src/cloudMaster/`)

- **Cloudflare Worker** + D1 + R2. No install.
- **One Worker per tenant** (separate routes + D1 namespaces per `tenant_id`) for blast-radius isolation. (Actually: one Worker, but the SQL is parameterized on `desk_id` — see file 07 §3.1 for the diff.)
- **Updates** via `wrangler deploy` (CI on every merge to main).
- **Customer pays for:** €2.5k/mo, no setup fee.

### 2.3 Master offline → online migration

The customer runs the **Installer**, picks "Switch to Cloud", and:
1. The local Master **streams its entire SQLite DB to the Hub** over WebSocket (chunked, idempotent, 1k rows/sec).
2. The Hub **replays the same operations** in D1.
3. The Touches **re-pair** to the Cloud Master's URL instead of the local Master.
4. The local Master **shuts down**.

Reverse migration (cloud → offline) is the same in reverse: admin clicks "Download a copy", gets a 30 GB USB stick with the latest DB.

---

## 3. The 2 versions of Touch

### 3.1 Touch Offline (`apps/touch/`)

- **Already exists.** Electron + IndexedDB on a Windows tablet.
- **Pairs to the Master** over ethernet (mDNS + LAN sweep + QR fallback).
- **Survives the resort losing internet** for the entire duration of a 14-day vacation.
- **Customer pays for:** included in Option A.

### 3.2 Touch Online (new — `apps/touch-pwa/`)

- **PWA** served from Cloudflare Pages.
- **Pairs to a Cloud Master** over the internet (the Hub signs the kiosk secret directly — no LAN pairing needed).
- **Install to Home Screen** on iPad / Android: the PWA looks like a native app.
- **Survives a 5-second network blip** via Service Worker; fails closed after that.
- **Customer pays for:** included in Option C.

### 3.3 Touch offline → online migration

The customer goes to the admin dashboard, clicks "Send Touch to staff", and:
1. The Master **generates a one-time pairing QR code** for each Touch.
2. Staff **scans the QR** on their iPad.
3. The PWA Touch **imports the local IndexedDB cache** of albums via the Service Worker (background sync, no user action).
4. The Electron Touch **uninstalls itself** on next launch (admin-triggered).

---

## 4. The 2 versions of Installer

### 4.1 Installer Offline (`apps/installer/`)

- **Already exists.** Electron + electron-builder. Builds to a 100 MB .exe.
- The 7-step wizard runs entirely offline if the customer provides a `bootstrap.zip` (issued by HQ as a signed USB bundle — already specced in 02 §4.7).
- Used for: greenfield installs at resorts with no internet on install day.

### 4.2 Installer Online (new — `setup.clickflash.app`)

- **A web app** at `setup.clickflash.app` that does the same 7-step flow in the browser.
- The admin signs in with their Hub account, picks the deployment type (On-Premise A, Cloud Master B, Cloud Touch C, Cloud All), and is walked through:
  1. License key validation.
  2. OAuth device code → "scan with your phone" flow.
  3. Destination profile (desk_id, location).
  4. If A: download the 100 MB .exe and run it on the resort's PC.
  5. If B: provisioning is instant — admin is shown the Cloud Master URL and can test it in 60 seconds.
  6. If C: admin is shown N QR codes (one per kiosk) to print and stick on the tablets.
  7. Ready.

The 2 versions of the Installer **share the same React wizard components** — both live in `packages/installer-wizard/` (a new shared package). The Electron shell wraps the wizard for offline; the Cloudflare Pages app hosts it for online.

---

## 5. The 2 versions of MoneyTrash

### 5.1 MoneyTrash Offline (`apps/moneytrash/`)

- **Already exists.** Tauri (Rust) desktop app + Cloudflare backend.
- The desktop app uploads from a local folder to R2 via the Cloudflare backend.
- Used at the resort's front-desk PC.

### 5.2 MoneyTrash Online (new — `apps/moneytrash-web/`)

- **A web uploader** at `trash.clickflash.app/upload`.
- Photographer drags photos into the browser; Service Worker streams them to R2 via signed URLs (5 GB / batch).
- No install. Works on any device.
- Used by photographers who don't have access to the resort's front-desk PC.

---

## 6. The "Offline + Online" combo: Option B'

The **most common production deployment** we expect to sell in 2026 is:
- **Master Online** (Cloudflare Worker) — for the brand HQ.
- **Touch Offline** (Electron on a Windows tablet at each resort) — for the front desk.

Why? The brand HQ has IT staff and wants the cloud. The resort has a flaky 4G connection and a Windows tablet they bought 3 years ago. Option B' is "Master online, Touch offline" — a configuration flag, not a separate product.

```
[Brand HQ]                                [Resort]
┌───────────────────────┐   internet     ┌─────────────────┐
│ Cloud Master (B)      │◄──────────────►│ Touch Offline   │
│ Cloudflare Worker     │  signed URLs   │ Electron + LAN  │
│ D1 + R2               │  for photos    │ no internet OK  │
└───────────────────────┘                └─────────────────┘
```

The Touch Offline code is the same; only `MASTER_URL` changes from `http://192.168.1.50:8090` to `https://hub.clickflash.app`.

---

## 7. The 2 versions of Customer Gallery (and why it's a small change)

The Customer Gallery (`apps/gallery/`) is already a Cloudflare Worker + static frontend. The "offline version" is just the **Service Worker** in the Touch-PWA's cache — the Gallery frontend, when visited, gets a copy stored locally so the PWA can show the read-only album list when offline.

The Gallery itself does not get a separate "offline app". It is the read-side of both Master versions. The **Touch's offline UX is the only thing that needs the Gallery in the Service Worker cache.**

---

## 8. The architecture diagram (final)

```
                                ┌─────────────────────────────────────┐
                                │   Management Hub (Cloudflare)       │
                                │   - OAuth Device Code               │
                                │   - Fleet Dashboard                 │
                                │   - Audit (D1)                      │
                                │   - Licensing                       │
                                └──────────────┬──────────────────────┘
                                               │
                ┌──────────────────────────────┼──────────────────────────────┐
                │                              │                              │
       ┌────────▼─────────┐           ┌─────────▼──────────┐         ┌─────────▼──────────┐
       │ MASTER           │           │ MASTER             │         │ MASTER             │
       │ OFFLINE          │           │ ONLINE             │         │ ONLINE (same)      │
       │ apps/master/     │           │ apps/.../cloud-    │         │                    │
       │ Electron + SQLit │           │ master/ (CF Worker │         │                    │
       └────────┬─────────┘           │ + D1 + R2)         │         │                    │
                │                     └─────────┬──────────┘         └─────────┬──────────┘
                │ LAN (mDNS/HMAC)              │ internet                    │ internet
                │                              │                             │
       ┌────────▼─────────┐           ┌─────────▼──────────┐         ┌─────────▼──────────┐
       │ TOUCH            │           │ TOUCH              │         │ TOUCH              │
       │ OFFLINE          │           │ OFFLINE (hybrid)   │         │ ONLINE (PWA)       │
       │ apps/touch/      │           │ apps/touch/        │         │ apps/touch-pwa/    │
       │ Electron + IDB   │           │ same as A,         │         │ React 19 + Workbox │
       └──────────────────┘           │ MASTER_URL=https://│         │ install-to-homescrn│
                                      └────────────────────┘         └────────────────────┘

  For MoneyTrash the same 2 versions (offline Tauri / online web uploader) plug into the same Hub.
  For Installer the same 2 versions (Electron .exe / web wizard at setup.clickflash.app) cover both
  offline-install and online-provision paths.
```

---

## 9. The matrix (one more time, cleanly)

| App | Offline version | Online version | Shared package | Switching cost |
|---|---|---|---|---|
| **Master** | `apps/master/` (Electron + SQLite) | `apps/.../cloudMaster/` (CF Worker + D1) | `packages/master-core/` (handlers, services) | 30s — config flag |
| **Touch** | `apps/touch/` (Electron + IDB) | `apps/touch-pwa/` (PWA) | `packages/touch-core/` (UI, sync logic) | 1 min — re-pair QR |
| **Installer** | `apps/installer/` (Electron .exe) | `setup.clickflash.app` (web) | `packages/installer-wizard/` (the 7 steps) | none — same wizard |
| **MoneyTrash** | `apps/moneytrash/` (Tauri) | `apps/moneytrash-web/` (web uploader) | `packages/trash-core/` (Cloudflare backend unchanged) | none — same Hub route |
| **Customer Gallery** | (Service Worker cache in Touch-PWA) | (the same app, always online) | unchanged | none |
| **Management Hub** | (none — control plane is always online) | `apps/management/` (CF Worker) | unchanged | none |
| **Website** | (none — marketing) | `apps/website/` (Next.js) | unchanged | none |

---

## 10. The 14-week build plan for the 2 versions

(Assuming Option A and the OAuth work in W1–W2 are already done.)

| Week | Stream | Deliverable |
|---|---|---|
| W3 | Offline→Online porting | Extract `packages/master-core/` and `packages/touch-core/` from the existing Electron apps. |
| W4 | Master Online | First CF Worker entrypoint, `/api/cloud-master/<desk_id>/api/orders` working against D1. |
| W4 | Installer Online | Scaffold `setup.clickflash.app` as a Cloudflare Pages app, hosting the 7-step wizard from `packages/installer-wizard/`. |
| W5 | Master Online | Add all 21 Master routes; ship to staging. |
| W5 | Installer Online | Wire OAuth Device Code + License validate into the web wizard. |
| W6 | Touch Online | Scaffold `apps/touch-pwa/` Vite + React 19 + Workbox. |
| W6 | Installer Online | Wire Step 2.1 (where will the Master run?) and Step 4 (Touch PWA QR codes). |
| W7 | Touch Online | Port the 3 highest-traffic Touch routes; wire to Cloud Master. |
| W7 | Installer Online | End-to-end: A, B, C all completable from the web wizard. |
| W8 | MoneyTrash Online | Scaffold `apps/moneytrash-web/` with drag-and-drop + signed-URL upload. |
| W8 | All | Beta with 3 design partners (1 per option). |
| W9 | All | Bugfix week. |
| W10 | All | Marketing site updates + trade show demo. |
| W11 | All | GA. Pricing live. Sales playbook written. |
| W12 | All | First paying customer on Option C. |

---

## 11. The 4 risks (and the plan)

### Risk 11.1 — Two codebases diverge
- The offline and online versions of Master share `packages/master-core/`. If a fix lands in offline and not online, we silently break Cloud Master customers.
- **Mitigation:** a single shared test suite in `packages/master-core/test/` runs in **both** Electron and Worker environments (using `cloudflare:test` for the Worker side). PRs that touch master-core cannot merge until both test runs are green.

### Risk 11.2 — Offline Touch silently loses data
- The Electron Touch's IndexedDB queue is good, but a power loss in the middle of a 100-photo upload means we re-send. With idempotency keys this is safe; without, we double-charge the customer.
- **Mitigation:** `clientMutationId` is mandatory on every Touch → Master write, enforced by a Zod schema on the Master. Existing code mostly has it; we audit the gaps in W3.

### Risk 11.3 — Online Touch PWA cannot be a real kiosk
- A 5-year-old iPad in kiosk mode at a resort's front desk can be exited by any guest who knows the swipe gesture.
- **Mitigation:** Option C's marketing line is "install on any tablet, accept that staff can leave the app — it's a content surface, not a cash register." For locked-down kiosk mode, customers choose Option A. We do NOT pretend Option C is a kiosk in the security sense.

### Risk 11.4 — D1 latency for the Cloud Master
- D1 reads in a regional POP average 5–15ms. Writes are 20–80ms. Some Express handlers did `for (let i = 0; i < n; i++) await db.run(...)` — that becomes slow.
- **Mitigation:** the `dbAdapter` supports a `dbBatch` method that issues D1 `batch([...])` (1 round-trip). All N+1 loops in the handlers get a one-line fix.

---

## 12. What this plan explicitly does NOT do

- **No native mobile app** (iOS/Android) — the PWA is good enough for 2026; revisit Q1 2027.
- **No white-label reseller program** — that's a 2027 conversation.
- **No usage-based pricing** — keep it per-seat / per-Master. Simpler for finance.

---

*End of 07. The v6.1 plan is now complete: CEO vision, onboarding, hardening, master-cpp, docs, skills, **2 versions per app (offline + online)**.*

