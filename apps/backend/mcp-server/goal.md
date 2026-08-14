# ClickFlash Ecosystem - Ultimate Goal & Roadmap

## Vision
To build the most advanced, performant, and visually stunning end-to-end photography management and delivery ecosystem in the market. ClickFlash operates with zero reliance on paid third-party SaaS products (100% custom infrastructure), leveraging Cloudflare (Workers, R2, D1) for the global cloud, and Electron/React Native for local native platforms.

## Core Pillars
1. **Zero Paid SaaS:** Fully self-hosted/custom infrastructure for auth, emails, payments (Stripe), and storage.
2. **Premium Aesthetics (Wow Factor):** Every user-facing interface features state-of-the-art UI/UX (Tactical Industrial for staff, Glassmorphism for guests).
3. **True Cross-Platform:** Desktop (Electron), Mobile (Expo), Web (Vite/Next.js).
4. **Unbreakable Security & Resiliency:** Offline-first architecture. The system MUST work on a beach with zero internet via Local LAN routing.

---

## Ecosystem Routing Architecture (The "Deep" Connection)

To ensure the 6-app ecosystem works flawlessly, we utilize a **Dual-Layer Routing Strategy** (Local Mesh + Global Edge):

### 1. The Local Mesh (Offline-First Survival)
The beach/resort environment has notoriously bad WiFi. The **Master PC** (`apps/master`) acts as the local Server/Hub.
* **Mobile Photographer App** (`apps/mobile-photographer`) shoots photos and transfers them over USB PTP. It then immediately syncs the low-res previews to the Master PC over a Local Area Network (LAN) WebSocket via mDNS discovery.
* **Touch Kiosks** (`apps/touch`) connect exclusively to the Master PC via LAN to pull watermarked images for immediate guest viewing.
* *Result:* Photographers can shoot, and guests can view/buy, even if the resort internet goes down.

### 2. The Global Edge (Cloudflare Backend)
The **Cloud Backend** (`apps/cloud-backend`) runs on Cloudflare Workers.
* **D1 (SQLite at the Edge):** Stores all relational data globally (Bookings, Transactions, Global Settings, Shift Logs).
* **R2 (Object Storage):** Stores the high-res, unwatermarked JPEGs.
* **Sync Engine:** When the Master PC has an internet connection, it runs a background CRON queue to sync the Local SQLite database up to Cloudflare D1, and uploads high-res assets to R2.

### 3. Global Settings & Fleet Propagation
When a manager updates pricing or packages in the **Management Web App** (`apps/management`):
1. App POSTs to Cloudflare Worker.
2. Worker updates Cloudflare D1 `settings` table.
3. Worker sends a WebSocket ping to the registered Master PC.
4. Master PC pulls the new config and broadcasts it over Local LAN to all connected Mobile Apps and Touch Kiosks instantly.

### 4. Client Delivery (The Gallery)
When a guest purchases photos via the **Touch Kiosk** or **Customer Mobile App**:
1. Stripe Webhook fires to the Cloudflare Worker.
2. Worker updates D1 marking the session as "PAID".
3. Worker generates secure, expiring Presigned R2 URLs for the high-res photos.
4. The Guest receives an email (via our custom SMTP worker) with a link to the **Gallery Web App** (`apps/gallery`) to download their memories.

---

## Extended Implementation Roadmap

* **Phase 1-13:** UI, Web, Kiosks, and foundational infrastructure (Completed)
* **Phase 14:** Mobile Photographer App Operations (In Progress - GPS, Biometrics, Stripe Terminal POS)
* **Phase 15 (Ecosystem Routing / Sync Endpoints):** Cloudflare Worker API for global sync and webhooks (Completed)
* **Phase 16 (Fleet-wide Sync Service):** Mobile-photographer app SyncService for LAN PTP routing and global settings sync (Completed)
* **Phase 17 (Automated Fleet Licensing):** Ed25519-secured licensing module for desktop apps (Completed)
* **Phase 18:** AI Intelligence Layer (Automated tagging & grading pipelines)
* **Phase 19:** Final automated Installer generation & Deployment

