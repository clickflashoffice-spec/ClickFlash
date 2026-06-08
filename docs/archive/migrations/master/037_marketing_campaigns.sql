-- Phase 33: Smart Marketing Automation
-- Database schema for automated email campaigns (SQLite compatible)

-- Marketing campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('post-event', 'abandoned-cart', 're-engagement')),
    trigger_event TEXT NOT NULL,
    delay_minutes INTEGER NOT NULL,
    subject_template TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Campaign sends (tracking)
CREATE TABLE IF NOT EXISTS campaign_sends (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    campaign_id TEXT REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    customer_email TEXT NOT NULL,
    album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    opened_at DATETIME,
    clicked_at DATETIME,
    converted_at DATETIME,
    conversion_value REAL DEFAULT 0,
    sendgrid_message_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_email ON campaign_sends(customer_email);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_sent_at ON campaign_sends(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);

-- Customer engagement scores
CREATE TABLE IF NOT EXISTS customer_engagement (
    customer_email TEXT PRIMARY KEY,
    total_emails_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_converted INTEGER DEFAULT 0,
    lifetime_value REAL DEFAULT 0,
    last_engagement_at DATETIME,
    engagement_score INTEGER DEFAULT 50,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Note: Seed data for default campaigns should be inserted via the application
-- to handle multi-line HTML content properly, or use a separate data migration.
