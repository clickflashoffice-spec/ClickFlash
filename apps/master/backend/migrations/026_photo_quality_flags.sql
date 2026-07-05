-- Migration 056: Add quality_flags to photos table for local image auditing

ALTER TABLE photos ADD COLUMN quality_flags TEXT DEFAULT '[]';
