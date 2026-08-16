import { Router } from "express";

import { AppError } from "../errors.js";
import {
  getPublicSnapshot,
  type ScrapbookDatabase,
} from "../scrapbooks/repository.js";

export function createPublicRouter({ db }: { db: ScrapbookDatabase }): Router {
  const router = Router();

  router.get("/:shareToken", async (request, response, next) => {
    try {
      const snapshot = await getPublicSnapshot(db, request.params.shareToken);
      if (!snapshot) {
        next(
          new AppError(
            404,
            "Public scrapbook was not found",
            "PUBLIC_SCRAPBOOK_NOT_FOUND",
          ),
        );
        return;
      }
      response.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
