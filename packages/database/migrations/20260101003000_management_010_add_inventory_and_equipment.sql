-- Up
CREATE TABLE IF NOT EXISTS "inventory" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "current_count" INTEGER DEFAULT 0,
    "low_stock_threshold" INTEGER DEFAULT 5,
    "created" TEXT DEFAULT (datetime('now')),
    "updated" TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS "equipment_categories" (
    "id" TEXT PRIMARY KEY,
    "label" TEXT NOT NULL,
    "created" TEXT DEFAULT (datetime('now')),
    "updated" TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS "equipment" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedToPhotographerId" TEXT,
    "destinationId" TEXT,
    "created" TEXT DEFAULT (datetime('now')),
    "updated" TEXT DEFAULT (datetime('now')),
    FOREIGN KEY("assignedToPhotographerId") REFERENCES "users"("id") ON DELETE
    SET NULL,
        FOREIGN KEY("destinationId") REFERENCES "destinations"("id") ON DELETE
    SET NULL
);
-- Down
DROP TABLE IF EXISTS "equipment";
DROP TABLE IF EXISTS "equipment_categories";
DROP TABLE IF EXISTS "inventory";