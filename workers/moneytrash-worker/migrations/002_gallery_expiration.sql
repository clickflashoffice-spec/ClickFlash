-- MoneyTrash customer galleries are temporary by design.
ALTER TABLE galleries ADD COLUMN expires_at TEXT;

UPDATE galleries
SET expires_at = datetime(COALESCE(created_at, 'now'), '+30 days')
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_galleries_expires_at ON galleries(expires_at);
