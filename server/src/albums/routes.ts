import { Router, type Request } from "express";

import { requireSession } from "../auth/middleware.js";
import type { TransactionalDatabase } from "../auth/sessions.js";
import { AppError } from "../errors.js";
import { requireScrapbookRole } from "../scrapbooks/permissions.js";
import {
  createAlbum,
  deleteAlbum,
  listAlbums,
  reorderAlbums,
  updateAlbum,
} from "./repository.js";

function bodyRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "Request body must be an object", "INVALID_INPUT");
  }
  return body as Record<string, unknown>;
}

function routeParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || !value) {
    throw new AppError(400, `${name} is required`, "INVALID_INPUT");
  }
  return value;
}

function albumName(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(400, "Album name is required", "INVALID_ALBUM_NAME");
  }
  const name = value.trim();
  if (!name || name.length > 120) {
    throw new AppError(
      400,
      "Album name must be between 1 and 120 characters",
      "INVALID_ALBUM_NAME",
    );
  }
  return name;
}

function orderedIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new AppError(400, "orderedIds must contain unique album IDs", "INVALID_ORDER");
  }
  const ids = value.map((id) => (typeof id === "string" ? id.trim() : ""));
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new AppError(400, "orderedIds must contain unique album IDs", "INVALID_ORDER");
  }
  return ids;
}

function notFound(resource: string): AppError {
  return new AppError(404, `${resource} was not found`, "NOT_FOUND");
}

export function createAlbumRouter({ db }: { db: TransactionalDatabase }): Router {
  const router = Router();
  router.use(requireSession(db));

  router.get(
    "/:scrapbookId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        response.json({ albums: await listAlbums(db, routeParam(request, "scrapbookId")) });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        const album = await createAlbum(
          db,
          routeParam(request, "scrapbookId"),
          albumName(input.name),
        );
        response.status(201).json({ album });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId/reorder",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        await reorderAlbums(
          db,
          routeParam(request, "scrapbookId"),
          orderedIds(input.orderedIds),
        );
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:scrapbookId/:albumId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        const album = await updateAlbum(
          db,
          routeParam(request, "scrapbookId"),
          routeParam(request, "albumId"),
          albumName(input.name),
        );
        if (!album) {
          next(notFound("Album"));
          return;
        }
        response.json({ album });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:scrapbookId/:albumId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const deleted = await deleteAlbum(
          db,
          routeParam(request, "scrapbookId"),
          routeParam(request, "albumId"),
        );
        if (!deleted) {
          next(notFound("Album"));
          return;
        }
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
