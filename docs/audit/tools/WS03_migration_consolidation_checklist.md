# Migration Consolidation — Verification Checklist

## Archive Operations Completed

- [x] All 212 migration files copied to `docs/archive/migrations/{app}/`
- [x] Original app migration files preserved (non-destructive copy)

## Unified Package Created

- [x] `packages/database/` directory created
- [x] `packages/database/migrations/` created with timestamp template
- [x] `packages/database/schema/unified.sql` starter created
- [x] `packages/database/src/migrate.ts` runner created
- [x] `packages/database/package.json` created with catalog dependencies

## Duplicate Prefix Analysis

- [x] 44 duplicate prefixes identified across apps
- [x] Detailed report saved to `WS03_duplicate_prefix_report.json`

## Human Actions Required

- [ ] Reconcile schemas: compare `apps/*/backend/schema*.sql` files and merge into `packages/database/schema/unified.sql`
- [ ] Convert 240 numbered migrations to timestamp format (`YYYYMMDDHHMMSS_description.sql`)
- [ ] Merge duplicate-prefix files into single migrations
- [ ] Add `DOWN` scripts to every migration
- [ ] Make migrations idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
- [ ] Integrate `migrate.ts` into `apps/master` and `apps/touch` startup
- [ ] Generate C++ migration runner for `apps/master-cpp`
- [ ] Add CI step to run up/down migration tests on every PR
- [ ] Test on empty SQLite DB and production-anonymized backup

## Acceptance Criteria

- [ ] Single `packages/database/migrations/` directory is source of truth
- [ ] Timestamp-based migration IDs with zero duplicates
- [ ] Every migration has `up` and `down`
- [ ] `master-cpp` consumes same migration source as TS apps
- [ ] CI tests migration up/down on every PR