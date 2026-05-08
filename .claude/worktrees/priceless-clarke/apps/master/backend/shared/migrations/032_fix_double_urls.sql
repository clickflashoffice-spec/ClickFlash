-- Migration 032: Fix Double URL prefixes in photos table
-- Removes 'http://localhost:8090/api/files/photos/{id}/' prefix from url, thumbnail, and preview fields
-- This fixes the data corruption caused by previous double-wrapping logic
UPDATE photos
SET url = REPLACE(
        url,
        'http://localhost:8090/api/files/photos/' || id || '/',
        ''
    )
WHERE url LIKE 'http://localhost:8090/api/files/photos/%';
UPDATE photos
SET thumbnailUrl = REPLACE(
        thumbnailUrl,
        'http://localhost:8090/api/files/photos/' || id || '/',
        ''
    )
WHERE thumbnailUrl LIKE 'http://localhost:8090/api/files/photos/%';
UPDATE photos
SET tinyUrl = REPLACE(
        tinyUrl,
        'http://localhost:8090/api/files/photos/' || id || '/',
        ''
    )
WHERE tinyUrl LIKE 'http://localhost:8090/api/files/photos/%';
UPDATE photos
SET previewUrl = REPLACE(
        previewUrl,
        'http://localhost:8090/api/files/photos/' || id || '/',
        ''
    )
WHERE previewUrl LIKE 'http://localhost:8090/api/files/photos/%';