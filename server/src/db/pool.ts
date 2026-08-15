import { Pool } from "pg";

import type { AppConfig } from "../config";

export function createPool(config: AppConfig): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
  });
}
