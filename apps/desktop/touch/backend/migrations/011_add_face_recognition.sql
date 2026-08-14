-- Up
CREATE TABLE IF NOT EXISTS photo_faces (
    id TEXT PRIMARY KEY,
    photoId TEXT NOT NULL,
    descriptor TEXT NOT NULL,
    box TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photoId) REFERENCES photos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photo_faces_photoId ON photo_faces(photoId);

ALTER TABLE users
ADD COLUMN faceDescriptor TEXT;

-- Down
-- DROP TABLE IF EXISTS photo_faces;
