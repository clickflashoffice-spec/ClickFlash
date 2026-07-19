ALTER TABLE sessions ADD COLUMN customer_email TEXT;
ALTER TABLE sessions ADD COLUMN customer_phone TEXT;
ALTER TABLE sessions ADD COLUMN notified_at TIMESTAMP;
ALTER TABLE sessions ADD COLUMN abandoned_email_sent INTEGER DEFAULT 0;
