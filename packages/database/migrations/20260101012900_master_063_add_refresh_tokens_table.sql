-- 063_add_refresh_tokens_table.sql
-- Migration for JWT Refresh Token implementation

CREATE TABLE IF NOT EXISTS IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL, -- Random string for lookup
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0,
    replaced_by TEXT, -- For audit trail of rotated tokens
    client_info TEXT, -- JSON string for IP, User-Agent etc.
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Optimize for lookups by token and user
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_lookup ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
