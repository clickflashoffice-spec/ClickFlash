CREATE TABLE IF NOT EXISTS "inventory" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "current_count" INTEGER DEFAULT 0,
    "low_stock_threshold" INTEGER DEFAULT 5,
    "desk_id" TEXT,
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
    "desk_id" TEXT,
    "created" TEXT DEFAULT (datetime('now')),
    "updated" TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "triage_queue" (
    "id" TEXT PRIMARY KEY,
    "desk_id" TEXT,
    "photo_id" TEXT,
    "issue_type" TEXT,
    "status" TEXT DEFAULT 'pending',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
