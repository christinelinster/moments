CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS scrapbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  public_share_token TEXT NOT NULL UNIQUE,
  share_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  theme_key VARCHAR(64) NOT NULL DEFAULT 'field-journal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scrapbooks_owner_id_idx ON scrapbooks(owner_id);

CREATE TABLE IF NOT EXISTS scrapbook_editors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrapbook_id UUID NOT NULL REFERENCES scrapbooks(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'editor' CHECK (role = 'editor'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_at TIMESTAMPTZ,
  UNIQUE (scrapbook_id, email)
);

CREATE INDEX IF NOT EXISTS scrapbook_editors_email_idx ON scrapbook_editors(email);

CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrapbook_id UUID NOT NULL REFERENCES scrapbooks(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS albums_scrapbook_position_idx ON albums(scrapbook_id, position);

CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrapbook_id UUID NOT NULL REFERENCES scrapbooks(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  media_type VARCHAR(16) NOT NULL CHECK (media_type IN ('photo', 'video')),
  mime_type VARCHAR(128) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  caption TEXT,
  location TEXT,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_items_scrapbook_idx ON media_items(scrapbook_id);
CREATE INDEX IF NOT EXISTS media_items_album_position_idx ON media_items(album_id, position);

CREATE TABLE IF NOT EXISTS sticker_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrapbook_id UUID NOT NULL REFERENCES scrapbooks(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sticker_assets_scrapbook_idx ON sticker_assets(scrapbook_id);

CREATE TABLE IF NOT EXISTS sticker_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  sticker_asset_id UUID NOT NULL REFERENCES sticker_assets(id) ON DELETE CASCADE,
  x NUMERIC(8, 5) NOT NULL DEFAULT 0,
  y NUMERIC(8, 5) NOT NULL DEFAULT 0,
  scale NUMERIC(8, 5) NOT NULL DEFAULT 1 CHECK (scale > 0),
  rotation NUMERIC(8, 3) NOT NULL DEFAULT 0,
  layer INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sticker_placements_album_layer_idx ON sticker_placements(album_id, layer);
