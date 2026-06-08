-- packages/database/migrations/20260101000000_initial_schema.sql
-- UP
CREATE TABLE IF NOT EXISTS example_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- DOWN
DROP TABLE IF EXISTS example_table;
