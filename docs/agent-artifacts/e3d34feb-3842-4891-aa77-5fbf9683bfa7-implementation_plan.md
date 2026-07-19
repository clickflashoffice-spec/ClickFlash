# Audit Zod RBAC across Routes

As part of the Ecosystem QA Gauntlet (Phase 2), we need to ensure all protected routes enforce strict Role-Based Access Control (RBAC) via the `requirePermission` middleware. Although a global `authMiddleware` protects `/api/*` from unauthenticated access, the internal endpoints (collections CRUD, culling, reels, faces, etc.) need explicit permission boundaries based on Zod and the central `PERMISSIONS` object.

## User Review Required
> [!IMPORTANT]
> - Do you want `collections.ts` to fully migrate from its custom role-checking logic (`user?.role === "Admin"`) to the standard `requirePermission` logic for each table mapping?
> - There are Kiosk-facing routes (`/assistance`, `/notification`, `/pairing`) that are whitelisted in `PUBLIC_API_PREFIXES`. Are there any changes to the public routing prefix logic?

## Proposed Changes

### apps/master/backend/routes

#### [MODIFY] [collections.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/collections.ts)
- Replace the inline `isAdmin` check inside the dynamic `/:collection/records` route with explicit `requirePermission` checks depending on the collection being modified.
- For `ADMIN_ONLY_TABLES`, enforce `requirePermission(PERMISSIONS.SYSTEM_ADMIN)`.
- Enforce strict read/write permission mappings dynamically (e.g. `ALBUM_VIEW` for `albums` GET, `ALBUM_CREATE` for POST, etc.).

#### [MODIFY] [culling.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/culling.ts)
- Add `requirePermission(PERMISSIONS.PHOTO_EDIT)` to `/analyze/:albumId` and `/confirm/:albumId`.
- Add `requirePermission(PERMISSIONS.PHOTO_VIEW)` to `/results/:albumId`.

#### [MODIFY] [faces.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/faces.ts)
- Add `requirePermission(PERMISSIONS.PHOTO_VIEW)` and `requirePermission(PERMISSIONS.PHOTO_EDIT)` across the face scanning, clustering, and update routes.

#### [MODIFY] [reels.routes.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/reels.routes.ts)
- Add `requirePermission(PERMISSIONS.ALBUM_VIEW)` for `/` and `/:id`.
- Add `requirePermission(PERMISSIONS.ALBUM_EDIT)` to `/generate` and `/:id/status`.

#### [MODIFY] [dashboard.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/dashboard.ts) & [analytics.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/analytics.ts)
- Add `requirePermission(PERMISSIONS.ANALYTICS_VIEW)` to all analytics and dashboard endpoints.

## Verification Plan

### Automated Tests
- Run `npm run test:all` to ensure no route logic is fundamentally broken by permission injection.

### Manual Verification
- Attempt to execute restricted endpoints (like `/api/culling/analyze/123`) using a token from a `Photographer` role to verify it returns a `403 Forbidden` response.
- Execute the same endpoint with an `Admin` or `CEO` token to verify access is granted.
