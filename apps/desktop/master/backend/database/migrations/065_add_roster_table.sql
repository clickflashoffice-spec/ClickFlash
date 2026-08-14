-- Up
CREATE TABLE IF NOT EXISTS rosters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rfidUid TEXT,
    roomNumber TEXT,
    barcode TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rosters_barcode ON rosters(barcode);
CREATE INDEX IF NOT EXISTS idx_rosters_rfidUid ON rosters(rfidUid);
CREATE INDEX IF NOT EXISTS idx_rosters_roomNumber ON rosters(roomNumber);

-- Down
DROP TABLE IF EXISTS rosters;
