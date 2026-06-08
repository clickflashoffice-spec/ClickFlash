-- Protocol 41: Photographer Payroll Ledger
-- Immutable record of all earnings (Commissions, Bonuses, Deductions)
CREATE TABLE IF NOT EXISTS IF NOT EXISTS photographer_ledger (
    id TEXT PRIMARY KEY,
    -- UUID
    photographer_id TEXT NOT NULL,
    order_id TEXT,
    -- Nullable (e.g., for bonuses or manual adjustments)
    type TEXT NOT NULL,
    -- 'Commission', 'Salary', 'Bonus', 'Deduction', 'Payout'
    amount REAL NOT NULL,
    -- Positive for earnings, Negative for deductions
    description TEXT,
    date TEXT NOT NULL,
    -- YYYY-MM-DD
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_id TEXT,
    -- For cloud sync
    sync_status TEXT DEFAULT 'pending' -- 'pending', 'synced'
);
-- Index for fast lookup by photographer and date
CREATE INDEX IF NOT EXISTS idx_ledger_photographer_date ON photographer_ledger(photographer_id, date);
-- Index for order lookups (Idempotency check)
CREATE INDEX IF NOT EXISTS idx_ledger_order_id ON photographer_ledger(order_id);