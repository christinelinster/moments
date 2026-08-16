import { describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "./password.js";
import {
  createSession,
  findSessionUser,
  hashSessionToken,
  revokeSession,
} from "./sessions.js";

describe("password hashing", () => {
  it("stores salted scrypt hashes that verify without storing plaintext", async () => {
    const password = "correct horse battery staple";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(password);
    expect(secondHash).not.toBe(password);
    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", firstHash)).resolves.toBe(false);
  });

  it("rejects malformed password hashes safely", async () => {
    await expect(verifyPassword("password", "not-a-scrypt-hash")).resolves.toBe(false);
  });
});

describe("opaque database sessions", () => {
  it("stores only a hash of a random token and returns its expiry", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const createdAt = new Date("2026-08-15T12:00:00.000Z");

    const session = await createSession(db as never, "user-123", 3600, createdAt);

    expect(session.token).toEqual(expect.any(String));
    expect(session.token).not.toBe(hashSessionToken(session.token));
    expect(session.expiresAt.toISOString()).toBe("2026-08-15T13:00:00.000Z");

    const [query, values] = db.query.mock.calls[0] as [string, unknown[]];
    expect(query).toContain("INSERT INTO sessions");
    expect(values[0]).toBe(hashSessionToken(session.token));
    expect(values[0]).not.toBe(session.token);
    expect(values[1]).toBe("user-123");
    expect(values[2]).toEqual(session.expiresAt);
  });

  it("loads a non-revoked session by hashing the presented token", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "user-123",
            email: "person@example.com",
            created_at: new Date("2026-08-15T12:00:00.000Z"),
          },
        ],
      }),
    };

    const user = await findSessionUser(db as never, "opaque-token");

    expect(user).toEqual({
      id: "user-123",
      email: "person@example.com",
      createdAt: new Date("2026-08-15T12:00:00.000Z"),
    });
    expect(db.query.mock.calls[0]?.[1]).toEqual([hashSessionToken("opaque-token")]);
  });

  it("revokes a session by token hash without exposing the token to SQL", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };

    await revokeSession(db as never, "opaque-token");

    const [query, values] = db.query.mock.calls[0] as [string, unknown[]];
    expect(query).toContain("UPDATE sessions");
    expect(values).toEqual([hashSessionToken("opaque-token")]);
    expect(values).not.toContain("opaque-token");
  });
});
