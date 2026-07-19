# 📸 ClickFlash Ecosystem Deep Dive: 360° Architectural & Feature Overview

ClickFlash is a 6-app ecosystem designed for professional photography businesses, built in a Turbo monorepo. It features local-first, offline-capable desktop applications for studio operations, combined with fully online cloud-deployed portals for customer interaction and central management.

---

## 🏗️ High-Level Architecture & Tech Stack

- **Monorepo Manager**: Turborepo (Turbo 2.x) with PNPM Workspaces.
- **Frontend Core**: React 19, TypeScript 5.7, Tailwind CSS 3.x, Vite 7.x.
- **Desktop Strategy**: Electron 39.x (for Master and Touch apps) and Tauri 2.x (for Money Trash uploader).
- **Backend Strategy (Offline)**: Express.js 5.x with local SQLite databases.
- **Cloud Backend Strategy (Online)**: Cloudflare Workers with D1 (SQL edge database) and R2 (Object Storage).
- **Web App Strategy**: Next.js 15/16 (App Router) for the main Website and the Money Trash Uploader.
- **Payments**: Stripe 20.x integration.
- **Cross-App Communication**: 
  - LAN: WebSockets for real-time Master ↔ Touch Kiosk sync.
  - Cloud Sync: Custom synchronization service pushing data from the Master node to Cloudflare D1.

### 📦 Shared Packages (`/packages/`)
- `@clickflash/api`: Shared API contracts and endpoints.
- `@clickflash/config`: Global configurations and environment constants.
- `@clickflash/database`: Shared schemas and database utilities.
- `@clickflash/logger`: Centralized logging using a custom `logger` module (never `console.log`).
- `@clickflash/shared`: Common utilities and business logic.
- `@clickflash/telemetry-web`: Web telemetry/analytics tracking.
- `@clickflash/test-utils`: Test helpers and mocks.
- `@clickflash/types`: Universal TypeScript interfaces and models.
- `@clickflash/ui`: Shared React components.
- `@clickflash/validation`: Zod schemas for input validation.

---

## 📱 1. Master Portal (`apps/master/`)
**Type:** Electron + React 19 Desktop App (Offline-First)  
**Port:** 8090  
**Purpose:** The central nervous system for a local photography studio. Controls devices, albums, syncs data, and serves the Touch Kiosk over LAN.

### 📍 Routes & Views (React Router + State)
- **`/` (Main Layout)**
  - **Dashboard:** Central overview, live stats, local data status.
  - **LocalResortDashboard:** Specialized dashboard for resort/hotel operational metrics.
  - **Albums:** Album management, photo ingestion, metadata editing.
  - **Bookings:** Customer appointment scheduling and calendar management.
  - **Orders:** Order processing, review, and fulfillment status.
  - **Clients:** Customer database, CRM features.
  - **Photographers:** Staff management, assignment, performance tracking.
  - **Settings:** App configuration, hardware pairing, network setup.
  - **Growth:** Business metrics, targets, marketing tracking.
- **`/audit`:** System Audit view (Admin-only) for tracking auth and data access.

### ⚡ Key Features
- **Offline Reliability:** Built-in Express backend + SQLite database allows 100% operation without internet.
- **Role-Based Access Control (RBAC):** Granular permissions (`can("viewDashboard")`, `can("viewAlbums")`, etc.).
- **Print & Receipt Generation:** Dedicated `PrintLayout` and `CustomerReceipt` views for physical output.
- **Assistance Notifications:** Real-time requests from the Touch Kiosk.
- **Data Versioning & Sync:** Conflict resolution ("Server Wins" strategy) and incremental syncing.
- **AI Ideas Modal:** Integrated AI assistant for business growth and operational insights.
- **Thermal & Job Monitors:** `ThermalMonitor` and `BackgroundJobRunner` ensure system stability during heavy photo processing.

---

## 📱 2. Touch Kiosk (`apps/touch/`)
**Type:** Electron + React 19 Desktop App (Offline-First)  
**Port:** 8091  
**Purpose:** Customer-facing self-service kiosk. Designed to run on a tablet or touch screen in the studio. Connects exclusively to the Master Portal on the LAN.

### 📍 Views (State-Based Navigation)
- **Welcome (`welcome`):** Attract screen, screensaver, login prompts (RFID or Face).
- **Photo Selection (`photos`):** Grid view of assigned albums or room-specific photos.
- **Photo Detail (`photo-detail`):** Full-screen preview, add to cart.
- **Order Configuration (`order-config`):** Cart review, checkout process.

### ⚡ Key Features
- **Strictly Offline & Private:** Zero external internet. Talks *only* to the local Master Portal (Port 8090).
- **RFID & Wristband Integration:** Hardware scanner support. Scanned UID maps to a hotel room or customer profile, automatically filtering the photos shown.
- **Smart-Sync Persistence:** Carts are stored in `localStorage` to survive accidental kiosk reboots.
- **Admin Override:** Secret key combination (`Ctrl+Shift+Alt+F12`) to exit kiosk mode.
- **Face Search / Login:** Biometric integrations (if enabled via global features).

---

## 📊 3. Management Hub (`apps/management/`)
**Type:** React 19 + Vite (Cloud App)  
**Backend:** Cloudflare Workers + D1  
**Purpose:** Global, multi-site enterprise dashboard. Used by executives and regional managers to track performance across all studios/hotels.

### 📍 Routes & Views (Command-Bar & Sidebar Navigation)
- **Executive Dashboard (`executive_dashboard`):** High-level KPI overview across all locations.
- **Stations Overview (`stations_overview`):** Fleet monitor showing active/offline Master Portals.
- **Orders & Sales (`orders_sales`):** Global order tracking.
- **Assets & Inventory (`assets_inventory`):** Camera, lens, and media inventory management (Warehouse).
- **Revenue & Income (`revenue_income`):** Unified finance page.
- **Expenses & Payroll (`expenses_payroll`):** Staff payroll and expense tracking.
- **Capital & Treasury (`capital_treasury`):** Investment and asset tracking.
- **Billing & Subscription (`billing_subscription`):** SaaS/License billing.
- **Staff Management (`staff_management`):** Global photographer database.
- **Session Types (`session_types`):** Pricing and product configuration for photo sessions.
- **Reports & Insights (`reports_insights`):** Advanced analytics.
- **Sync Logs (`sync_logs`):** Monitor data ingestion from local Master portals.

### ⚡ Key Features
- **Context Selector:** Switch between "Global" view or drill down into specific Hotel/Site contexts.
- **Fleet Sync Orchestrator:** Real-time ping system showing exact count of online Master Portals.
- **Global Command Bar:** Hit `Cmd+K` to search anything or jump to any view instantly.
- **AI Chat Bot:** Integrated "PixelFounder" AI assistant for querying business data.
- **Offline Tolerance:** Includes an `OfflineScreen` fallback if the manager loses internet connection.

---

## 🛍️ 4. Customer Gallery (`apps/gallery/`)
**Type:** React 19 + Vite (Cloud App)  
**Backend:** Cloudflare Workers + D1 + R2 + Stripe  
**Purpose:** Public-facing cloud portal where customers view their photos after they leave the studio/resort, share with family, and purchase digital or print products.

### 📍 Routes & Views (State-Based Navigation)
- **Gallery (`Gallery`):** Main grid of photos with proofing features.
- **Store (`Store`):** E-commerce storefront for physical prints, canvases, and albums.
- **Favorites (`Favorites`):** Filtered view of liked photos.
- **Download (`Download`):** Access to purchased high-res files.
- **Status (`Status`):** Order tracking and receipt viewing.
- **Buy Photos (`Buy Photos`):** Unassigned/Archived photo gateway (The "Money Trash" gallery).

### ⚡ Key Features
- **Passwordless Auth:** Magic link (`?token=`), QR Code Session, or Email + PIN login.
- **Enhanced Lightbox:** Swipeable full-screen viewing experience.
- **Stripe Checkout:** Integrated modal for purchasing physical/digital products.
- **Proofing System:** Customers can approve, reject, or mark photos as pending.
- **Social Sharing:** Built-in sharing modals.
- **Abandoned Cart Sync:** Carts are continuously synced to D1. If the user drops off, it triggers an abandoned cart recovery email workflow.

---

## 💰 5. Money Trash Uploader (`apps/moneytrash/`)
**Type:** Next.js 16 + Tauri  
**Port:** 3000  
**Purpose:** A dedicated, robust desktop gateway for photographers to rapidly ingest SD cards and upload massive batches of RAW/JPEG photos to the cloud.

### 📍 Routes
- **`/` (Home):** The main interface containing the drag-and-drop zone and upload manager.

### ⚡ Key Features
- **Tauri Desktop Engine:** Bypasses browser memory limits, allowing for huge gigabyte-scale bulk uploads directly from SD cards.
- **Progress Tracking:** Granular upload progress bars per file and per batch.
- **Upload History:** Logs of previous ingestion sessions for accountability.

---

## 🌐 6. Main Website (`apps/website/`)
**Type:** Next.js 15 (App Router) + Tailwind 4  
**Port:** 3001  
**Purpose:** The marketing storefront for the ClickFlash business, used to attract clients, recruit photographers, and provide company information.

### 📍 Routes (App Directory)
- **`/`**: Home Page (Hero, Features, Testimonials).
- **`/about`**: Company story and team.
- **`/blog`**: Content marketing & SEO articles.
- **`/bookings`**: Public appointment scheduling.
- **`/careers`**: Job openings for photographers.
- **`/clients`**: Customer login gateway & client roster.
- **`/portfolio`**: Showcasing best work.
- **`/pricing`**: Pricing tiers for sessions.
- **`/services`**: Detailed service offerings (Weddings, Resorts, Studio).
- **`/contact`, `/faq`, `/privacy`, `/terms`**: Standard informational pages.
- **`/[slug]`**: Dynamic routing for individual blog posts or generic pages.

### ⚡ Key Features
- **SEO Optimized:** Utilizes Next.js `metadata.ts`, `sitemap.ts`, and `robots.ts`.
- **High Performance:** SSR and SSG capabilities for instantaneous page loads.

---

## ⚙️ Development & Scripts
The monorepo contains a highly automated developer experience:
- **`npm run dev:legacy`**: Concurrent startup of all apps (`master`, `touch`, `management`, `gallery`, `website`).
- **`npm run test:e2e`**: Full ecosystem integration testing via Playwright.
- **`npm run docker:up`**: Spins up the entire 6-app ecosystem locally using Docker Compose.

*This concludes the 360-degree deep dive into the ClickFlash Architecture.*
