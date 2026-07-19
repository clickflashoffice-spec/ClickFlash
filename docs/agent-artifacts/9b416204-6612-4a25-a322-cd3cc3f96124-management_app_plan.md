# Fotiqo AI Ecosystem Command Center (`apps/management` & `apps/master`) Replan

This document outlines the architecture, aesthetic unification, and feature completion required to transition the **Management Cloud App** (`apps/management` - Cloudflare Pages/React/Vite) and **Master Portal** (`apps/master` - Electron/React 19) into a unified, high-craft **Tactical Industrial Utilitarian Command Center**.

---

## User Review Required

> [!IMPORTANT]
> **Ecosystem Design & Token Unification**: Both `apps/management` and `apps/master` will strictly enforce our **Tactical Industrial Utilitarian** aesthetic (`Obsidian/Slate dark backgrounds`, `high-contrast typography`, `cyan #06B6D4 / purple #8B5CF6 status accents`, and `Fitts' Law-compliant interactive targets >= 44-48px`). All flat listings will be upgraded to high-density telemetry grids.

> [!NOTE]
> **Global Multi-Location & Role-Based Workspaces**: The command center architecture moves from flat CRUD listings into two distinct AI-driven workspaces:
> 1. **AI CEO Workspace**: Global enterprise aggregation (100+ Master locations), predictive weekly revenue forecasting, dynamic package pricing controls, and daily AI executive summaries.
> 2. **AI Manager Workspace**: Real-time local resort fleet telemetry, active GPS photographer maps, hardware health alerts (shutter actuations, paper rolls, ping latency), and automated anomaly flagging.

---

## Open Questions

1. **Global Location Switcher Persistence**: Should the active `locationId` selection ("All Locations", "Regions", or specific "Resort Pier #01") be stored in `localStorage`/Zustand across browser tabs, or synced with the user's JWT auth session? *(Recommendation: Store in local Zustand store with `localStorage` persistence for instant tab switching without network roundtrips).*
2. **AI Location Scout Map Engine**: For the interactive heatmaps overlaying revenue hotspots and staff GPS check-ins (`check_in`/`check_out` coordinates from `mobile-staff`), should we use custom SVG resort map vectors or Mapbox/Google Maps tiles? *(Recommendation: Support standard Leaflet/Google Maps tiles with custom resort zone overlays).*

---

## Proposed Changes

### 1. Design Tokens & Core Layout Unification (`apps/management`)

#### [MODIFY] [index.css](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/src/index.css) & [tailwind.config.js](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/tailwind.config.js)
- Enforce the global ecosystem color tokens:
  - `canvas: #0B111F` (Dark industrial slate background)
  - `surface: #131C31` (Card and panel backgrounds)
  - `border: #1E293B` (Tactical grid borders)
  - `primary: #2563EB` / `cyan: #06B6D4` / `purple: #8B5CF6` (Active telemetry accents)
- Configure custom utility classes for high-density tables and glowing status badges.

#### [MODIFY] [App.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/src/App.tsx)
- Embed the **Global Location Switcher** inside the top navigation bar, allowing seamless filtering across 100+ Master locations.
- Add navigation tabs for `AI CEO Workspace`, `AI Manager Workspace`, and `AI Location Scout`.

---

### 2. New AI Dashboards & Workspaces (`apps/management`)

#### [NEW] [AiCeoWorkspace.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/src/components/dashboard/AiCeoWorkspace.tsx)
- **Revenue Forecasting & Dynamic Pricing**: Interactive chart displaying 7-day predicted revenue based on occupancy and historical trends.
- **AI Pricing Controls**: Recommendations card (e.g., *"Suggest increasing Sunset Cabana package by 15% during peak hours"*). Includes a one-click **Push to All Terminals** action that updates `CURRENCIES` / catalog rates across Master kiosks and `mobile-staff` POS terminals.
- **Executive Daily Briefing**: AI-generated markdown summary of enterprise health, top-performing resorts, and cash reconciliation totals.

#### [NEW] [AiManagerWorkspace.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/src/components/dashboard/AiManagerWorkspace.tsx)
- **Live Fleet & Staff Telemetry**: Real-time grid showing active roving photographers (from `local_checkins`), active kiosks (from `kiosks.tsx` heartbeat), and local upload queues (`LocalPhotoQueue`).
- **Automated Anomaly & Shutter Alerts**:
  - Shutter actuation tracker (`Nikon D750 @ 152k actuations - Maintenance Recommended`).
  - Zero-conversion alerts (*"Staff John has taken 420 captures today with 0 POS checkouts"*).
- **AI Coaching Dispatch**: Review and push personalized coaching tips directly to the photographer's mobile app.

#### [NEW] [AiLocationScout.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/src/components/dashboard/AiLocationScout.tsx)
- **Resort Revenue Heatmap**: Visual map rendering GPS check-in points (`schedule.tsx`) and POS transaction coordinates colored by profitability per hour.
- **Dynamic Zone Reassignment**: Drag-and-drop or quick-assign interface to re-route idle staff from low-traffic zones to high-demand sunset piers.

---

### 3. Upgrading CRM, Orders & Digital Ledger (`apps/management`)

#### [MODIFY] [Photographers.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/src/components/Photographers.tsx)
- **Performance Grid**: Add high-density columns for `Conversion Rate (%)`, `Average Order Value (AOV)`, and `Customer CSAT Score`.
- **Digital Cash vs. Stripe Ledger**: Integrate reconciliation tab tracking offline cash collected in field (`pending_approvals`) vs. verified payout ledger.

#### [MODIFY] [Orders.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/management/src/components/Orders.tsx)
- **AI Auto-Culling Audit Trail**: Display automated culling scores (e.g., *Discarded: Blur 92%, Blink 88%*) with option to inspect quarantined frames.
- **Multi-Currency Breakdown**: Display transaction totals normalized to base EUR alongside original checkout currency (`USD`, `SAR`, `AED`).

---

### 4. Master Portal Alignment (`apps/master`)

#### [MODIFY] [Dashboard.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/master/src/components/Dashboard.tsx) & [LocalResortDashboard.tsx](file:///C:/Users/alamo/Desktop/ClickFlash/apps/master/src/components/LocalResortDashboard.tsx)
- Ensure exact aesthetic consistency with `apps/management` (`theme.colors.canvas`, `theme.colors.surface`, 48px touch buttons for resort counter operators).
- Connect socket events from `mobile-staff` (`/api/bridge/pending-approvals`, `/api/tether/ingest`) to surface immediate audio/visual desktop alerts when field photographers request cash audit sign-offs.

---

## Verification Plan

### Automated Verification
- Run `npm run lint:all` across all apps (`apps/management`, `apps/master`, `apps/mobile-staff`).
- Run `npx tsc --noEmit` inside `apps/management` and `apps/master` to confirm zero type errors.

### Manual / Browser Verification
- Launch `apps/management` dev server (`npm run dev` / Vite on port 5173).
- Verify the **Global Location Switcher**, **AI CEO Workspace**, **AI Manager Workspace**, and **AI Location Scout** render cleanly with our dark industrial theme and responsive 48px targets.
- Verify cash approval bridge syncs state across desktop and mobile.
