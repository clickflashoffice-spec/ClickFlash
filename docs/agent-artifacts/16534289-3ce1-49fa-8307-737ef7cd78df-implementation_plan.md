# Ecosystem Master Plan (All Initiatives)

You have selected to proceed with **all of them**. Because this is a massive undertaking touching almost every repository in the monorepo, we will execute this as a **phased rollout**. 

Here is the technical blueprint for how we will accomplish all four objectives sequentially.

---

## Phase 1: Management Dashboard (Stripe & Billing)

**Goal:** Transform the UI billing components into a fully functional subscription engine.

1. **Backend Integration (`workers/management-worker`)**
   - [NEW] Add a Stripe API integration module.
   - [MODIFY] Create `POST /api/billing/checkout` to generate Stripe Checkout sessions for upgrades.
   - [NEW] Create a Stripe Webhook listener `POST /api/billing/webhook` to listen for `checkout.session.completed` and `invoice.paid`.
2. **Database Updates**
   - [MODIFY] Add a new D1 migration to add `stripe_customer_id`, `stripe_subscription_id`, and `plan_tier` to the `users` table.
3. **Frontend Hookup (`apps/management`)**
   - [MODIFY] Connect `PricingTable.tsx` to the new `/api/billing/checkout` endpoint.

---

## Phase 2: Gallery App (Customer Purchasing Flow)

**Goal:** Allow clients who receive magic links to add photos to a cart and purchase digital or physical prints.

1. **State Management (`apps/gallery`)**
   - [NEW] Create `CartContext.tsx` or Zustand store to manage selected photos and print sizes.
2. **UI Components**
   - [NEW] Add a floating Shopping Cart icon and a Checkout Sidebar.
   - [MODIFY] Add "Add to Cart" buttons over individual photos in the gallery grid.
3. **Checkout Integration**
   - [NEW] Create `POST /api/gallery/checkout` in `management-worker` to generate a Stripe session for customer purchases.
   - [NEW] Implement post-purchase fulfillment logic (e.g., sending an email with high-res download links via Resend/SendGrid).

---

## Phase 3: Master & Touch Apps (Resiliency & Print Queues)

**Goal:** Make the desktop studio apps bulletproof against internet outages and improve physical workflows.

1. **Offline Queueing (`apps/master`)**
   - [MODIFY] Update `CloudSyncService.ts` to intercept failed API calls (like order pushes or heartbeats) and store them in the local SQLite database with `sync_status = 'pending'`.
   - [NEW] Add a background chron-job that attempts to flush the pending queue every 30 seconds if the internet is restored.
2. **Print Queue UI**
   - [NEW] Create a `PrintQueue.tsx` page in the Master dashboard.
   - [MODIFY] Listen for `print_requested` WebSocket events from the Touch kiosks, displaying them in the Master UI so the photographer knows which photos to physically print.

---

## Phase 4: MoneyTrash (Financial Analytics)

**Goal:** Turn the MoneyTrash Tauri app into a robust accounting and analytics dashboard for the studio owner.

1. **Data Aggregation**
   - [NEW] Create aggregation queries in `management-worker` to calculate Daily Revenue, Gallery Sales vs. In-Person Sales, and average order value.
2. **Frontend UI (`apps/moneytrash`)**
   - [NEW] Scaffold a new `/analytics` page using a charting library (like Recharts or Chart.js).
   - [NEW] Implement a CSV export utility for accountant handoffs.

---

## User Review Required

> [!IMPORTANT]
> This is a massive roadmap that will take several dedicated sessions to complete. 
> 
> **Are you ready to approve this plan?** If so, I will immediately begin executing **Phase 1** (Stripe & Billing backend in `management-worker`).
