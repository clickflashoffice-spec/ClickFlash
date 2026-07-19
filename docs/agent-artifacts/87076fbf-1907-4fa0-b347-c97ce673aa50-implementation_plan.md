# ClickFlash Ecosystem Refactoring Plan

Now that the `apps/master/backend` decomposition and stabilization phases (Phases 1-5) are complete and passing all type/lint checks, we are moving to the rest of the ClickFlash ecosystem.

## Goal Description
Following a full ecosystem scan for large, monolithic source files, we've identified the next major bottlenecks. The goal of this next phase is to decompose the massive "God Components" and "God Classes" present in the frontends and satellite backends to ensure the entire workspace maintains strict architectural boundaries.

## User Review Required
> [!IMPORTANT]  
> The following plan outlines significant structural changes to the React frontends and cloud API services across multiple apps (`master`, `management`, `gallery`). Please review the targeted files and confirm this aligns with your priorities.

## Proposed Changes

---

### Phase 6: Master Frontend Component Decomposition
The `apps/master/frontend` contains several massively bloated React components. These "God Components" handle state management, API calls, complex conditional rendering, and hundreds of lines of JSX simultaneously.

#### [MODIFY] `apps/master/src/components/albums/Albums.tsx` (76KB)
Decompose into:
- **`AlbumsContainer.tsx`**: Data fetching and state management.
- **`AlbumGrid.tsx`**: Pure presentation of the album list.
- **`AlbumCard.tsx`**: Individual album UI.
- **`AlbumFilters.tsx`**: Search and sorting controls.

#### [MODIFY] `apps/master/src/components/Orders.tsx` (49KB)
Decompose into:
- **`OrdersContainer.tsx`**: Core logic and polling.
- **`OrderTable.tsx`**: Presentation of orders.
- **`OrderSummary.tsx`**: High-level metrics.

---

### Phase 7: API Service Monoliths (Management & Gallery)
The `apiService.ts` files in the client applications are over 60KB, meaning they contain every single API call for the entire application in a single file. We will split these by domain.

#### [DELETE] `apps/management/src/services/apiService.ts` (63KB)
#### [NEW] `apps/management/src/services/api/`
- `AuthApi.ts`
- `CloudSyncApi.ts`
- `TenantsApi.ts`
- `BillingApi.ts`

#### [DELETE] `apps/gallery/src/services/apiService.ts` (57KB)
#### [NEW] `apps/gallery/src/services/api/`
- `AlbumsApi.ts`
- `PhotosApi.ts`
- `CartApi.ts`
- `CheckoutApi.ts`

---

### Phase 8: Cloud Backend Monoliths (Management & Gallery)
The `server.ts` files in the satellite backends are behaving as monoliths themselves.

#### [MODIFY] `apps/management/backend/src/server.ts` (91KB)
Extract routing, middleware, and business logic out of the entry point into:
- `routes/` (auth, tenants, billing)
- `middleware/`
- `services/`

#### [MODIFY] `apps/gallery/backend/src/server.ts` (58KB)
Extract logic into:
- `routes/`
- `services/` (Stripe integration, asset delivery)

## Verification Plan
### Automated Tests
- Full `npx tsc --noEmit` across all affected applications to ensure the newly split interfaces and modules integrate properly.
- Run `npm run lint:all` across the ecosystem.
- Build test: `npm run build` for `master`, `management`, and `gallery` to ensure Vite/Next.js successfully bundles the new file structures.

### Manual Verification
- Launch the Master Portal UI locally and verify that the `Albums` and `Orders` pages render identically and maintain state correctly.
- Launch the Management and Gallery apps locally and verify that basic API communications remain functional.
