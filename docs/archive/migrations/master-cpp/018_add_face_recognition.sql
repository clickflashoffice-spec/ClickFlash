-- Up
CREATE TABLE IF NOT EXISTS photo_faces (
    id TEXT PRIMARY KEY,
    photoId TEXT NOT NULL,
    descriptor TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photoId) REFERENCES photos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_photo_faces_photoId ON photo_faces(photoId);
-- Add to photographers (public profiles)
-- Note: SQLite ALTER TABLE ADD COLUMN might fail if column exists. 
-- Schema migration runner usually doesn't handle IF NOT EXISTS for columns automatically unless wrapped.
-- However, we assume this is a fresh migration.
-- ALTER TABLE photographers
-- ADD COLUMN faceDescriptor TEXT;
-- Add to users (login)
ALTER TABLE users
ADD COLUMN faceDescriptor TEXT;

-- Down section removed to prevent accidental data loss during Up migration
-- DROP TABLE IF EXISTS photo_faces;
-- SQLite drop column supported in recent versions
-- ALTER TABLE photographers DROP COLUMN faceDescriptor;
-- ALTER TABLE users DROP COLUMN faceDescriptor;