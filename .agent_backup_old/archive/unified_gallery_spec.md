# Unified Gallery Specification

## Phase 1: Requirements & Clarification

ClickFlash is an ecosystem for professional event photography (resorts, hotels, weddings), functioning as a franchise of **Pixel Holiday** (pixelholiday.com). The goal is a unified web experience that replaces the separate Lite and Premium apps with a single, high-performance portal.

### Core Dual-Fulfillment Strategy

1. **"Moneytrash" (Unsold Exploration)**:
    * **Source**: Local Master App processes raw photos.
    * **Action**: Master App uploads low-res, watermarked previews ("moneytrash") to the web.
    * **Experience**: Customers browse their event, select favorites, and can "Buy Online".
2. **Purchased Fulfillment**:
    * **Trigger**: Customer completes a purchase (Online or at Kiosk).
    * **Action**: Master App detects the "Sold" status and uploads the High-Resolution (High-Res) original files to a secure fulfillment path.
    * **Experience**: Customer receives a link/email to download high-res files from the Unified Gallery.

### Core Features (The "Unification")

1. **Authentication (The ClickFlash Brain)**:
    * Port standard **QR-Session Login** and **Email + Order ID**.
    * Session validation against local/remote APIs.
2. **Presentation (The Pixieset Beauty)**:
    * **Adaptive Masonry Grid**: High-performance scrolling for 100GB+ collections.
    * **Dynamic Themes**: Minimal, Luxury, and Modern styles.
    * **Watermarking**: Server-side protection for unpurchased assets.
3. **Commerce (The Revenue Brain)**:
    * **Shopping Cart**: Support for digital downloads and physical print packages.
    * **Direct fulfillment**: Integration with the Master App storage.
4. **Client Tools**:
    * **Favorites**: List creation for customers.
    * **Revision Notes**: Direct comments on assets for editing requests.
5. **Franchise Branding**:
    * Metadata-driven branding (ClickFlash vs Pixel Holiday).

### Data Model

- **Collection**: Name, Date, CoverImage, Theme, AccessCode.
* **Sets**: Sub-folders (e.g., Day 1, Dinner, Action).
* **Asset**: URL, Thumbnail, WatermarkedURL, HighResURL (Conditional), PID (PixelID), Status (Unsold/Sold).
* **Order**: Status (Pending/Paid/Fulfilled), Items, CustomerDetails, FulfillmentKey.

---

## Phase 2: Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router).
* **Styling**: Tailwind CSS 4 + Framer Motion.
* **Database**: PocketBase (Shared with ecosystem).
* **Storage**: S3-Compatible Storage (or local file server) with secure pre-signed URLs for sold assets.

---

## Phase 3: Revised Implementation Roadmap

1. **[DONE] Foundation**: Scaffold project, Design System tokens.
2. **[NEXT] Core Logic (The Brain)**:
    * Implementation of `authService.ts` (QR/Email).
    * **New**: `fulfillmentService.ts` (Handles the logic for Sold vs Unsold photo access).
3. **UI/Integration (The Body)**:
    * Build the Masonry Gallery component.
    * Implement the "Buy/Download" button logic (Switching based on asset status).
    * Implement the Premium Cart & Favorites Panel.
4. **Master App Sync (Integration)**:
    * Plan and script the Master App "Sync Agent" to handle the `Local -> Web` push for previews and high-res files.

---

## Phase 4: Verification Plan

- [ ] QR Auto-Login test.
* [ ] Test "Unsold" (Watermarked) vs "Sold" (High-Res) view states.
* [ ] Checkout flow simulation.

**Does this revised specification (including the Moneytrash vs Sold High-Res strategy) match your requirements? Type 'Approved' to proceed.**
