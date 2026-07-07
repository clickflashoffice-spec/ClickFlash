-- Migration 054: Add image quality analysis columns to photos table
-- Supports Phase 46: Automated Image Quality Auditing
-- quality_score: 0-100 composite score (100 = perfect, <50 = flagged)
-- quality_flags: JSON array ['blurry', 'overexposed', 'underexposed', 'low_resolution']

ALTER TABLE photos ADD COLUMN quality_score INTEGER DEFAULT 100;
ALTER TABLE photos ADD COLUMN quality_flags TEXT DEFAULT '[]';
