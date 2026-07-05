-- SQLite compatible Gallery Access Tokens (Standardized CamelCase)
CREATE TABLE IF NOT EXISTS gallery_tokens (
    id TEXT PRIMARY KEY,
    albumId TEXT NOT NULL,
    customerEmail TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    accessType TEXT DEFAULT 'magic-link',
    expiresAt DATETIME NOT NULL,
    lastAccessed DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gallery_tokens_token ON gallery_tokens(token);
CREATE INDEX IF NOT EXISTS idx_gallery_tokens_album ON gallery_tokens(albumId);
CREATE INDEX IF NOT EXISTS idx_gallery_tokens_expires ON gallery_tokens(expiresAt);
CREATE INDEX IF NOT EXISTS idx_gallery_tokens_email ON gallery_tokens(customerEmail);