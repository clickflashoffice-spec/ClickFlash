# MASTER FINALIZATION PLAN: "Mission Control v5.0"

This plan outlines the terminal steps to bring the entire ClickFlash ecosystem into a secure, production-hardened, and commercially ready state.

## 🎯 Global Objectives

- **Zero-Trust Sync**: Master App remains the sole high-res authority.
- **Obsidian Gold Standard**: Consistent luxury UI across all apps.
- **SEO & Speed**: Lightning-fast portfolios with dynamic discovery.

---

## 💻 App 1: Master-App (The Authority)

*The local processing hub for raws, watermarks, and fulfillment.*

### 🛠️ Part 1: Logic & Sync (The Brain)

- [ ] **Moneytrash Worker**: Continuous background generation of 1200px `.webp` watermarked previews.
- [ ] **Sync Agent**: Implement robust `Local -> Cloud` upload for `retention_queue` items.
- [ ] **Fulfillment Bridge**: Watch `fulfillment_queue` -> Zip High-Res -> Secure Upload to Cloudflare R2.

### 🎨 Part 2: Operator Interface (The Body)

- [ ] **Dashboard v5.0**: Real-time sync status, temperature monitoring, and "Cloud Publish" toggles.
- [ ] **Collection Manager**: Add individual "Second Chance" pricing and timing settings per album.

---

## 📱 App 2: Touch-App (The Kiosk)

*The guest-facing interface for local selection and QR entry.*

### 🛠️ Part 1: Reliability (The Brain)

- [ ] **Idempotent Ordering**: Assign UUIDv4 to every order. Retry sync until Master confirms receipt.
- [ ] **QR Handover**: Pass encrypted session tokens in URLs for frictionless mobile transition.

### 🎨 Part 2: Interactive Store (The Body)

- [ ] **Selection UI**: Add "Select All" with tiered pricing logic (Buy 10, get 2 free).
- [ ] **Thermal Safe Mode**: Visual indicator if the local printer is overheating.

---

## 🌐 App 3: Unified Webapp (The Storefront)

*Global gallery access and customer checkout.*

### 🛠️ Part 1: Infrastructure (Foundation)

- [ ] **PocketBase Parity**: Finalize production schema for Collections/Assets/Orders.
- [ ] **R2 Link Handler**: Generate 1-hour pre-signed URLs for purchased high-res assets.

### 🎨 Part 2: Commerce Logic (The Brain)

- [ ] **Stripe Production**: Switch from Mock to Live API.
- [ ] **Order Watcher**: Real-time listener for `paid` orders to signal the local Master App for fulfillment.

---

## 🪄 App 4: ClickFlash Website Builder (The CMS)

*The SaaS-like portfolio engine for professional showcases.*

### 🛠️ Part 1: SEO & Scale (The Brain)

- [x] **Dynamic Metadata**: Already implemented in `app/sites/[slug]/page.tsx`.
- [x] **Automated Sitemap**: Active in `sitemap.ts`.
- [ ] **Custom Domains**: Research CNAME mapping logic for premium subscribers.

### 🎨 Part 2: Visual Builder (The Body)

- [ ] **Style Presets**: Add "Dark Luxury" vs "Minimal Light" global toggles in the builder sidebar.
- [ ] **Lead Form Block**: Add a configurable "Contact & Booking" block with WhatsApp sync.

---

## 🚢 Deployment Strategy (Phase 27)

1. **Infrastructure**: Provision CX22 nodes on **Hetzner**.
2. **Domain**: Point `clickflash.pro` to **Vercel**.
3. **SSL**: Automated certs via Cloudflare.
4. **Maintenance**: Setup automated `.db` backups every 24 hours.

---
Verify: [Fixed | New Error | Next Phase]?
