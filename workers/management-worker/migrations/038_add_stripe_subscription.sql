-- 038_add_stripe_subscription.sql
-- Add stripe_subscription_id to studios table

ALTER TABLE studios ADD COLUMN stripe_subscription_id TEXT;
