CREATE TABLE IF NOT EXISTS media_upload_cleanup_jobs (
  storage_key TEXT PRIMARY KEY,
  scrapbook_id UUID REFERENCES scrapbooks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_upload_cleanup_jobs_created_idx
  ON media_upload_cleanup_jobs(created_at);
