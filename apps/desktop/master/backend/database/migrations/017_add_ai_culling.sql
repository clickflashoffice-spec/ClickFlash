-- AI Culling Schema Migration
-- Create AI Groups table for finding best photo in a series
CREATE TABLE IF NOT EXISTS ai_groups (
    id TEXT PRIMARY KEY,
    albumId TEXT NOT NULL,
    bestPhotoId TEXT,
    -- ID of the AI-selected best photo
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(albumId) REFERENCES albums(id) ON DELETE CASCADE -- FOREIGN KEY(bestPhotoId) REFERENCES photos(id) -- Circular dependency risk, handle in app logic
);
-- Create AI Scores table to store analysis results
CREATE TABLE IF NOT EXISTS ai_scores (
    photoId TEXT PRIMARY KEY,
    overallScore REAL,
    sharpnessScore REAL,
    exposureScore REAL,
    compositionScore REAL,
    expressionScore REAL,
    -- e.g. loops detection, smiles
    technicalScore REAL,
    -- noise, artifacts
    embedding BLOB,
    -- Vector embedding for similarity grouping (optional)
    analysisVersion TEXT,
    -- To track which AI model version was used
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(photoId) REFERENCES photos(id) ON DELETE CASCADE
);
-- Add culling status and grouping to photos
-- Using ALTER TABLE one by one as SQLite doesn't support multiple ADD COLUMN in one statement
ALTER TABLE photos
ADD COLUMN cullingStatus TEXT DEFAULT 'Unprocessed';
-- 'Unprocessed', 'Selected', 'Rejected', 'Maybe'
ALTER TABLE photos
ADD COLUMN aiGroupId TEXT;
-- FK to ai_groups
-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_scores_overall ON ai_scores(overallScore);
CREATE INDEX IF NOT EXISTS idx_photos_cullingStatus ON photos(cullingStatus);
CREATE INDEX IF NOT EXISTS idx_photos_aiGroupId ON photos(aiGroupId);