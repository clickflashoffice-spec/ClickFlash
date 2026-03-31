-- Add metadata_only column to kiosk_transfer_queue for Smart Kiosk Sync
-- This enables metadata-only transfer mode that skips actual file copying

ALTER TABLE kiosk_transfer_queue ADD COLUMN metadata_only INTEGER DEFAULT 0;
