DROP INDEX IF EXISTS media_items_scrapbook_content_hash_idx;

CREATE UNIQUE INDEX media_items_scrapbook_content_hash_idx
  ON media_items(scrapbook_id, content_hash);
