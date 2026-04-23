# Database Migration Review

## Overview
This document reviews all database migration files, their execution order, dependencies, and identifies issues.

## Migration Files

### Current Migration Files
1. `001_initial_schema.sql` - Initial database schema
2. `002_enhanced_photos_schema.sql` - Enhanced photos table with metadata
3. `002_update_schema.sql` - Updates to settings, kiosks, products, and adds updated_at columns
4. `003_add_destinations.sql` - Adds destinations table
5. `004_add_session_types.sql` - Adds session_types table
6. `005_add_destinations_updated_at.sql` - Adds updated_at to destinations
7. `005_add_packs_and_bookings.sql` - Adds packs and bookings tables
8. `006_add_order_source.sql` - Adds source column to orders

## Issues Identified

### ⚠️ Critical: Duplicate Migration Numbers

**Issue 1: Duplicate 002**
- `002_enhanced_photos_schema.sql` - Adds photo metadata columns
- `002_update_schema.sql` - Updates multiple tables

**Impact**: Migration system may execute these in unpredictable order or skip one.

**Recommendation**: Rename one to `007_` or merge if they can be combined.

**Issue 2: Duplicate 005**
- `005_add_destinations_updated_at.sql` - Adds updated_at to destinations
- `005_add_packs_and_bookings.sql` - Adds packs and bookings tables

**Impact**: Migration system may execute these in unpredictable order or skip one.

**Recommendation**: Rename one to `008_` or merge if they can be combined.

### Migration Dependencies

**Correct Execution Order Should Be**:
1. `001_initial_schema.sql` - Base schema (no dependencies)
2. `002_enhanced_photos_schema.sql` - Depends on photos table from 001
3. `002_update_schema.sql` - Depends on multiple tables from 001
4. `003_add_destinations.sql` - No dependencies (new table)
5. `004_add_session_types.sql` - No dependencies (new table)
6. `005_add_destinations_updated_at.sql` - Depends on destinations from 003
7. `005_add_packs_and_bookings.sql` - Depends on users from 001
8. `006_add_order_source.sql` - Depends on orders from 001

**Recommended Renumbering**:
1. `001_initial_schema.sql` ✅
2. `002_enhanced_photos_schema.sql` ✅
3. `003_update_schema.sql` (renamed from 002_update_schema.sql)
4. `004_add_destinations.sql` ✅
5. `005_add_session_types.sql` (renamed from 004_add_session_types.sql)
6. `006_add_destinations_updated_at.sql` (renamed from 005_add_destinations_updated_at.sql)
7. `007_add_packs_and_bookings.sql` (renamed from 005_add_packs_and_bookings.sql)
8. `008_add_order_source.sql` (renamed from 006_add_order_source.sql)

## Migration Content Review

### 001_initial_schema.sql ✅
- Creates core tables: users, albums, photos, orders, products, kiosks, settings
- Proper foreign keys defined
- JSON columns for complex data
- Status: Good

### 002_enhanced_photos_schema.sql ✅
- Adds photo metadata columns (fileSize, width, height, fileHash, mimeType, etc.)
- Creates indexes for performance
- Uses ALTER TABLE (may fail if columns exist - handled by migration system)
- Status: Good

### 002_update_schema.sql ⚠️
- Drops and recreates settings table (destructive!)
- Adds updated_at columns to multiple tables
- Adds lastHeartbeat to kiosks
- Adds eventType to albums
- **Issue**: DROP TABLE on settings will lose data
- Status: Needs review - consider data migration

### 003_add_destinations.sql ✅
- Creates destinations table
- Proper structure with JSON for features
- Status: Good

### 004_add_session_types.sql ✅
- Creates session_types table
- Proper structure
- Status: Good

### 005_add_destinations_updated_at.sql ✅
- Simple ALTER TABLE to add updated_at
- Depends on 003
- Status: Good (but wrong number)

### 005_add_packs_and_bookings.sql ✅
- Creates packs and bookings tables
- Proper foreign keys
- Status: Good (but wrong number)

### 006_add_order_source.sql ✅
- Adds source column to orders
- Updates existing data
- Status: Good

## Migration System Recommendations

### 1. Add Migration Tracking Table
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Add Rollback Scripts
Each migration should have a corresponding rollback script:
- `001_initial_schema_rollback.sql`
- `002_enhanced_photos_schema_rollback.sql`
- etc.

### 3. Add Migration Validation
- Check if migration has already been applied
- Verify dependencies before execution
- Validate schema after migration

### 4. Document Migration Dependencies
Create a dependency graph:
```
001 -> 002, 003
002 -> (none)
003 -> 006
004 -> (none)
005 -> (none)
006 -> 008
007 -> (none)
```

## Action Items

### High Priority
1. ✅ **Fix duplicate migration numbers** (see recommended renumbering above)
2. ⚠️ **Review 002_update_schema.sql** - DROP TABLE may cause data loss
3. ⚠️ **Add migration tracking table** to prevent re-execution

### Medium Priority
1. ⚠️ **Create rollback scripts** for all migrations
2. ⚠️ **Add migration validation** in db.js
3. ⚠️ **Document migration dependencies** explicitly

### Low Priority
1. ⚠️ **Combine related migrations** if possible
2. ⚠️ **Add migration tests** to verify correctness
3. ⚠️ **Create migration documentation** for developers

## Schema Consistency Check

### Tables Defined
- ✅ users
- ✅ albums
- ✅ photos
- ✅ orders
- ✅ products
- ✅ kiosks
- ✅ settings
- ✅ destinations
- ✅ session_types
- ✅ packs
- ✅ bookings

### Foreign Keys
- ✅ photos.albumId -> albums.id (ON DELETE CASCADE)
- ✅ albums.photographerId -> users.id
- ✅ bookings.photographerId -> users.id
- ✅ orders.photographerId -> users.id (if exists)

### Indexes
- ✅ idx_photos_fileHash
- ✅ idx_photos_albumId
- ⚠️ Consider adding indexes on:
  - users.email (already UNIQUE)
  - albums.photographerId
  - orders.date
  - orders.status

## Notes

- SQLite doesn't support IF NOT EXISTS with ALTER TABLE ADD COLUMN
- Migration system should handle column existence checks
- Some migrations may fail if run multiple times (handled by migration system)
- DROP TABLE in 002_update_schema.sql is destructive and should be reviewed

---

**Last Updated**: 2025-01-XX
**Reviewed By**: Deep Scan Audit
**Status**: Issues identified, recommendations provided

