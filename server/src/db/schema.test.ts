import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runMigrations } from "./migrate.js";

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("database foundation", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const migrationsDirectory = path.resolve(process.cwd(), "src/db/migrations");

  beforeAll(async () => {
    await runMigrations(pool, migrationsDirectory);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("is idempotent and records applied migrations", async () => {
    await runMigrations(pool, migrationsDirectory);

    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM schema_migrations",
    );

    expect(Number(result.rows[0]?.count)).toBeGreaterThan(0);
  });

  it("serializes concurrent migration runners", async () => {
    const migrationDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "photo-scrapbook-migrations-"),
    );
    const filename = `${randomUUID()}.sql`;
    const tableName = `migration_probe_${randomUUID().replaceAll("-", "")}`;

    await fs.writeFile(
      path.join(migrationDirectory, filename),
      `CREATE TABLE ${tableName} (id INTEGER); SELECT pg_sleep(0.2);`,
    );

    try {
      const results = await Promise.allSettled([
        runMigrations(pool, migrationDirectory),
        runMigrations(pool, migrationDirectory),
      ]);

      expect(results.every((result) => result.status === "fulfilled")).toBe(true);

      const applied = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM schema_migrations WHERE filename = $1",
        [filename],
      );
      expect(Number(applied.rows[0]?.count)).toBe(1);
    } finally {
      await pool.query(`DROP TABLE IF EXISTS ${tableName}`);
      await pool.query("DELETE FROM schema_migrations WHERE filename = $1", [filename]);
      await fs.rm(migrationDirectory, { recursive: true, force: true });
    }
  });

  it("enforces lowercase emails and scrapbook-scoped relationships", async () => {
    const deletionJobsTable = await pool.query<{ table_name: string | null }>(
      "SELECT to_regclass('public.media_deletion_jobs') AS table_name",
    );
    expect(deletionJobsTable.rows[0]?.table_name).toBe("media_deletion_jobs");

    const constraints = await pool.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (
        'users_email_lowercase_check',
        'scrapbook_editors_email_lowercase_check',
        'media_items_album_scrapbook_fkey',
        'sticker_placements_album_scrapbook_fkey',
        'sticker_placements_asset_scrapbook_fkey'
      )
    `);

    expect(constraints.rows.map((row) => row.conname)).toEqual(
      expect.arrayContaining([
        "users_email_lowercase_check",
        "scrapbook_editors_email_lowercase_check",
        "media_items_album_scrapbook_fkey",
        "sticker_placements_album_scrapbook_fkey",
        "sticker_placements_asset_scrapbook_fkey",
      ]),
    );

    await expect(
      pool.query(
        "INSERT INTO users (email, password_hash) VALUES ('MixedCase@example.com', 'hash')",
      ),
    ).rejects.toThrow();

    const ownerResult = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, 'hash') RETURNING id",
      [`schema-test-${randomUUID()}@example.com`],
    );
    const ownerId = ownerResult.rows[0]?.id;
    if (!ownerId) {
      throw new Error("Schema test did not create an owner");
    }

    try {
      const scrapbookResult = await pool.query<{ id: string; title: string }>(
        `
          INSERT INTO scrapbooks (owner_id, title, public_share_token)
          VALUES ($1, 'Schema A', $2), ($1, 'Schema B', $3)
          RETURNING id, title
        `,
        [ownerId, `schema-a-${randomUUID()}`, `schema-b-${randomUUID()}`],
      );
      const scrapbookA = scrapbookResult.rows.find((row) => row.title === "Schema A")?.id;
      const scrapbookB = scrapbookResult.rows.find((row) => row.title === "Schema B")?.id;
      if (!scrapbookA || !scrapbookB) {
        throw new Error("Schema test did not create both scrapbooks");
      }

      await expect(
        pool.query(
          "INSERT INTO scrapbook_editors (scrapbook_id, email) VALUES ($1, 'MixedCase@example.com')",
          [scrapbookA],
        ),
      ).rejects.toThrow();

      const albumResult = await pool.query<{ id: string; name: string }>(
        `
          INSERT INTO albums (scrapbook_id, name)
          VALUES ($1, 'Album A'), ($2, 'Album B')
          RETURNING id, name
        `,
        [scrapbookA, scrapbookB],
      );
      const albumA = albumResult.rows.find((row) => row.name === "Album A")?.id;
      const albumB = albumResult.rows.find((row) => row.name === "Album B")?.id;
      if (!albumA || !albumB) {
        throw new Error("Schema test did not create both albums");
      }

      await expect(
        pool.query(
          `
            INSERT INTO media_items
              (scrapbook_id, album_id, storage_key, original_name, media_type, mime_type, byte_size)
            VALUES ($1, $2, $3, 'wrong-album.jpg', 'photo', 'image/jpeg', 1)
          `,
          [scrapbookA, albumB, `schema-media-${randomUUID()}`],
        ),
      ).rejects.toThrow();

      const stickerResult = await pool.query<{ id: string; scrapbook_id: string }>(
        `
          INSERT INTO sticker_assets
            (scrapbook_id, storage_key, original_name, mime_type, byte_size)
          VALUES ($1, $2, 'sticker-a.png', 'image/png', 1),
                 ($3, $4, 'sticker-b.png', 'image/png', 1)
          RETURNING id, scrapbook_id
        `,
        [
          scrapbookA,
          `schema-sticker-a-${randomUUID()}`,
          scrapbookB,
          `schema-sticker-b-${randomUUID()}`,
        ],
      );
      const stickerA = stickerResult.rows.find((row) => row.scrapbook_id === scrapbookA)?.id;
      const stickerB = stickerResult.rows.find((row) => row.scrapbook_id === scrapbookB)?.id;
      if (!stickerA || !stickerB) {
        throw new Error("Schema test did not create both sticker assets");
      }

      await expect(
        pool.query(
          `
            INSERT INTO sticker_placements (scrapbook_id, album_id, sticker_asset_id)
            VALUES ($1, $2, $3)
          `,
          [scrapbookA, albumB, stickerA],
        ),
      ).rejects.toThrow();

      await expect(
        pool.query(
          `
            INSERT INTO sticker_placements (scrapbook_id, album_id, sticker_asset_id)
            VALUES ($1, $2, $3)
          `,
          [scrapbookA, albumA, stickerB],
        ),
      ).rejects.toThrow();
    } finally {
      await pool.query("DELETE FROM users WHERE id = $1", [ownerId]);
    }
  });
});
