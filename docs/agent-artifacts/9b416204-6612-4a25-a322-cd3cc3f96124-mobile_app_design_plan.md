# Fotiqo Mobile Command Center: UI/UX, Layout & Theme Overhaul Plan

> **Aesthetic Thesis:** *Tactical Industrial Utilitarian*  
> **Core Law:** Mobile is NOT a small desktop. High contrast under outdoor sunlight, instant haptic/visual feedback, zero decorative fluff, $48\text{dp}+$ thumb-zone ergonomics, and 60fps telemetry.

---

## 1. Feasibility & Impact Evaluations (`mobile-design` + `frontend-design`)

### Mobile Feasibility & Risk Index (MFRI: **+8 / Safe & Robust**)
* **Platform Clarity (5/5):** Android-first resort field operations (`mobile-staff`).
* **Interaction Complexity (4/5):** PTP tethered shooting, live cash approval slides, QR scanning, GPS check-ins, and hardware status telemetry.
* **Performance Risk (2/5):** Mitigated by strict `React.memo` + `useCallback` + `FlatList`/`FlashList` architecture with zero `ScrollView` list rendering.
* **Offline Dependence (2/5):** Mitigated by local SQLite queue (`UnifiedSyncService`) and offline sync badges.
* **Accessibility Readiness (3/5):** High-contrast outdoor legibility, minimum touch targets ($48\text{dp} \times 48\text{dp}$), and explicit status labels next to icons.

### Design Feasibility & Impact Index (DFII: **14 / Excellent Execution**)
* **Aesthetic Impact (5/5):** Distinctive *Tactical Utilitarian* dark theme with telemetry typography (`font-mono`), precision borders, and glow-accent status indicators.
* **Context Fit (5/5):** Tailored specifically for professional resort photographers operating in bright sunlight or fast-paced event settings where instant glanceability is paramount.
* **Implementation Feasibility (4/5):** Native React Native / Expo (`app/(tabs)`) styled cleanly with cohesive CSS/theme constants.
* **Performance Safety (5/5):** Zero JS-thread animation bloat; clean hardware-accelerated transitions and static token styling.

---

## 2. Aesthetic & Design System Tokens

### Color Philosophy (Deep Obsidian & Neon Telemetry)
We reject generic purple/blue SaaS palettes in favor of a crisp, high-contrast tactical palette:
* **Backgrounds:**
  * `bg.canvas` (`#070a12`): Ultra-deep obsidian main background for AMOLED battery savings.
  * `bg.surface` (`#0f172a`): Tactical slate cards and panels.
  * `bg.elevated` (`#1e293b`): Raised modals, slide-to-confirm rails, and active tab indicator pills.
* **Accents & Telemetry:**
  * `accent.primary` (`#06b6d4` / Cyan 500): Active tethering, live sync pulse, primary interactive states.
  * `status.success` (`#10b981` / Emerald 500): LTE/LAN connected, cash approved, PTP synced.
  * `status.warning` (`#f59e0b` / Amber 500): Offline queue active, paper level low (<15%), Wi-Fi tether fallback.
  * `status.danger` (`#ef4444` / Red 500): Hardware disconnected, approval pending action, paper out.
* **Typography & Contrast:**
  * Headers & Numbers: Bold, high-contrast sans-serif (`#f8fafc`) for instant 2-second readability in field sunlight.
  * Telemetry Specs: Monospace numeric displays (`#38bdf8`) for photo counts, battery percentages, and GPS coordinates.

---

## 3. Thumb-Zone & Ergonomic Layout Architecture (Fitts' Law)

```
┌─────────────────────────────────────────┐
│ [STATUS BAR] LTE • LAN Sync • GPS Check │  <-- Top Glanceable Zone (Read-Only)
├─────────────────────────────────────────┤
│                                         │
│                                         │
│       MAIN CONTENT / LIST VIEW          │  <-- Mid Zone (Scroll / Inspect)
│       (FlatList / Telemetry Cards)      │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ [PRIMARY ACTION] e.g. "GENERATE QR"     │  <-- Thumb Reach Zone (Primary 48dp+ CTAs)
├─────────────────────────────────────────┤
│ [Studio] [Schedule] [Earnings] [Approvals] [Kiosks] │ <-- Bottom Navigation Rail
└─────────────────────────────────────────┘
```

* **Target Sizing:** Every interactive touch target, button, or slide thumb is strictly $\ge 48\text{dp}$ (`min-h-12`).
* **Destructive Separation:** Rejection buttons (`Reject Cash`, `Force Reboot Kiosk`) require explicit secondary confirmation or are physically spaced away from primary approval actions to prevent accidental field taps.

---

## 4. Screen-by-Screen UI/UX Overhaul Specifications

### Tab 1: `studio.tsx` (Active Studio & Tethering Command)
* **Visual Anchor:** Large circular **PTP Tethering Status Ring** (`USB / Wi-Fi / Mock / Disconnected`) surrounded by live telemetry pills (`Battery 88%`, `Queue: 4 Uploading`).
* **Hero Section:** Big, bold numerical counter showing real-time photos captured during the active session (`SESS_8841`).
* **Thumb-Zone Action:** Full-width high-visibility **"Generate Guest QR Code"** button (`bg-cyan-500 text-slate-950 font-black text-lg p-4 rounded-xl`) launching `SessionQRModal`.

### Tab 2: `schedule.tsx` (Timeline & GPS Check-In)
* **Visual Anchor:** **GPS Geo-Fence Indicator Widget** at the top. When within 100m of the assigned shoot location, the status turns glowing emerald (`Within Range: Sunset Pier`).
* **List Architecture:** `FlatList` with `React.memo` row cards (`BookingRow`). Displays package type (`VIP All-Inclusive`), guest name, room number, and time slot.
* **Thumb-Zone Action:** GPS-verified **"Check-In Now"** / **"Complete & Check-Out"** toggle button.

### Tab 3: `scout.tsx` (AI Location & Heatmap Insights)
* **Visual Anchor:** Resort Zone Heatmap cards ranked by AI sales conversion rate (`Pier @ 5 PM: +28% Conv`, `Resort Pool: High Foot Traffic`).
* **Card Design:** Tactical metric callouts (`Best Lighting Angle: 240° SW`, `Average Order Value: $145`).

### Tab 4: `pos.tsx` (Multi-Currency POS & Quick Billing)
* **Visual Anchor:** Fast-selector currency pill bar (`USD $`, `EUR €`, `GBP £`, `AED د.إ`, `SAR ر.س`).
* **Input Grid:** High-contrast, large-key numeric pad ($64\text{dp}$ touch keys) designed for one-handed thumb entry while holding a camera.
* **Quick Packages:** Instant 1-tap package cards (`Digital Single: $25`, `Full Album: $120`, `Print Package: $65`).

### Tab 5: `approvals.tsx` (Cash & Photo Moderation Queue)
* **Visual Anchor:** Live badge header showing pending action counts (`Cash Payments (1) • Moderation (1)`).
* **Card Design:**
  * **Cash Payment Cards:** Distinct amber border. Displays guest name, room number, amount, and order ID. Features dual-action buttons: **"Confirm Cash Received"** (`bg-emerald-600`) vs **"Flag / Reject"** (`bg-slate-800 text-red-400`).
  * **Moderation Cards:** Batch preview cards for flagged/blurry/release-pending photos before cloud push.

### Tab 6: `kiosks.tsx` (Fleet Health & Remote Management)
* **Visual Anchor:** Grid of Touch Kiosk telemetry cards (`Touch-01 (Lobby)`, `Touch-02 (Pool)`).
* **Telemetry Bars:** Color-coded progress bars for **Paper Rolls** (`82% OK`, `12% LOW - Amber Alert`) and **Printer Ribbon**.
* **Remote Actions:** 1-tap maintenance triggers (`Test Print`, `Clear Jam Alert`, `Reboot Kiosk Application`).

---

## 5. Verification Plan

### Automated Checks
* Type verification: `npx tsc --noEmit`
* Lint check: `npm run lint:all`

### Manual Verification on Android Emulator (`medium_phone` / AVD)
1. Launch `npx expo start --android` and inspect all 6 tabs in dark mode.
2. Verify touch targets (`min-h-12`) and ensure zero text clipping across high-density layouts.
3. Verify live badge update on `Approvals` tab (`badgeCount > 0`).
4. Test offline fallback state (`UnifiedSyncService.syncNow()`) and confirm queued item indicators render cleanly.

---

## 6. Open Questions & Next Actions for User Approval

> [!IMPORTANT]
> **Plan Mode Approval Request**  
> We have locked in the **Tactical Industrial Utilitarian** aesthetic and structured the UI/UX overhaul across all 6 tabs according to our strict mobile performance (`FlatList`/`memo`) and touch ergonomics ($48\text{dp}+$ thumb-zone) rules.  
> 
> **Are you ready to approve this UI/UX & Layout overhaul plan so we can begin building and polishing each screen component-by-component?**
