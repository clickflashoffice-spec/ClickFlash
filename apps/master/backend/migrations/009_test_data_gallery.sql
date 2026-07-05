-- SQLite version of test data for gallery testing
-- This inserts test data directly into the SQLite database
-- Create test album
INSERT OR IGNORE INTO albums (id, title, date, photographerId, status, created_at)
VALUES (
    'test-album-001',
    'Summer Wedding 2024',
    '2024-06-15',
    NULL,
    'Draft',
    datetime('now')
);
-- Create test photos (sample with placeholder URLs)
INSERT OR IGNORE INTO photos (
    id,
    albumId,
    title,
    url,
    thumbnailUrl,
    created_at
)
VALUES 
    ('photo-001', 'test-album-001', 'IMG_001.jpg', 'https://via.placeholder.com/800', 'https://via.placeholder.com/300', datetime('now')),
    ('photo-002', 'test-album-001', 'IMG_002.jpg', 'https://via.placeholder.com/800', 'https://via.placeholder.com/300', datetime('now')),
    ('photo-003', 'test-album-001', 'IMG_003.jpg', 'https://via.placeholder.com/800', 'https://via.placeholder.com/300', datetime('now'));
-- Create test customer order (for Order ID login)
INSERT OR IGNORE INTO orders (
    id,
    date,
    clientName,
    email,
    status,
    total,
    paymentMethod,
    created_at
)
VALUES (
    'ORD-001',
    datetime('now'),
    'John Doe',
    'john@example.com',
    'Completed',
    4.99,
    'card',
    datetime('now')
);
-- Generate magic link token for testing
INSERT OR IGNORE INTO gallery_tokens (
    id,
    albumId,
    customerEmail,
    token,
    expiresAt,
    createdAt
)
VALUES (
    lower(hex(randomblob(16))),
    'test-album-001',
    'jane@example.com',
    'test-magic-link-token-12345',
    datetime('now', '+30 days'),
    datetime('now')
);
-- View inserted data
SELECT 'Test data inserted successfully' as status;
SELECT 'Albums: ' || COUNT(*)
FROM albums
WHERE id = 'test-album-001';
SELECT 'Photos: ' || COUNT(*)
FROM photos
WHERE albumId = 'test-album-001';
SELECT 'Orders: ' || COUNT(*)
FROM orders
WHERE id = 'ORD-001';
SELECT 'Tokens: ' || COUNT(*)
FROM gallery_tokens
WHERE token = 'test-magic-link-token-12345';