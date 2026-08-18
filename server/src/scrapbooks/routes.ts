import { Router, type Request } from "express";

import { normalizeAndValidateEmail } from "../auth/email.js";
import { requireSession } from "../auth/middleware.js";
import type { TransactionalDatabase } from "../auth/sessions.js";
import { AppError } from "../errors.js";
import {
  createScrapbook,
  getScrapbook,
  getPreviewSnapshot,
  listScrapbooks,
  getShareLink,
  rotateShareToken,
  setShareEnabled,
  THEME_KEYS,
  updateScrapbook,
} from "./repository.js";
import {
  addEditor,
  listEditors,
  removeEditor,
} from "./membership-repository.js";
import { requireScrapbookRole } from "./permissions.js";

function bodyRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "Request body must be an object", "INVALID_INPUT");
  }
  return body as Record<string, unknown>;
}

function titleValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(400, "Title is required", "INVALID_TITLE");
  }
  const title = value.trim();
  if (!title || title.length > 200) {
    throw new AppError(400, "Title must be between 1 and 200 characters", "INVALID_TITLE");
  }
  return title;
}

function themeValue(value: unknown): string {
  if (
    typeof value !== "string" ||
    !(THEME_KEYS as readonly string[]).includes(value)
  ) {
    throw new AppError(400, "Theme is invalid", "INVALID_THEME");
  }
  return value;
}

function notFound(resource: string): AppError {
  return new AppError(404, `${resource} was not found`, "NOT_FOUND");
}

function routeParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || !value) {
    throw new AppError(400, `${name} is required`, "INVALID_INPUT");
  }
  return value;
}

export function createScrapbookRouter({ db }: { db: TransactionalDatabase }): Router {
  const router = Router();
  router.use(requireSession(db));

  router.post("/", async (request, response, next) => {
    try {
      const input = bodyRecord(request.body);
      const scrapbook = await createScrapbook(
        db,
        request.auth!.userId,
        titleValue(input.title),
      );
      response.status(201).json({ scrapbook });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (request, response, next) => {
    try {
      response.json({ scrapbooks: await listScrapbooks(db, request.auth!.userId) });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/:scrapbookId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const scrapbook = await getScrapbook(db, routeParam(request, "scrapbookId"));
        if (!scrapbook) {
          next(notFound("Scrapbook"));
          return;
        }
        const editors = await listEditors(db, scrapbook.id);
        response.json({ scrapbook, editors, role: request.scrapbookRole ?? null });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:scrapbookId/preview",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const snapshot = await getPreviewSnapshot(db, routeParam(request, "scrapbookId"));
        if (!snapshot) {
          next(notFound("Scrapbook"));
          return;
        }
        response.json(snapshot);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:scrapbookId/theme",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        const scrapbook = await updateScrapbook(
          db,
          routeParam(request, "scrapbookId"),
          { themeKey: themeValue(input.themeKey) },
        );
        if (!scrapbook) {
          next(notFound("Scrapbook"));
          return;
        }
        response.json({ scrapbook });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:scrapbookId",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        const updates: { title?: string; themeKey?: string } = {};
        if (input.title !== undefined) {
          updates.title = titleValue(input.title);
        }
        if (input.themeKey !== undefined) {
          updates.themeKey = themeValue(input.themeKey);
        }
        if (!updates.title && !updates.themeKey) {
          throw new AppError(400, "No scrapbook changes were provided", "INVALID_INPUT");
        }

        const scrapbook = await updateScrapbook(
          db,
          routeParam(request, "scrapbookId"),
          updates,
        );
        if (!scrapbook) {
          next(notFound("Scrapbook"));
          return;
        }
        response.json({ scrapbook });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:scrapbookId/share-link",
    requireScrapbookRole(db, ["owner"]),
    async (request, response, next) => {
      try {
        const link = await getShareLink(db, routeParam(request, "scrapbookId"));
        if (!link) {
          next(notFound("Scrapbook"));
          return;
        }
        response.json(link);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId/share-link/rotate",
    requireScrapbookRole(db, ["owner"]),
    async (request, response, next) => {
      try {
        const link = await rotateShareToken(db, routeParam(request, "scrapbookId"));
        if (!link) {
          next(notFound("Scrapbook"));
          return;
        }
        response.json(link);
      } catch (error) {
        next(error);
      }
    },
  );

  for (const [action, enabled] of [
    ["enable", true],
    ["disable", false],
  ] as const) {
    router.post(
      `/:scrapbookId/share-link/${action}`,
      requireScrapbookRole(db, ["owner"]),
      async (request, response, next) => {
        try {
          const link = await setShareEnabled(
            db,
            routeParam(request, "scrapbookId"),
            enabled,
          );
          if (!link) {
            next(notFound("Scrapbook"));
            return;
          }
          response.json(link);
        } catch (error) {
          next(error);
        }
      },
    );
  }

  router.get(
    "/:scrapbookId/editors",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        response.json({
          editors: await listEditors(db, routeParam(request, "scrapbookId")),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:scrapbookId/editors",
    requireScrapbookRole(db, ["owner", "editor"]),
    async (request, response, next) => {
      try {
        const input = bodyRecord(request.body);
        const email = normalizeAndValidateEmail(input.email);
        const editor = await addEditor(db, routeParam(request, "scrapbookId"), email);
        response.status(201).json({ editor });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:scrapbookId/editors/:membershipId",
    requireScrapbookRole(db, ["owner"]),
    async (request, response, next) => {
      try {
        const removed = await removeEditor(
          db,
          routeParam(request, "scrapbookId"),
          routeParam(request, "membershipId"),
        );
        if (!removed) {
          next(notFound("Editor membership"));
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
