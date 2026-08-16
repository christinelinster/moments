import type { RequestHandler } from "express";

import { sendUnauthenticated } from "../auth/middleware.js";
import type { SessionDatabase } from "../auth/sessions.js";
import { AppError } from "../errors.js";

export type ScrapbookRole = "owner" | "editor";

declare global {
  namespace Express {
    interface Request {
      scrapbookRole?: ScrapbookRole;
    }
  }
}

export async function getScrapbookRole(
  db: SessionDatabase,
  userId: string,
  scrapbookId: string,
): Promise<ScrapbookRole | null> {
  const result = await db.query<{ role: ScrapbookRole }>(
    `
      SELECT CASE
        WHEN s.owner_id = $1 THEN 'owner'::text
        ELSE 'editor'::text
      END AS role
      FROM scrapbooks AS s
      LEFT JOIN scrapbook_editors AS e
        ON e.scrapbook_id = s.id AND e.user_id = $1
      WHERE s.id = $2 AND (s.owner_id = $1 OR e.user_id IS NOT NULL)
      LIMIT 1
    `,
    [userId, scrapbookId],
  );

  const role = result.rows[0]?.role;
  return role === "owner" || role === "editor" ? role : null;
}

export function requireScrapbookRole(
  db: SessionDatabase,
  allowed: readonly ScrapbookRole[],
): RequestHandler {
  return async (request, response, next) => {
    if (!request.auth) {
      sendUnauthenticated(response);
      return;
    }

    const scrapbookId = request.params.scrapbookId;
    if (typeof scrapbookId !== "string" || !scrapbookId) {
      next(new AppError(400, "Scrapbook ID is required", "INVALID_INPUT"));
      return;
    }

    try {
      const role = await getScrapbookRole(db, request.auth.userId, scrapbookId);
      if (!role || !allowed.includes(role)) {
        next(
          new AppError(
            403,
            "You do not have permission to access this scrapbook",
            "FORBIDDEN",
          ),
        );
        return;
      }

      request.scrapbookRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}
