import "dotenv/config";

import { createApp } from "./app";
import { loadConfig } from "./config";
import { runMigrations } from "./db/migrate";
import { createPool } from "./db/pool";
import { createLocalStorage } from "./storage/local-storage";

const config = loadConfig(process.env);
const pool = createPool(config);

await runMigrations(pool);

const app = createApp({
  db: pool,
  storage: createLocalStorage(config.mediaRoot),
});

const server = app.listen(config.port, () => {
  console.log(`Photo scrapbook API listening on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
