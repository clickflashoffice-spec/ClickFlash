-- Up
CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts USING fts5(
  photo_id,
  title,
  tags,
  scene,
  mood,
  content='photos',
  content_rowid='rowid'
);

-- Down
DROP TABLE IF EXISTS photos_fts;
