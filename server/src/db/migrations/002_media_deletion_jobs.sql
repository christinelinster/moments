CREATE TABLE IF NOT EXISTS media_deletion_jobs (
  scrapbook_id UUID NOT NULL REFERENCES scrapbooks(id) ON DELETE CASCADE,
  media_id UUID NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scrapbook_id, media_id)
);

CREATE INDEX IF NOT EXISTS media_deletion_jobs_scrapbook_idx
  ON media_deletion_jobs(scrapbook_id, created_at);
