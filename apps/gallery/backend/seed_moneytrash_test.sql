-- ============================================================
-- Seed: MoneyTrash Test Data for E2E Gallery Testing
-- Access Code: TESTMT2026
-- Run: npx wrangler d1 execute gallery-db --remote --file=seed_moneytrash_test.sql
-- ============================================================

-- Ensure photos table has access_code column (idempotent)
-- If the column already exists, this will silently fail in SQLite (but D1 may error — safe to ignore)
-- ALTER TABLE photos ADD COLUMN access_code TEXT;
-- ALTER TABLE photos ADD COLUMN status TEXT DEFAULT 'available';

-- Insert 6 test archived photos attached to access code TESTMT2026
-- These use public Unsplash demo photos as URLs (no R2 required for test)

INSERT OR REPLACE INTO photos (id, albumId, url, status, access_code, desk_id, created_at)
VALUES
(
    'mt_test_001',
    'album_test_2026',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    'available',
    'TESTMT2026',
    'TEST_MASTER',
    datetime('now')
),
(
    'mt_test_002',
    'album_test_2026',
    'https://images.unsplash.com/photo-1464822759844-d150ad8496f5?w=800',
    'available',
    'TESTMT2026',
    'TEST_MASTER',
    datetime('now')
),
(
    'mt_test_003',
    'album_test_2026',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800',
    'available',
    'TESTMT2026',
    'TEST_MASTER',
    datetime('now')
),
(
    'mt_test_004',
    'album_test_2026',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    'available',
    'TESTMT2026',
    'TEST_MASTER',
    datetime('now')
),
(
    'mt_test_005',
    'album_test_2026',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
    'available',
    'TESTMT2026',
    'TEST_MASTER',
    datetime('now')
),
(
    'mt_test_006',
    'album_test_2026',
    'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800',
    'available',
    'TESTMT2026',
    'TEST_MASTER',
    datetime('now')
);

-- Verify the data was inserted
SELECT id, albumId, status, access_code FROM photos WHERE access_code = 'TESTMT2026';
