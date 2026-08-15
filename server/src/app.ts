import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { Pool } from "pg";

import { errorHandler, notFoundHandler } from "./errors";
import type { MediaStorage } from "./storage/storage";

export type AppDependencies = {
  db: Pool;
  storage: MediaStorage;
};

export function createApp({ db }: AppDependencies): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
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
