import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";

import { loadConfig } from "../config.js";
import { createPool } from "./pool.js";
import type { Pool } from "pg";

const defaultMigrationsDirectory = fileURLToPath(new URL("./migrations", import.meta.url));
const MIGRATION_LOCK_KEY = 27182818;

export async function runMigrations(
  pool: Pool,
  migrationsDirectory = defaultMigrationsDirectory,
): Promise<void> {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query("SELECT pg_advisory_lock($1::bigint)", [MIGRATION_LOCK_KEY]);
    lockAcquired = true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const filenames = (await fs.readdir(migrationsDirectory))
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    for (const filename of filenames) {
      const applied = await client.query<{ filename: string }>(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [filename],
      );

      if (applied.rowCount) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDirectory, filename), "utf8");

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (lockAcquired) {
      await client
        .query("SELECT pg_advisory_unlock($1::bigint)", [MIGRATION_LOCK_KEY])
        .catch(() => undefined);
    }
    client.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig(process.env);
  const pool = createPool(config);

  runMigrations(pool)
    .then(() => pool.end())
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exitCode = 1;
    });
}
