import fs from "node:fs/promises";
import { Pool } from "pg";
import { e2eBaseDatabaseUrl, e2eMediaRoot, e2eSchema } from "./test-environment";

export default async function globalTeardown() {
  const pool = new Pool({ connectionString: e2eBaseDatabaseUrl() });
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${e2eSchema}" CASCADE`);
  } finally {
    await pool.end();
  }
  await fs.rm(e2eMediaRoot, { recursive: true, force: true });
}

