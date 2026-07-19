-- Reserved migration number. The sync tables and indexes are created together
-- by 018b_add_missing_tables.sql; the previous version attempted to ALTER those
-- tables before they existed on a clean database.
SELECT 1;
