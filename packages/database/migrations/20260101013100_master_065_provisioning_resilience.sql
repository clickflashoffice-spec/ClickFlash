-- Phase 7: Industrial Zero-Touch Provisioning (ZTP)
-- Create provisioning_steps table for resumable deployment state tracking.

CREATE TABLE IF NOT EXISTS IF NOT EXISTS provisioning_steps (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed, rolled_back
    message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    error TEXT,
    result_data TEXT, -- JSON payload of results (e.g., tunnel IDs, tokens)
    retry_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for status-based lookups during resumption
CREATE INDEX IF NOT EXISTS idx_provisioning_steps_status ON provisioning_steps(status);

-- Seed initial steps if they don't exist
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('initializing', 'Initializing Database & Credentials');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_tunnel', 'Creating Cloudflare Tunnel');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_dns', 'Configuring DNS Records');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_waf', 'Hardening Firewall (WAF)');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_gallery', 'Registering Gallery App');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_management', 'Registering Management Hub');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_workers', 'Deploying Workers Script');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_website', 'Registering Website App');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('cloudflare_webhooks', 'Creating Webhooks & Alerts');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('hub_registration', 'Connecting to Management Hub');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('sync_setup', 'Configuring Background Sync');
INSERT OR IGNORE INTO provisioning_steps (id, label) VALUES ('finalizing', 'Finalizing Deployment');
