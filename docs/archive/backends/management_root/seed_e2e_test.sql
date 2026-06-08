-- Seed: Order Download Test Data for E2E Gallery Testing
-- Email: tester@clicketflash.com
-- PIN: 212625
-- Run: npx wrangler d1 execute clickflash-hub-db --remote --file=seed_e2e_test.sql --yes

INSERT OR REPLACE INTO orders (
    id, 
    date, 
    clientName, 
    email, 
    status, 
    total, 
    desk_id, 
    access_pin, 
    items,
    created_at,
    updated_at
)
VALUES (
    'ORD-TEST-E2E-DOWNLOAD',
    '2026-03-08',
    'E2E Tester',
    'tester@clicketflash.com',
    'Completed',
    15.00,
    'TEST_MASTER',
    '212625',
    '[{"id":"photo_test_001","title":"Test Photo 1","url":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800","price":15.00}]',
    datetime('now'),
    datetime('now')
);

-- Verify the data was inserted
SELECT id, email, access_pin FROM orders WHERE email = 'tester@clicketflash.com';
