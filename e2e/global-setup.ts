import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { Pool } from "pg";
import { e2eBaseDatabaseUrl, e2eDatabaseUrl, e2eMediaRoot, e2eSchema } from "./test-environment";

const execFileAsync = promisify(execFile);
const repositoryRoot = process.cwd();

export default async function globalSetup() {
  const baseUrl = e2eBaseDatabaseUrl();
  await fs.rm(e2eMediaRoot, { recursive: true, force: true });
  await fs.mkdir(e2eMediaRoot, { recursive: true });

  const pool = new Pool({ connectionString: baseUrl });
  try {
    await pool.query(`DROP SCHEMA IF EXISTS "${e2eSchema}" CASCADE`);
    await pool.query(`CREATE SCHEMA "${e2eSchema}"`);
  } finally {
    await pool.end();
  }

  await execFileAsync("npm", ["run", "db:migrate", "--workspace", "server"], {
    cwd: repositoryRoot,
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: e2eDatabaseUrl(), MEDIA_ROOT: e2eMediaRoot },
  });
}
