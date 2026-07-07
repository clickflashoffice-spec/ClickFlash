# Migration Execution Order

## Correct Migration Order

Migrations should be executed in the following order:

1. **001_initial_schema.sql** - Creates base tables (users, albums, photos, orders, products, kiosks, settings)
2. **002_enhanced_photos_schema.sql** - Adds photo metadata columns and indexes
3. **003_add_destinations.sql** - Creates destinations table
4. **004_add_session_types.sql** - Creates session_types table
5. **006_update_schema.sql** - Updates settings, kiosks, products tables and adds updated_at columns
6. **007_add_destinations_updated_at.sql** - Adds updated_at to destinations table
7. **008_add_packs_and_bookings.sql** - Creates packs and bookings tables
8. **009_add_order_source.sql** - Adds source column to orders table
9. **010_performance_indexes.sql** - Adds performance indexes for frequently queried columns
10. **011_add_assistance_requests.sql** - Creates assistance_requests table for kiosk assistance requests
11. **012_add_photos_room_number.sql** - Adds room_number to photos
12. **013_add_albums_kiosk_ready.sql** - Adds kiosk_ready status/flag to albums
13. **014_add_kiosks_settings.sql** - Adds settings column to kiosks
14. **015_add_kiosk_sessions_last_seen.sql** - Adds last_seen column to kiosk sessions
15. **016_add_kiosk_folder_paths.sql** - Adds uploadFolderPath and ordersFolderPath to kiosks

## Migration Dependencies

```
001_initial_schema.sql
  ├─> 002_enhanced_photos_schema.sql (depends on photos table)
  ├─> 006_update_schema.sql (depends on multiple tables)
  ├─> 003_add_destinations.sql (new table, no dependencies)
  ├─> 004_add_session_types.sql (new table, no dependencies)
  │
003_add_destinations.sql
  └─> 007_add_destinations_updated_at.sql (depends on destinations table)
  │
001_initial_schema.sql
  └─> 008_add_packs_and_bookings.sql (depends on users table)
  │
001_initial_schema.sql
  └─> 009_add_order_source.sql (depends on orders table)
  │
001_initial_schema.sql
  └─> 010_performance_indexes.sql (depends on multiple tables)
  │
001_initial_schema.sql
  └─> 011_add_assistance_requests.sql (depends on users table for foreign key)
```

## Notes

- Migration 005 is intentionally skipped (no migration file exists)
- Migration 006 (update_schema.sql) contains a DROP TABLE statement for settings - ensure data is backed up before running
- All migrations use IF NOT EXISTS or handle existing columns gracefully
- Some migrations may fail if columns already exist (handled by migration system)
- Migration 010 adds indexes for performance optimization
- Migration 011 creates assistance_requests table for storing kiosk assistance requests

## Execution

The migration system in `db.js` should execute migrations in alphabetical/numerical order based on filename.

**Last Updated**: 2025-01-XX (after adding assistance_requests migration)
