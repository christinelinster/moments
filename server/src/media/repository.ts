import type {
  SessionDatabase,
  TransactionalDatabase,
} from "../auth/sessions.js";
import { AppError } from "../errors.js";
import type { PoolClient } from "pg";

export type MediaItem = {
  id: string;
  scrapbookId: string;
  albumId: string | null;
  storageKey: string;
  originalName: string;
  mediaType: "photo" | "video";
  mimeType: string;
  byteSize: number;
  caption: string | null;
  location: string | null;
  position: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MediaCreateInput = {
  scrapbookId: string;
  albumId: string | null;
  storageKey: string;
  originalName: string;
  mediaType: "photo" | "video";
  mimeType: string;
  byteSize: number;
  caption: string | null;
  location: string | null;
  createdBy: string;
};

export type MediaDeletionTarget = {
  id: string;
  storageKey: string;
};

export type FileAccess = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  scrapbookId: string;
};

type MediaRow = {
  id: string;
  scrapbook_id: string;
  album_id: string | null;
  storage_key: string;
  original_name: string;
  media_type: "photo" | "video";
  mime_type: string;
  byte_size: string | number;
  caption: string | null;
  location: string | null;
  position: number;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function numeric(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    scrapbookId: row.scrapbook_id,
    albumId: row.album_id,
    storageKey: row.storage_key,
    originalName: row.original_name,
    mediaType: row.media_type,
    mimeType: row.mime_type,
    byteSize: numeric(row.byte_size),
    caption: row.caption,
    location: row.location,
    position: row.position,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function withTransaction<T>(
  db: TransactionalDatabase,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const mediaColumns = `
  id, scrapbook_id, album_id, storage_key, original_name, media_type,
  mime_type, byte_size, caption, location, position, created_by,
  created_at, updated_at
`;

export async function listMedia(
  db: SessionDatabase,
  scrapbookId: string,
  albumId?: string | null,
): Promise<MediaItem[]> {
  const result = await db.query<MediaRow>(
    `
      SELECT ${mediaColumns}
      FROM media_items
      WHERE scrapbook_id = $1
        AND ($2::uuid IS NULL OR album_id = $2)
      ORDER BY position ASC, id ASC
    `,
    [scrapbookId, albumId ?? null],
  );
  return result.rows.map(mapMedia);
}

export async function createMedia(
  db: SessionDatabase,
  input: MediaCreateInput,
): Promise<MediaItem> {
  const result = await db.query<MediaRow>(
    `
      INSERT INTO media_items
        (
          scrapbook_id, album_id, storage_key, original_name, media_type,
          mime_type, byte_size, caption, location, position, created_by
        )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        COALESCE(
          (SELECT MAX(position) + 1 FROM media_items
           WHERE scrapbook_id = $1 AND album_id IS NOT DISTINCT FROM $2),
          0
        ),
        $10
      )
      RETURNING ${mediaColumns}
    `,
    [
      input.scrapbookId,
      input.albumId,
      input.storageKey,
      input.originalName,
      input.mediaType,
      input.mimeType,
      input.byteSize,
      input.caption,
      input.location,
      input.createdBy,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Media creation did not return a media item");
  }
  return mapMedia(row);
}

export async function updateMedia(
  db: SessionDatabase,
  scrapbookId: string,
  mediaId: string,
  updates: { caption?: string | null; location?: string | null },
): Promise<MediaItem | null> {
  const assignments: string[] = [];
  const parameters: Array<string | null> = [scrapbookId, mediaId];
  if (Object.prototype.hasOwnProperty.call(updates, "caption")) {
    parameters.push(updates.caption ?? null);
    assignments.push(`caption = $${parameters.length}`);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "location")) {
    parameters.push(updates.location ?? null);
    assignments.push(`location = $${parameters.length}`);
  }

  if (assignments.length === 0) {
    return null;
  }

  const result = await db.query<MediaRow>(
    `
      UPDATE media_items
      SET ${assignments.join(", ")},
          updated_at = NOW()
      WHERE scrapbook_id = $1 AND id = $2
      RETURNING ${mediaColumns}
    `,
    parameters,
  );
  const row = result.rows[0];
  return row ? mapMedia(row) : null;
}

export async function reorderMedia(
  db: TransactionalDatabase,
  scrapbookId: string,
  albumId: string | null,
  orderedIds: string[],
): Promise<void> {
  await withTransaction(db, async (client) => {
    const existing = await client.query<{ id: string }>(
      `
        SELECT id
        FROM media_items
        WHERE scrapbook_id = $1 AND album_id IS NOT DISTINCT FROM $2
        ORDER BY position ASC, id ASC
        FOR UPDATE
      `,
      [scrapbookId, albumId],
    );
    const existingIds = new Set(existing.rows.map((row) => row.id));
    if (
      existingIds.size !== orderedIds.length ||
      orderedIds.some((mediaId) => !existingIds.has(mediaId))
    ) {
      throw new AppError(
        400,
        "orderedIds must include every media item in the album exactly once",
        "INVALID_ORDER",
      );
    }

    for (const [position, mediaId] of orderedIds.entries()) {
      const result = await client.query(
        `
          UPDATE media_items
          SET position = $4, updated_at = NOW()
          WHERE scrapbook_id = $1
            AND id = $2
            AND album_id IS NOT DISTINCT FROM $3
        `,
        [scrapbookId, mediaId, albumId, position],
      );
      if ((result.rowCount ?? 0) !== 1) {
        throw new AppError(
          404,
          "Media item was not found in the requested album",
          "MEDIA_NOT_FOUND",
        );
      }
    }
  });
}

export async function bulkMoveMedia(
  db: TransactionalDatabase,
  scrapbookId: string,
  mediaIds: string[],
  albumId: string | null,
): Promise<void> {
  await withTransaction(db, async (client) => {
    if (albumId) {
      const album = await client.query(
        "SELECT id FROM albums WHERE scrapbook_id = $1 AND id = $2",
        [scrapbookId, albumId],
      );
      if ((album.rowCount ?? 0) !== 1) {
        throw new AppError(404, "Destination album was not found", "ALBUM_NOT_FOUND");
      }
    }

    const selected = await client.query<{ id: string; album_id: string | null }>(
      `
        SELECT id, album_id
        FROM media_items
        WHERE scrapbook_id = $1 AND id = ANY($2::uuid[])
        FOR UPDATE
      `,
      [scrapbookId, mediaIds],
    );
    if (selected.rows.length !== new Set(mediaIds).size) {
      throw new AppError(404, "One or more media items were not found", "MEDIA_NOT_FOUND");
    }

    await client.query(
      `
        UPDATE media_items
        SET album_id = $3, updated_at = NOW()
        WHERE scrapbook_id = $1 AND id = ANY($2::uuid[])
      `,
      [scrapbookId, mediaIds, albumId],
    );

    const affectedAlbums = new Set<string | null>([
      albumId,
      ...selected.rows.map((row) => row.album_id),
    ]);
    for (const affectedAlbumId of affectedAlbums) {
      const rows = await client.query<{ id: string }>(
        `
          SELECT id
          FROM media_items
          WHERE scrapbook_id = $1 AND album_id IS NOT DISTINCT FROM $2
          ORDER BY position ASC, id ASC
          FOR UPDATE
        `,
        [scrapbookId, affectedAlbumId],
      );
      for (const [position, row] of rows.rows.entries()) {
        await client.query(
          `
            UPDATE media_items
            SET position = $3, updated_at = NOW()
            WHERE scrapbook_id = $1 AND id = $2
          `,
          [scrapbookId, row.id, position],
        );
      }
    }
  });
}

export async function claimMediaForDeletion(
  db: TransactionalDatabase,
  scrapbookId: string,
  mediaIds: string[],
): Promise<MediaDeletionTarget[]> {
  const uniqueMediaIds = [...new Set(mediaIds)];

  return withTransaction(db, async (client) => {
    const activeResult = await client.query<MediaDeletionTarget>(
      `
        SELECT id, storage_key AS "storageKey"
        FROM media_items
        WHERE scrapbook_id = $1 AND id = ANY($2::uuid[])
        FOR UPDATE
      `,
      [scrapbookId, uniqueMediaIds],
    );
    const pendingResult = await client.query<MediaDeletionTarget>(
      `
        SELECT media_id AS id, storage_key AS "storageKey"
        FROM media_deletion_jobs
        WHERE scrapbook_id = $1 AND media_id = ANY($2::uuid[])
        FOR UPDATE
      `,
      [scrapbookId, uniqueMediaIds],
    );

    const targetsById = new Map(
      pendingResult.rows.map((target) => [target.id, target]),
    );
    for (const target of activeResult.rows) {
      if (!targetsById.has(target.id)) {
        targetsById.set(target.id, target);
      }
    }

    if (targetsById.size !== uniqueMediaIds.length) {
      throw new AppError(404, "One or more media items were not found", "MEDIA_NOT_FOUND");
    }

    for (const target of activeResult.rows) {
      await client.query(
        `
          INSERT INTO media_deletion_jobs (scrapbook_id, media_id, storage_key)
          VALUES ($1, $2, $3)
          ON CONFLICT (scrapbook_id, media_id) DO NOTHING
        `,
        [scrapbookId, target.id, target.storageKey],
      );
    }

    if (activeResult.rows.length > 0) {
      const deleted = await client.query<{ id: string }>(
        `
          DELETE FROM media_items
          WHERE scrapbook_id = $1 AND id = ANY($2::uuid[])
          RETURNING id
        `,
        [scrapbookId, activeResult.rows.map((target) => target.id)],
      );
      if (deleted.rows.length !== activeResult.rows.length) {
        throw new AppError(
          409,
          "Media deletion could not be claimed; retry the operation",
          "MEDIA_DELETE_CONFLICT",
        );
      }
    }

    return uniqueMediaIds.map((mediaId) => targetsById.get(mediaId)!);
  });
}

export async function completeMediaDeletion(
  db: TransactionalDatabase,
  scrapbookId: string,
  mediaIds: string[],
): Promise<void> {
  await withTransaction(db, async (client) => {
    await client.query(
      `
        DELETE FROM media_deletion_jobs
        WHERE scrapbook_id = $1 AND media_id = ANY($2::uuid[])
      `,
      [scrapbookId, [...new Set(mediaIds)]],
    );
  });
}

type FileAccessRow = {
  storage_key: string;
  original_name: string;
  mime_type: string;
  byte_size: string | number;
  scrapbook_id: string;
};

function mapFileAccess(row: FileAccessRow): FileAccess {
  return {
    storageKey: row.storage_key,
    originalName: row.original_name,
    mimeType: row.mime_type,
    byteSize: numeric(row.byte_size),
    scrapbookId: row.scrapbook_id,
  };
}

async function findFileAccessBy(
  db: SessionDatabase,
  lookupSql: string,
  lookupValue: string,
  viewer: { userId?: string; shareToken?: string },
): Promise<FileAccess | null> {
  if (viewer.shareToken) {
    const result = await db.query<FileAccessRow>(
      `
        SELECT m.storage_key, m.original_name, m.mime_type, m.byte_size, m.scrapbook_id
        FROM media_items AS m
        INNER JOIN scrapbooks AS s ON s.id = m.scrapbook_id
        WHERE ${lookupSql}
          AND s.public_share_token = $2
          AND s.share_enabled = TRUE
      `,
      [lookupValue, viewer.shareToken],
    );
    const row = result.rows[0];
    return row ? mapFileAccess(row) : null;
  }

  if (!viewer.userId) {
    return null;
  }

  const result = await db.query<FileAccessRow>(
    `
      SELECT m.storage_key, m.original_name, m.mime_type, m.byte_size, m.scrapbook_id
      FROM media_items AS m
      INNER JOIN scrapbooks AS s ON s.id = m.scrapbook_id
      LEFT JOIN scrapbook_editors AS e
        ON e.scrapbook_id = m.scrapbook_id AND e.user_id = $2
      WHERE ${lookupSql}
        AND (s.owner_id = $2 OR e.user_id = $2)
    `,
    [lookupValue, viewer.userId],
  );
  const row = result.rows[0];
  return row ? mapFileAccess(row) : null;
}

export async function findFileAccess(
  db: SessionDatabase,
  storageKey: string,
  viewer: { userId?: string; shareToken?: string },
): Promise<FileAccess | null> {
  return findFileAccessBy(db, "m.storage_key = $1", storageKey, viewer);
}

export async function findFileAccessByMediaId(
  db: SessionDatabase,
  mediaId: string,
  viewer: { userId?: string; shareToken?: string },
): Promise<FileAccess | null> {
  return findFileAccessBy(db, "m.id = $1", mediaId, viewer);
}
