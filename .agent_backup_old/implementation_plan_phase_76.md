# Implementation Plan - Phase 76: Management Hub Responsive Overhaul & Duplication Fix

## Goal Description

Refactor the Management Hub to be fully responsive, visually premium, and eliminate functional duplication between "Dashboard" and "Performance" views.

## User Review Required

> [!IMPORTANT]
> **Duplication Fix**: The "Dashboard" view will now render `OperationalCommandCenter` (Fleet/Network focus), while "Performance" remains `ClickFlashAnalytics` (Sales/Resort focus).
> **Aesthetics**: Applying glassmorphism and premium gradients across all dashboard views.

## Proposed Changes

### 1. Prerequisite: Build & Runtime Fixes

- [x] **[MODIFY] [main.tsx](file:///e:/ClickFlash/apps/management/src/main.tsx)**: Initialize and provide `QueryClient`.

### 2. Layout & Navigation

- [x] **[MODIFY] [ManagementLayout.tsx](file:///e:/ClickFlash/apps/management/src/components/management/ManagementLayout.tsx)**:
  - Implement responsive navigation (collapsible sidebar, mobile bottom nav).
- [x] **[MODIFY] [ManagementSidebar.tsx](file:///e:/ClickFlash/apps/management/src/components/management/ManagementSidebar.tsx)**:
  - Handle mobile drawer behavior and navigation logic.
- [ ] **[MODIFY] [ManagementLayout.tsx](file:///e:/ClickFlash/apps/management/src/components/management/ManagementLayout.tsx)**:
  - Remap `command_center` to `OperationalCommandCenter`.
  - Consolidate `resort_dashboard` and `analytics` mappings.

### 3. Dashboard Overhaul

- [x] **[MODIFY] [ClickFlashAnalytics.tsx](file:///e:/ClickFlash/apps/management/src/components/management/analytics/ClickFlashAnalytics.tsx)**:
  - Implement responsive gauge grid and scrollable tabs.
- [ ] **[MODIFY] [OperationalCommandCenter.tsx](file:///e:/ClickFlash/apps/management/src/components/management/OperationalCommandCenter.tsx)**:
  - Apply responsive grid logic to stats and tables.
  - Implement premium aesthetics (glassmorphism cards, blurred backgrounds).
  - Ensure tables are horizontally scrollable on mobile.

## Verification Plan

### Automated Tests

- Run `npm test -- ClickFlashAnalytics.test.tsx` in `apps/management`.
- Verify no TypeScript errors in `apps/management/src/components/management/analytics/ClickFlashAnalytics.tsx`.

### Manual Verification

1. Open the app on a mobile device/emulator.
2. Verify "Dashboard" and "Performance" show different content.
3. Verify the layout scales smoothly from 320px to 1920px.
4. Verify the "More" button in the bottom nav correctly opens the sidebar.
