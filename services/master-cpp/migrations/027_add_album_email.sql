-- Add customerEmail to albums for MoneyTrash/Retention
ALTER TABLE albums
ADD COLUMN customerEmail TEXT;