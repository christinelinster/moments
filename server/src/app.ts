import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { Pool } from "pg";

import type { AppConfig } from "./config.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import type { MediaStorage } from "./storage/storage.js";
import { createAuthContext } from "./auth/middleware.js";
import { createAuthRouter } from "./auth/routes.js";
import { createPublicRouter } from "./public/routes.js";
import { createScrapbookRouter } from "./scrapbooks/routes.js";
import { createAlbumRouter } from "./albums/routes.js";
import { createFileRouter, createMediaRouter } from "./media/routes.js";
import { createStickerRouter } from "./stickers/routes.js";

export type AppDependencies = {
  db: Pool;
  storage: MediaStorage;
  config: Pick<AppConfig, "clientOrigin" | "nodeEnv" | "sessionTtlSeconds"> &
    Partial<Pick<AppConfig, "maxMediaBytes" | "maxStickerBytes">>;
};

export function createApp({ db, storage, config }: AppDependencies): express.Express {
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
  app.use(createAuthContext(db));

  app.get("/api/health", async (_request, response, next) => {
    try {
      await db.query("SELECT 1 AS ok");
      response.json({ ok: true, database: "up" });
    } catch (error) {
      next(error);
    }
  });

  app.use(
    "/api/auth",
    createAuthRouter({
      db,
      config,
    }),
  );
  app.use("/api/scrapbooks", createScrapbookRouter({ db }));
  app.use("/api/albums", createAlbumRouter({ db }));
  app.use(
    "/api/media",
    createMediaRouter({
      db,
      storage,
      config: { maxMediaBytes: config.maxMediaBytes },
    }),
  );
  app.use(
    "/api/stickers",
    createStickerRouter({
      db,
      storage,
      config: { maxStickerBytes: config.maxStickerBytes },
    }),
  );
  app.use("/api/files", createFileRouter({ db, storage }));
  app.use("/api/public", createPublicRouter({ db }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
