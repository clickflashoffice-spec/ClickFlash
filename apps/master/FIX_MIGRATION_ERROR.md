# Fix Database Migration Errors

## Problem
Multiple migrations had SQLite compatibility issues.

## Fixes Applied

### Migration 004_optimization_indexes.sql
- **Fixed:** Changed `orders.created` to `orders.created_at` (correct column name)
- **Fixed:** Removed premature kiosk index (column added in migration 034)

### Migration 037_marketing_campaigns.sql
- **Fixed:** Changed `UUID` type to `TEXT` (SQLite doesn't have UUID type)
- **Fixed:** Changed `uuid_generate_v4()` to `lower(hex(randomblob(16)))` (SQLite native)
- **Fixed:** Changed `NOW()` to `CURRENT_TIMESTAMP` (SQLite syntax)
- **Fixed:** Changed `TIMESTAMP` to `DATETIME` (SQLite type)
- **Fixed:** Changed `BOOLEAN` to `INTEGER` (SQLite uses 0/1)
- **Fixed:** Changed `DECIMAL(10,2)` to `REAL` (SQLite type)
- **Fixed:** Changed `ON CONFLICT DO NOTHING` to `INSERT OR IGNORE` (SQLite syntax)
- **Fixed:** Reformatted `ON DELETE SET NULL` to be on single lines

### Migration 038_gallery_tokens.sql
- **Fixed:** Changed `TIMESTAMP` to `DATETIME` for consistency

### Migration 039_gallery_orders.sql
- **Fixed:** Changed `DECIMAL(10,2)` to `REAL`
- **Fixed:** Changed `TIMESTAMP` to `DATETIME`

### Migration 040_test_data_gallery.sql
- **Fixed:** Updated column names to match actual schema:
  - `albums.name` → `albums.title`
  - `albums.event_date` → `albums.date`
  - Removed `albums.published_at` (doesn't exist)
  - `photos.album_id` → `photos.albumId`
  - `photos.filename` → `photos.title`
  - `photos.tiny_url/thumb_url/preview_url/highres_url` → `photos.url` and `photos.thumbnailUrl`
  - `orders.album_id/customer_email/payment_status` → `orders.date/clientName/email/status/paymentMethod`

## Resolution Steps

### Option 1: Fresh Database (Recommended for Development)
If you don't need existing data:

```bash
# Stop the server (Ctrl+C)

# Delete the database file
del pb_data\master.db

# Restart the server
npm run dev:full
```

### Option 2: Preserve Existing Data
If migrations 004-036 already applied and you want to continue:

```bash
# Mark problematic migrations as applied manually
sqlite3 pb_data/master.db

-- Check current state
SELECT name FROM migrations;

-- If 037 failed, manually create the tables
-- Then mark it as applied:
INSERT INTO migrations (name) VALUES ('037_marketing_campaigns.sql');
INSERT INTO migrations (name) VALUES ('038_gallery_tokens.sql');
INSERT INTO migrations (name) VALUES ('039_gallery_orders.sql');
INSERT INTO migrations (name) VALUES ('040_test_data_gallery.sql');
INSERT INTO migrations (name) VALUES ('041_gallery_settings.sql');
```

## Verification
After fix, server should start without errors:
```
[Database] Connected to .../master.db (WAL Mode Active)
[Database] Applying migration: 004_optimization_indexes.sql
[Database] Applying migration: 034_add_kiosk_last_seen.sql
[Database] Applying migration: 035_add_kiosk_folder_paths.sql
...
[Server] Running on port 8090
```

## Migration Best Practices for SQLite

1. **Use SQLite-native types:** `TEXT`, `INTEGER`, `REAL`, `BLOB`, `DATETIME`
2. **Use SQLite functions:** `randomblob()`, `hex()`, `lower()`, `datetime()`
3. **Use SQLite syntax:** `INSERT OR IGNORE` instead of `ON CONFLICT`
4. **Avoid PostgreSQL-specific:** `UUID`, `NOW()`, `BOOLEAN`, `DECIMAL(n,m)`
5. **Test migrations:** Run on fresh database before committing
