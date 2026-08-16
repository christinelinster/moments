import { createHash, randomBytes } from "node:crypto";

import type { Pool } from "pg";

import type { AuthenticatedUser } from "./types.js";

export type SessionDatabase = Pick<Pool, "query">;
export type TransactionalDatabase = SessionDatabase & Pick<Pool, "connect">;

export const MAX_SESSION_TTL_SECONDS = 365 * 24 * 60 * 60;

export function boundSessionTtlSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.floor(value), 1), MAX_SESSION_TTL_SECONDS);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createSession(
  db: SessionDatabase,
  userId: string,
  ttlSeconds: number,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    now.getTime() + boundSessionTtlSeconds(ttlSeconds) * 1000,
  );

  await db.query(
    `
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES ($1, $2, $3)
    `,
    [hashSessionToken(token), userId, expiresAt],
  );

  return { token, expiresAt };
}

type SessionUserRow = {
  id: string;
  email: string;
  created_at: Date | string;
};

export async function findSessionUser(
  db: SessionDatabase,
  token: string,
): Promise<AuthenticatedUser | null> {
  const result = await db.query<SessionUserRow>(
    `
      SELECT u.id, u.email, u.created_at
      FROM sessions AS s
      INNER JOIN users AS u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
    `,
    [hashSessionToken(token)],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    createdAt: new Date(row.created_at),
  };
}

export async function revokeSession(db: SessionDatabase, token: string): Promise<void> {
  await db.query(
    `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL
    `,
    [hashSessionToken(token)],
  );
}
