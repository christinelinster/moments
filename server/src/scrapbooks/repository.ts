import { randomBytes } from "node:crypto";

import type { SessionDatabase } from "../auth/sessions.js";

export type ScrapbookDatabase = SessionDatabase;

export const THEME_KEYS = [
  "field-journal",
  "poolside",
  "citrus-notebook",
  "moonlight-ink",
] as const;

export type Scrapbook = {
  id: string;
  ownerId: string;
  title: string;
  themeKey: string;
  shareEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ShareLink = {
  shareToken: string;
  enabled: boolean;
};

type ScrapbookRow = {
  id: string;
  owner_id: string;
  title: string;
  theme_key: string;
  share_enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type ShareLinkRow = {
  public_share_token: string;
  share_enabled: boolean;
};

function mapScrapbook(row: ScrapbookRow): Scrapbook {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    themeKey: row.theme_key,
    shareEnabled: row.share_enabled,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapShareLink(row: ShareLinkRow): ShareLink {
  return {
    shareToken: row.public_share_token,
    enabled: row.share_enabled,
  };
}

export async function createScrapbook(
  db: ScrapbookDatabase,
  ownerId: string,
  title: string,
): Promise<Scrapbook> {
  const result = await db.query<ScrapbookRow>(
    `
      INSERT INTO scrapbooks
        (owner_id, title, public_share_token, share_enabled, theme_key)
      VALUES ($1, $2, $3, TRUE, $4)
      RETURNING id, owner_id, title, theme_key, share_enabled, created_at, updated_at
    `,
    [ownerId, title, randomBytes(32).toString("base64url"), "field-journal"],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Scrapbook creation did not return a scrapbook");
  }

  return mapScrapbook(row);
}

export async function getScrapbook(
  db: ScrapbookDatabase,
  scrapbookId: string,
): Promise<Scrapbook | null> {
  const result = await db.query<ScrapbookRow>(
    `
      SELECT id, owner_id, title, theme_key, share_enabled, created_at, updated_at
      FROM scrapbooks
      WHERE id = $1
    `,
    [scrapbookId],
  );

  const row = result.rows[0];
  return row ? mapScrapbook(row) : null;
}

export async function updateScrapbook(
  db: ScrapbookDatabase,
  scrapbookId: string,
  updates: { title?: string; themeKey?: string },
): Promise<Scrapbook | null> {
  const result = await db.query<ScrapbookRow>(
    `
      UPDATE scrapbooks
      SET title = COALESCE($2, title),
          theme_key = COALESCE($3, theme_key),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, owner_id, title, theme_key, share_enabled, created_at, updated_at
    `,
    [scrapbookId, updates.title ?? null, updates.themeKey ?? null],
  );

  const row = result.rows[0];
  return row ? mapScrapbook(row) : null;
}

export async function getShareLink(
  db: ScrapbookDatabase,
  scrapbookId: string,
): Promise<ShareLink | null> {
  const result = await db.query<ShareLinkRow>(
    `
      SELECT public_share_token, share_enabled
      FROM scrapbooks
      WHERE id = $1
    `,
    [scrapbookId],
  );

  const row = result.rows[0];
  return row ? mapShareLink(row) : null;
}

export async function rotateShareToken(
  db: ScrapbookDatabase,
  scrapbookId: string,
): Promise<ShareLink | null> {
  const result = await db.query<ShareLinkRow>(
    `
      UPDATE scrapbooks
      SET public_share_token = $2,
          share_enabled = TRUE,
          updated_at = NOW()
      WHERE id = $1
      RETURNING public_share_token, share_enabled
    `,
    [scrapbookId, randomBytes(32).toString("base64url")],
  );

  const row = result.rows[0];
  return row ? mapShareLink(row) : null;
}

export async function setShareEnabled(
  db: ScrapbookDatabase,
  scrapbookId: string,
  enabled: boolean,
): Promise<ShareLink | null> {
  const result = await db.query<ShareLinkRow>(
    `
      UPDATE scrapbooks
      SET share_enabled = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING public_share_token, share_enabled
    `,
    [scrapbookId, enabled],
  );

  const row = result.rows[0];
  return row ? mapShareLink(row) : null;
}

export type PublicScrapbookSnapshot = {
  scrapbook: {
    id: string;
    title: string;
    themeKey: string;
    createdAt: Date;
    updatedAt: Date;
  };
  albums: Array<{ id: string; name: string; position: number }>;
  media: Array<{
    id: string;
    albumId: string | null;
    originalName: string;
    mediaType: string;
    mimeType: string;
    byteSize: number;
    fileUrl: string;
    caption: string | null;
    location: string | null;
    position: number;
    createdAt: Date;
  }>;
  stickerAssets: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    byteSize: number;
  }>;
  stickerPlacements: Array<{
    id: string;
    albumId: string;
    stickerAssetId: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    layer: number;
  }>;
};

type PublicScrapbookRow = {
  id: string;
  title: string;
  theme_key: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function numeric(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

export async function getPublicSnapshot(
  db: ScrapbookDatabase,
  shareToken: string,
): Promise<PublicScrapbookSnapshot | null> {
  const scrapbookResult = await db.query<PublicScrapbookRow>(
    `
      SELECT id, title, theme_key, created_at, updated_at
      FROM scrapbooks
      WHERE public_share_token = $1 AND share_enabled = TRUE
    `,
    [shareToken],
  );
  const scrapbook = scrapbookResult.rows[0];
  if (!scrapbook) {
    return null;
  }

  const [albumsResult, mediaResult, stickerAssetsResult, placementsResult] =
    await Promise.all([
      db.query<{ id: string; name: string; position: number }>(
        `
          SELECT id, name, position
          FROM albums
          WHERE scrapbook_id = $1
          ORDER BY position ASC, id ASC
        `,
        [scrapbook.id],
      ),
      db.query<{
        id: string;
        album_id: string | null;
        original_name: string;
        media_type: string;
        mime_type: string;
        byte_size: string | number;
        caption: string | null;
        location: string | null;
        position: number;
        created_at: Date | string;
      }>(
        `
          SELECT id, album_id, original_name, media_type, mime_type, byte_size,
                 caption, location, position, created_at
          FROM media_items
          WHERE scrapbook_id = $1
          ORDER BY album_id NULLS LAST, position ASC, id ASC
        `,
        [scrapbook.id],
      ),
      db.query<{
        id: string;
        original_name: string;
        mime_type: string;
        byte_size: string | number;
      }>(
        `
          SELECT id, original_name, mime_type, byte_size
          FROM sticker_assets
          WHERE scrapbook_id = $1
          ORDER BY created_at ASC, id ASC
        `,
        [scrapbook.id],
      ),
      db.query<{
        id: string;
        album_id: string;
        sticker_asset_id: string;
        x: string | number;
        y: string | number;
        scale: string | number;
        rotation: string | number;
        layer: number;
      }>(
        `
          SELECT id, album_id, sticker_asset_id, x, y, scale, rotation, layer
          FROM sticker_placements
          WHERE scrapbook_id = $1
          ORDER BY album_id ASC, layer ASC, id ASC
        `,
        [scrapbook.id],
      ),
    ]);

  return {
    scrapbook: {
      id: scrapbook.id,
      title: scrapbook.title,
      themeKey: scrapbook.theme_key,
      createdAt: new Date(scrapbook.created_at),
      updatedAt: new Date(scrapbook.updated_at),
    },
    albums: albumsResult.rows,
    media: mediaResult.rows.map((row) => ({
      id: row.id,
      albumId: row.album_id,
      originalName: row.original_name,
      mediaType: row.media_type,
      mimeType: row.mime_type,
      byteSize: numeric(row.byte_size),
      fileUrl: `/api/files/by-media/${encodeURIComponent(row.id)}?shareToken=${encodeURIComponent(shareToken)}`,
      caption: row.caption,
      location: row.location,
      position: row.position,
      createdAt: new Date(row.created_at),
    })),
    stickerAssets: stickerAssetsResult.rows.map((row) => ({
      id: row.id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      byteSize: numeric(row.byte_size),
    })),
    stickerPlacements: placementsResult.rows.map((row) => ({
      id: row.id,
      albumId: row.album_id,
      stickerAssetId: row.sticker_asset_id,
      x: numeric(row.x),
      y: numeric(row.y),
      scale: numeric(row.scale),
      rotation: numeric(row.rotation),
      layer: row.layer,
    })),
  };
}
