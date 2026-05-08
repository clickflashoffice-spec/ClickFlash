# Unified Gallery Plan: "Pixel-Flash" Architecture

This document outlines the detailed design, feature set, and mechanisms for the **Unified Gallery** application (Internal Codename: *Pixel-Flash*). This serves as the master blueprint before full-scale build.

---

## 1. Design Philosophy & Visual Language

**Goal**: Merge the *efficiency* of ClickFlash with the *luxury* of Pixel Holiday.

### 1.1 Aesthetic Themes (Dynamic Switching)

The app will support 3 distinct themes, configurable per Collection:

| Theme | Visual Style | Typography | Use Case |
| :--- | :--- | :--- | :--- |
| **Luxury** (Default) | Deep Zinc/Black backgrounds, Gold gradients, Glassmorphism, Serif headers. | *Cinzel* (Header) + *Inter* (Body) | Weddings, High-End Events |
| **Minimal** | Stark White/Gray, Clean lines, No borders, excessive whitespace. | *Outfit* (Header) + *Roboto* (Body) | Corporate, Commercial |
| **Vibrant** | Bold colors, rounded corners, playful interactions, large buttons. | *Fredoka* (Header) + *Nunito* (Body) | Waterparks, Resorts |

### 1.2 Interactive Mechanisms

* **"Living" Grid**: The Masonry layout will use `framer-motion` layout animations. When photos load, they fade in with a staggered upward drift.
* **Glass Drawers**: Carts, Comments, and Filters will slide in from the right as frosted glass overlays (backdrop-blur-xl), preserving context of the gallery behind.
* **Instant Feedback**: "Hearting" a photo triggers a micro-explosion of particles (using a lightweight canvas emitter).

### 1.3 Branding "Skin"

* **Franchise Meta-Tag**: The app reads a generic `<BrandingProvider>` config.
* **Asset Injection**: Logos, Favicons, and Support Emails are injected at runtime based on the domain or query param (`?brand=pixelholiday` vs `?brand=clickflash`).

---

## 2. Core Feature Set (The 4 Pillars)

### Pillar A: "Frictionless" Entry (Authentication)

* **QR Session Handover**:
    1. User scans QR at Kiosk/TV.
    2. URL contains `?session=<encrypted_token>`.
    3. Cloud API verifies token; auto-logs in.
* **"Magic Link" Fallback**:
    1. User buys at desk, gives email.
    2. User gets email with one-click login link.
* **Legacy**: Room Number + Last Name (configurable).

### Pillar B: The "Moneytrash" Data Flow (Commerce Mechanism)

* **State 1: Unsold ("Moneytrash")**
  * **Asset**: 1200px Long-Edge JPEG.
  * **Overlay**: Server-side watermarked OR CSS-based dynamic watermark (harder to scrape).
  * **Action**: "Add to Cart" / "Buy Print".
* **State 2: Sold (Fulfillment)**
  * **Asset**: Original Resolution (4000px+) JPEG.
  * **Overlay**: None.
  * **Action**: "Download Original" / "Share".
  * **Mechanism**: Cloud detects `Order:Paid` -> Master Syncs High-Res -> Cloud Updates Asset Record.

### Pillar C: Client Collaboration Tools

* **"Edit Request" System**:
  * User clicks "Comment".
  * Selects a predefined tag: "Make B&W", "Crop", "Remove Person".
  * Master App operator sees these tags in the workflow.
* **Favorites Lists**:
  * "pool-selection", "dinner-favorites".
  * Shareable URLs for family members.

### Pillar D: Offline/Online Hybrid Mode

* **Offline First**:
  * App utilizes Service Workers (`next-pwa`) to cache the UI shell.
  * If internet cuts, users can still view loaded previews.
* **Sync Queue**:
  * "Hearts" and "Cart Adds" made offline are stored in IndexedDB.
  * Synced to Cloud when connection restores.

---

## 3. Technical Mechanisms

### 3.1 The "Offline-to-Cloud" Architecture (Corrected)

The **Master App** (Desktop) is the single source of truth and operates offline. It syncs data to an **Online Cloud Server** (hosting the Unified Gallery) only when internet is available. The **Touch App** is completely decoupled from this flow.

* **Distributed Network**: 100+ Master Nodes globally push to a single Central Cloud.
* **Master App**:
  * Holds high-res originals locally.
  * Runs a **"Cloud Sync Agent"** (NodeJS/TypeScript).
  * **Identity**: Authenticates with a unique `DESK_ID`.
  * Push: Uploads watermarked previews & metadata to the Cloud Database.
  * Pull: Downloads "Paid Orders" for its specific `DESK_ID` from Cloud.
* **Cloud Server (Unified Gallery)**:
  * Hosted online (e.g., Vercel + Cloud PocketBase).
  * Serves the customer gallery globally.
  * Stores orders and user sessions.

### 3.2 The "Cloud Sync Agent" (NodeJS Service)

A background service running on the **Master App** machine:

1. **Upstream Sync (Master -> Cloud)**:
    * **Trigger**: Operator clicks "Publish to Web" or auto-sync on idle.
    * **Data**: Pushes JSON metadata (Albums, Photos) tagged with `DESK_ID`.
    * **Assets**: Uploads `*_preview_wm.webp` (Watermarked) to Cloud Storage (S3/R2).

2. **Downstream Sync (Cloud -> Master)**:
    * **Trigger**: Polls Cloud PB for `orders` with status=`paid`.
    * **Fulfillment**:
        1. Master App receives order.
        2. Locates high-res files on local disk.
        3. Generates secure zip/download package.
        4. Uploads fulfillment package to Cloud S3.
        5. Emails customer the download link.

### 3.3 Security & Protection

* **Watermark Layer**: Generated locally by Master App before upload.
* **Cloud Auth**: Web Gallery uses cloud-native auth; Master App authenticates via API Key.
* **Right-Click Trap**: UI protection on the web gallery.

### 3.4 Hydration Strategy

* **Technique**: Use React Server Components (RSC) for the initial Shell.
* **Client Islands**: `<MasonryGrid />` and `<CartSidebar />` for interactivity.

---

## 4. User Journey Map

1. **Discovery**: Guest scans QR code on their Room TV or receipt.
2. **Entry**: Mobile browser opens `gallery.clickflash.com`. Instant Login.
3. **Wow Moment**: "Welcome, Family!" (Personalized). Hero banner shows their best photo (AI selected).
4. **Browsing**: Scroll through "Pool Day", "Gala Dinner" sets. Photos are watermarked.
5. **Selection**: Guest taps "Heart" on 10 photos.
6. **Purchase**: Guest clicks "Buy All Digital".
7. **Payment**: Integrated Stripe/Apple Pay.
8. **Fulfillment**: "Processing..." screen.
9. **Delivery**: Master App syncs high-res. Customer gets email/link to download.

---

**Approval Request**
Does this architectural plan cover all the necessary scope before we proceed to coding the implementation detail?
