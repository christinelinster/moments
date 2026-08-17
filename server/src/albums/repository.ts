import type {
  SessionDatabase,
  TransactionalDatabase,
} from "../auth/sessions.js";
import type { PoolClient } from "pg";
import { AppError } from "../errors.js";

export type Album = {
  id: string;
  scrapbookId: string;
  name: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

type AlbumRow = {
  id: string;
  scrapbook_id: string;
  name: string;
  position: number;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapAlbum(row: AlbumRow): Album {
  return {
    id: row.id,
    scrapbookId: row.scrapbook_id,
    name: row.name,
    position: row.position,
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

export async function listAlbums(
  db: SessionDatabase,
  scrapbookId: string,
): Promise<Album[]> {
  const result = await db.query<AlbumRow>(
    `
      SELECT id, scrapbook_id, name, position, created_at, updated_at
      FROM albums
      WHERE scrapbook_id = $1
      ORDER BY position ASC, id ASC
    `,
    [scrapbookId],
  );

  return result.rows.map(mapAlbum);
}

export async function albumExistsInScrapbook(
  db: SessionDatabase,
  scrapbookId: string,
  albumId: string,
): Promise<boolean> {
  const result = await db.query(
    "SELECT 1 FROM albums WHERE scrapbook_id = $1 AND id = $2",
    [scrapbookId, albumId],
  );
  return result.rows.length > 0;
}

export async function createAlbum(
  db: SessionDatabase,
  scrapbookId: string,
  name: string,
): Promise<Album> {
  const result = await db.query<AlbumRow>(
    `
      INSERT INTO albums (scrapbook_id, name, position)
      VALUES (
        $1,
        $2,
        COALESCE((SELECT MAX(position) + 1 FROM albums WHERE scrapbook_id = $1), 0)
      )
      RETURNING id, scrapbook_id, name, position, created_at, updated_at
    `,
    [scrapbookId, name],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Album creation did not return an album");
  }

  return mapAlbum(row);
}

export async function updateAlbum(
  db: SessionDatabase,
  scrapbookId: string,
  albumId: string,
  name: string,
): Promise<Album | null> {
  const result = await db.query<AlbumRow>(
    `
      UPDATE albums
      SET name = $3, updated_at = NOW()
      WHERE scrapbook_id = $1 AND id = $2
      RETURNING id, scrapbook_id, name, position, created_at, updated_at
    `,
    [scrapbookId, albumId, name],
  );
  const row = result.rows[0];
  return row ? mapAlbum(row) : null;
}

export async function reorderAlbums(
  db: TransactionalDatabase,
  scrapbookId: string,
  orderedIds: string[],
): Promise<void> {
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new AppError(400, "Album IDs must be unique", "INVALID_ORDER");
  }

  await withTransaction(db, async (client) => {
    const existing = await client.query<{ id: string }>(
      `
        SELECT id
        FROM albums
        WHERE scrapbook_id = $1
        ORDER BY position ASC, id ASC
        FOR UPDATE
      `,
      [scrapbookId],
    );
    const existingIds = new Set(existing.rows.map((row) => row.id));
    if (
      existingIds.size !== orderedIds.length ||
      orderedIds.some((albumId) => !existingIds.has(albumId))
    ) {
      throw new AppError(
        400,
        "orderedIds must include every album exactly once",
        "INVALID_ORDER",
      );
    }

    for (const [position, albumId] of orderedIds.entries()) {
      const result = await client.query(
        `
          UPDATE albums
          SET position = $3, updated_at = NOW()
          WHERE scrapbook_id = $1 AND id = $2
        `,
        [scrapbookId, albumId, position],
      );
      if ((result.rowCount ?? 0) !== 1) {
        throw new AppError(404, "Album was not found", "ALBUM_NOT_FOUND");
      }
    }
  });
}

export async function deleteAlbum(
  db: TransactionalDatabase,
  scrapbookId: string,
  albumId: string,
): Promise<boolean> {
  return withTransaction(db, async (client) => {
    await client.query(
      `
        UPDATE media_items
        SET album_id = NULL, updated_at = NOW()
        WHERE scrapbook_id = $1 AND album_id = $2
      `,
      [scrapbookId, albumId],
    );

    await client.query(
      `
        WITH ordered AS (
          SELECT
            id,
            (ROW_NUMBER() OVER (ORDER BY position ASC, id ASC) - 1)::integer
              AS new_position
          FROM media_items
          WHERE scrapbook_id = $1 AND album_id IS NULL
        )
        UPDATE media_items AS media
        SET position = ordered.new_position,
            updated_at = NOW()
        FROM ordered
        WHERE media.id = ordered.id
          AND media.scrapbook_id = $1
      `,
      [scrapbookId],
    );

    const result = await client.query(
      `
        DELETE FROM albums
        WHERE scrapbook_id = $1 AND id = $2
      `,
      [scrapbookId, albumId],
    );
    return (result.rowCount ?? 0) === 1;
  });
}
