import "dotenv/config";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { createPool } from "./db/pool.js";
import { createLocalStorage } from "./storage/local-storage.js";

const config = loadConfig(process.env);
const pool = createPool(config);

await runMigrations(pool);

const app = createApp({
  db: pool,
  storage: createLocalStorage(config.mediaRoot),
  config,
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
