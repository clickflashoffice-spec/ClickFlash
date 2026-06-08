-- Add tracking for marketing automation to prevent double-emailing
ALTER TABLE orders ADD COLUMN marketing_emails_sent INTEGER DEFAULT 0;
