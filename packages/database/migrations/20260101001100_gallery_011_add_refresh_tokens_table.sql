-- 011_add_refresh_tokens_table.sql
-- Migration for JWT Refresh Token implementation in Gallery

CREATE TABLE IF NOT EXISTS IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0,
    replaced_by TEXT,
    client_info TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_gallery_refresh_tokens_user_id ON refresh_tokens(user_id);
