import { Router } from "express";

import type { AppConfig } from "../config.js";
import { AppError } from "../errors.js";
import { linkPendingMemberships } from "../scrapbooks/membership-repository.js";
import { normalizeAndValidateEmail } from "./email.js";
import {
  assertValidPassword,
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from "./password.js";
import {
  createSession,
  revokeSession,
  type TransactionalDatabase,
} from "./sessions.js";
import {
  clearSessionCookie,
  getSessionToken,
  sendUnauthenticated,
  setSessionCookie,
} from "./middleware.js";
import type { AuthenticatedUser } from "./types.js";

type AuthRouteConfig = Pick<AppConfig, "nodeEnv" | "sessionTtlSeconds">;
type PasswordVerifier = typeof verifyPassword;

type UserRow = {
  id: string;
  email: string;
  created_at: Date | string;
};

type LoginUserRow = UserRow & { password_hash: string };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function bodyRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(400, "Request body must be an object", "INVALID_INPUT");
  }

  return body as Record<string, unknown>;
}

function credentials(body: unknown): { email: string; password: string } {
  const input = bodyRecord(body);
  const email = normalizeAndValidateEmail(input.email);
  assertValidPassword(input.password);
  return { email, password: input.password };
}

function publicUser(row: UserRow | AuthenticatedUser) {
  const createdAt = "createdAt" in row ? row.createdAt : row.created_at;

  return {
    id: row.id,
    email: row.email,
    createdAt: new Date(createdAt).toISOString(),
  };
}

function duplicateEmailError(): AppError {
  return new AppError(
    409,
    "An account with that email already exists",
    "EMAIL_IN_USE",
  );
}

export function createAuthRouter({
  db,
  config,
  passwordVerifier,
}: {
  db: TransactionalDatabase;
  config: AuthRouteConfig;
  passwordVerifier?: PasswordVerifier;
}): Router {
  const router = Router();
  const verifyLoginPassword = passwordVerifier ?? verifyPassword;

  router.post("/register", async (request, response, next) => {
    try {
      const { email, password } = credentials(request.body);
      const passwordHash = await hashPassword(password);

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        let result;

        try {
          result = await client.query<UserRow>(
            `
              INSERT INTO users (email, password_hash)
              VALUES ($1, $2)
              RETURNING id, email, created_at
            `,
            [email, passwordHash],
          );
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw duplicateEmailError();
          }
          throw error;
        }

        const row = result.rows[0];
        if (!row) {
          throw new Error("Registration did not return a user");
        }

        await linkPendingMemberships(client, row.id, email);
        const session = await createSession(
          client,
          row.id,
          config.sessionTtlSeconds,
        );
        await client.query("COMMIT");
        setSessionCookie(response, session.token, config);
        response.status(201).json({ user: publicUser(row) });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (request, response, next) => {
    try {
      const { email, password } = credentials(request.body);
      const result = await db.query<LoginUserRow>(
        `
          SELECT id, email, password_hash, created_at
          FROM users
          WHERE email = $1
        `,
        [email],
      );
      const row = result.rows[0];
      const passwordMatches = await verifyLoginPassword(
        password,
        row?.password_hash ?? DUMMY_PASSWORD_HASH,
      );

      if (!row || !passwordMatches) {
        throw new AppError(401, "Email or password is incorrect", "INVALID_CREDENTIALS");
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const session = await createSession(
          client,
          row.id,
          config.sessionTtlSeconds,
        );
        await linkPendingMemberships(client, row.id, email);
        await client.query("COMMIT");
        setSessionCookie(response, session.token, config);
        response.json({ user: publicUser(row) });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async (request, response, next) => {
    try {
      const token = getSessionToken(request);
      if (token) {
        await revokeSession(db, token);
      }
      clearSessionCookie(response, config);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", (request, response) => {
    if (!request.auth) {
      sendUnauthenticated(response);
      return;
    }

    response.json({ user: publicUser(request.auth.user) });
  });

  return router;
}
