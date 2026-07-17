-- Required before deploying the secure R2 multipart upload handlers.
CREATE TABLE IF NOT EXISTS upload_parts (
    session_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    part_number INTEGER NOT NULL,
    etag TEXT NOT NULL,
    size INTEGER NOT NULL,
    office_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (session_id, chunk_index),
    FOREIGN KEY (office_id) REFERENCES offices(id)
);

CREATE INDEX IF NOT EXISTS idx_upload_parts_office_id ON upload_parts(office_id);
CREATE INDEX IF NOT EXISTS idx_upload_parts_created_at ON upload_parts(created_at);
