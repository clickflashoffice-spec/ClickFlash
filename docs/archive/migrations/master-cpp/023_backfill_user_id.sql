-- Backfill user_id based on email for historical logs
UPDATE login_history
SET user_id = (
        SELECT id
        FROM users
        WHERE users.email = login_history.email
    )
WHERE user_id IS NULL
    AND email IS NOT NULL;