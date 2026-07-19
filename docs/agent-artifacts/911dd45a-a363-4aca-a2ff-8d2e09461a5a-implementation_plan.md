# Phase 11: Fotiqo Mobile Command Center UI Overhaul (`apps/mobile-photographer`)

## Goal
Implement the exact "Tactical Industrial Utilitarian" design system and 6-tab architecture for the Photographer Companion App as defined in the approved `mobile_app_design_plan.md` from our previous sessions. This replaces the temporary "Coach" and "Upload" tabs with the full operational command center layout.

## User Review Required

> [!IMPORTANT]
> **Reverting Temporary Tabs**: In the previous phase, I temporarily added "AI Coach" and "Upload" to the bottom tab bar. I will revert this and implement the strict 6-tab operational layout: **Studio**, **Schedule**, **Scout**, **POS**, **Approvals**, and **Kiosks**. 
> (The AI Coach features will be integrated directly into the `Studio` tab as a telemetry view, and Uploads will be handled silently in the background by the Dual Routing Engine).

## Proposed Changes

### Component 1: Theme & Constants (`@clickflash/ui` & mobile constants)
- Update `apps/mobile-photographer/src/constants/theme.ts` to implement the deep obsidian (`#070a12`), tactical slate (`#0f172a`), and neon telemetry accents (Cyan 500, Emerald 500, Amber 500, Red 500).
- Ensure all typography uses the monospace telemetry aesthetic for data points and high-contrast sans-serif for primary actions.

### Component 2: The 6-Tab Architecture (`apps/mobile-photographer/src/components/app-tabs.tsx`)
- Refactor the `NativeTabs` to strictly include:
  1. `index` (Studio)
  2. `schedule` (Timeline & GPS)
  3. `scout` (AI Heatmaps)
  4. `pos` (Quick Billing)
  5. `approvals` (Moderation Queue)
  6. `kiosks` (Fleet Health)

### Component 3: Screen Implementations
- **[MODIFY] `index.tsx` (Studio):** Add the large circular PTP Tethering Status Ring and the Hero Session Counter. Integrate the AI Coach feedback directly into this main command view.
- **[NEW] `schedule.tsx`:** Build the GPS Geo-Fence widget and BookingRow FlatList.
- **[NEW] `scout.tsx`:** Build the AI Heatmap cards.
- **[NEW] `pos.tsx`:** Build the currency selector, numeric pad (64dp keys), and 1-tap package cards.
- **[NEW] `approvals.tsx`:** Build dual-action Cash Payment cards and Moderation batch previews.
- **[NEW] `kiosks.tsx`:** Build telemetry bars for Paper Rolls and Ribbon levels.

## Verification Plan

### Automated Checks
- Verify layout with `npx tsc --noEmit`.

### Manual Verification
- We will verify that all 6 tabs route correctly and that the 48dp Fitts' Law touch-target rule is strictly adhered to across all primary action buttons.
