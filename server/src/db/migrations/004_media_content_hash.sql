ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS content_hash CHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS media_items_scrapbook_content_hash_idx
  ON media_items(scrapbook_id, content_hash);
