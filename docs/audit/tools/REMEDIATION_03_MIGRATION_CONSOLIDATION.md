# ClickFlash — Migration Consolidation Roadmap
> **Generated:** June 2026  
> **Priority:** P1  
> **Scope:** 240 SQL migration files across master, touch, gallery, management, master-cpp

---

## 1. Current State

| App | Migration Files | Duplicate Prefixes | Range |
|-----|-----------------|--------------------|-------|
| master | 103 | 24 | 1 → 101 |
| master-cpp | 57 | 6 | 1 → 60 |
| management | 35 | 4 | 1 → 30 |
| touch | 22 | 6 | 1 → 14 |
| gallery | 21 | 4 | 1 → 50 |

### Problems
1. **Duplicate prefixes** — same number assigned to different schema changes
2. **Per-app silos** — same table (`destinations`, `session_types`) created in 5+ places
3. **master-cpp drift** — C++ app has its own migration set that may diverge from TS apps
4. **No reversibility** — most migrations lack `DOWN` scripts
5. **Legacy backends** have migrations that may be archived with dual-backend cleanup

---

## 2. Target State

```
packages/
  database/
    migrations/
      20260101000000_initial_schema.sql
      20260102000000_add_destinations.sql
      20260103000000_add_session_types.sql
      ...
    seeds/
      development.sql
      test.sql
    src/
      migrate.ts          # Migration runner for Node/SQLite
      migrate-cpp.ts      # Code generator for C++ MigrationRunner
```

- **One source of truth** for schema evolution
- **Timestamp-based IDs** (`YYYYMMDDHHMMSS`) eliminate collisions
- **Idempotent migrations** (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` where supported)
- **Reversibility** — every migration has a `down` script
- **Per-app subset** — each app declares which migrations it applies (master needs all, website needs none)

---

## 3. Implementation Steps

### Step 1 — Audit & Reconcile (Days 1–3)
1. Generate full CREATE TABLE statements per app from current schema files.
2. Diff schemas across master/touch/gallery/management.
3. Identify tables that are app-specific vs shared.
4. Mark legacy-backend migrations for archival with dual-backend cleanup.

### Step 2 — Design Unified Schema (Days 4–5)
1. Create `packages/database/schema/unified.sql` with every table needed by any app.
2. Use `desk_id` column for multi-tenant isolation where applicable.
3. Document ownership: which app owns writes to each table.

### Step 3 — Rewrite Migrations (Days 6–10)
1. Convert sequential numbered migrations to timestamp format.
2. Merge duplicate prefix files into single migrations.
3. Add `down` scripts.
4. Make migrations idempotent.

### Step 4 — Migration Runner (Days 11–12)
1. Build/runner in `packages/database/src/migrate.ts`.
2. Integrate into master/touch startup.
3. Generate C++ equivalent for `master-cpp`.

### Step 5 — Testing (Days 13–15)
1. Run `up` and `down` on empty SQLite databases.
2. Run on production-anonymized backups.
3. Verify app startup and critical flows.

---

## 4. Rollback Plan

1. Keep old migrations in `docs/archive/migrations/` until verified.
2. Tag release before migration consolidation.
3. If failure, restore old migrations and revert code.

---

## 5. Acceptance Criteria

- [ ] Single `packages/database/migrations/` directory
- [ ] Timestamp-based migration IDs
- [ ] Zero duplicate prefixes
- [ ] Every migration has `up` and `down`
- [ ] master-cpp consumes same migration source as TS apps
- [ ] CI tests migration up/down on every PR
