-- Up
CREATE TABLE IF NOT EXISTS face_indexing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photoId TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    -- pending, processing, completed, failed
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photoId) REFERENCES photos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_face_queue_status ON face_indexing_queue(status);
CREATE INDEX IF NOT EXISTS idx_face_queue_photoId ON face_indexing_queue(photoId);
-- Down
DROP TABLE IF EXISTS face_indexing_queue;