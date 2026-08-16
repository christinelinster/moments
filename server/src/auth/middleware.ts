import type { Request, RequestHandler, Response } from "express";
import { parse, serialize } from "cookie";

import type { AppConfig } from "../config.js";
import type { SessionDatabase } from "./sessions.js";
import { findSessionUser, MAX_SESSION_TTL_SECONDS } from "./sessions.js";
import type { AuthContext } from "./types.js";

export const SESSION_COOKIE_NAME = "session";

function toAuthContext(user: NonNullable<Awaited<ReturnType<typeof findSessionUser>>>): AuthContext {
  return { userId: user.id, user };
}

export function getSessionToken(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) {
    return undefined;
  }

  const token = parse(header)[SESSION_COOKIE_NAME];
  return token || undefined;
}

export function createAuthContext(db: SessionDatabase): RequestHandler {
  return async (request, _response, next) => {
    const token = getSessionToken(request);
    if (!token) {
      next();
      return;
    }

    try {
      const user = await findSessionUser(db, token);
      if (user) {
        request.auth = toAuthContext(user);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireSession(db: SessionDatabase): RequestHandler {
  return async (request, response, next) => {
    if (request.auth) {
      next();
      return;
    }

    const token = getSessionToken(request);
    if (!token) {
      sendUnauthenticated(response);
      return;
    }

    try {
      const user = await findSessionUser(db, token);
      if (!user) {
        sendUnauthenticated(response);
        return;
      }

      request.auth = toAuthContext(user);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function sendUnauthenticated(response: Response): void {
  response
    .status(401)
    .json({ error: "UNAUTHENTICATED", message: "Authentication is required" });
}

type SessionCookieConfig = Pick<AppConfig, "nodeEnv" | "sessionTtlSeconds">;

export function setSessionCookie(
  response: Response,
  token: string,
  config: SessionCookieConfig,
): void {
  const maxAge = Math.min(
    Math.max(Math.floor(config.sessionTtlSeconds), 1),
    MAX_SESSION_TTL_SECONDS,
  );

  response.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    }),
  );
}

export function clearSessionCookie(response: Response, config: SessionCookieConfig): void {
  response.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      expires: new Date(0),
      maxAge: 0,
      path: "/",
    }),
  );
}
