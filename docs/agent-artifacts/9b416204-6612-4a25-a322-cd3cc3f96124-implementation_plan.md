# Ecosystem Overhaul Strategy: Project "All-In"

This plan outlines the systematic modernization of **all remaining ClickFlash applications** (`apps/master`, `apps/touch`, `apps/website`, `apps/gallery`, and `apps/moneytrash`). Our objective is to unify the entire ecosystem under the "Tactical Industrial Utilitarian" design language, enforce strict security/ergonomic standards, and ensure a 100% clean TypeScript build across every repository.

## User Review Required

> [!WARNING]
> This is a massive multi-app overhaul that touches 5 separate codebases. I have broken it down into sequential phases to prevent integration chaos. Please review the sequence and confirm if this priority order works for you.

## Open Questions

> [!IMPORTANT]
> 1. **Priority Check**: Do you want to start with the Kiosks (`touch` and `master`) first, or the Web/Guest apps (`website` and `gallery`)?
> 2. **Tailwind Versions**: `apps/website` uses Tailwind v4, while the React apps might be on v3. Do you want me to upgrade the React apps to Tailwind v4, or stick to their current configs?

---

## Proposed Changes (Phased Execution)

---

### Phase 1: Kiosk Modernization (`apps/touch` & `apps/master`)

**Goal**: Bring the Electron-based hardware apps into the Tactical theme.
- **Master App (`apps/master`)**:
  - Overhaul `Dashboard.tsx` to include dark-themed telemetry and PTP tethering stats.
  - Apply Fitts' Law to all hardware control buttons (min `48px` height).
- **Touch Kiosk (`apps/touch`)**:
  - Implement full-screen immersive Tactical dark mode.
  - Upgrade the `PinPad` and `VoiceAssistant` UI to feature `#06b6d4` (Cyan) and `#10b981` (Emerald) high-contrast accents.

---

### Phase 2: Guest Experience (`apps/gallery` & `apps/website`)

**Goal**: Apply the unified brand identity to external, customer-facing touchpoints.
- **Gallery (`apps/gallery`)**:
  - Implement a sleek, dark-mode focused photo grid.
  - Upgrade the Stripe checkout UI to match the "POS" tab styling from the Mobile app.
- **Website (`apps/website`)**:
  - Migrate Next.js 15 pages to the Tactical Industrial theme (Hero sections, pricing grids).
  - Ensure mobile responsiveness for the dark mode configuration.

---

### Phase 3: Financial Command Center (`apps/moneytrash`)

**Goal**: Modernize the Tauri + Next.js desktop app used for high-level ledger analytics.
- Overhaul data tables, replacing generic grids with high-density Tactical telemetry cards.
- Upgrade charting components to use the new color palette (Canvas `#0B111F`, Surfaces `#131C31`).

---

### Phase 4: Final Monorepo Verification

- Run global `npm run lint:all` to ensure zero warnings.
- Run global `npx tsc --noEmit` across all 5 apps.
- Verify monorepo dependencies and remove any unused code.

## Verification Plan

### Automated Tests
- `npm run lint:all` across the monorepo.
- TypeScript compiler checks strictly enforced per workspace.

### Manual Verification
- Render all apps using their respective dev commands (`npm run dev:master`, `npm run dev:touch`, etc.) to verify there are no runtime crashes or CSS misalignments.
