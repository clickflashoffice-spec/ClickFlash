# Dual Backend Resolution — Verification Checklist

## Archive Operations Completed

- [x] `apps/gallery/backend/legacy/` → `docs/archive/backends/gallery-express/` (1,463 files)
- [x] `apps/management/backend/master/` → `docs/archive/backends/management-express-master/`
- [x] `apps/management/backend/shared/` → `docs/archive/backends/management-express-shared/`

## Remaining Active Backend Verification

- [x] Zero Express imports/routes detected in active `apps/gallery/backend/` paths
- [x] Zero Express imports/routes detected in active `apps/management/backend/` paths

## Frontend API Layer Cleanup

- [ ] Review 61 frontend API reference files (see `WS02_dual_backend_resolution_report.json`)
- [ ] Remove any conditional Express/Worker logic
- [ ] Standardize on `cloudApiService.ts` or equivalent Worker client
- [ ] Update `VITE_API_URL` to point only to Worker domain

## Documentation Updates

- [ ] Update `ARCHITECTURE.md` to show only Worker backends
- [ ] Update `DEPLOYMENT.md` to remove Express deployment steps
- [ ] Update `API.md` from Worker route source (`worker_api_routes.json`)

## Testing

- [ ] Full Playwright E2E run on gallery customer journey
- [ ] Full Playwright E2E run on management hub flows
- [ ] k6 load test on Worker endpoints

## Rollback

- If needed, restore from `docs/archive/backends/` using `git mv` or `mv` back to original paths.