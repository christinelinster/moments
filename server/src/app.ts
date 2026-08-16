import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { Pool } from "pg";

import type { AppConfig } from "./config.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import type { MediaStorage } from "./storage/storage.js";

export type AppDependencies = {
  db: Pool;
  storage: MediaStorage;
  config: Pick<AppConfig, "clientOrigin">;
};

export function createApp({ db, config }: AppDependencies): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        callback(
          null,
          requestOrigin === config.clientOrigin ? requestOrigin : false,
        );
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", async (_request, response, next) => {
    try {
      await db.query("SELECT 1 AS ok");
      response.json({ ok: true, database: "up" });
    } catch (error) {
      next(error);
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
