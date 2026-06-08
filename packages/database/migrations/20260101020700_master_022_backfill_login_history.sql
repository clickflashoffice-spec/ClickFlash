-- Backfill status and reason from legacy columns
UPDATE login_history
SET status = CASE
        WHEN success = 1 THEN 'SUCCESS'
        ELSE 'FAILED'
    END
WHERE status IS NULL
    OR status = 'failed'
    AND success IS NOT NULL;
UPDATE login_history
SET reason = failure_reason
WHERE reason IS NULL
    AND failure_reason IS NOT NULL;