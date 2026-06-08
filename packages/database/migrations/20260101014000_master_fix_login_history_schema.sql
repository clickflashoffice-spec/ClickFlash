-- Drop table if exists to reset schema (Table is empty anyway)
DROP TABLE IF EXISTS login_history;

-- Create table with correct schema matching auth.ts
CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, -- Can be integer or string depending on user system
    email TEXT NOT NULL,
    ip_address TEXT,
    status TEXT NOT NULL, -- 'SUCCESS' or 'FAILED'
    reason TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
