import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createAuthContext } from "../auth/middleware.js";
import { errorHandler } from "../errors.js";
import { getScrapbookRole, requireScrapbookRole } from "./permissions.js";

function authenticatedApp(
  middleware: express.RequestHandler,
  userId = "user-1",
) {
  const app = express();
  app.use((request, _response, next) => {
    request.auth = {
      userId,
      user: {
        id: userId,
        email: `${userId}@example.com`,
        createdAt: new Date("2026-08-15T12:00:00.000Z"),
      },
    };
    next();
  });
  app.get("/scrapbooks/:scrapbookId", middleware, (request, response) => {
    response.json({ role: request.scrapbookRole });
  });
  app.use(errorHandler);
  return app;
}

describe("scrapbook roles", () => {
  it.each([
    ["owner", "owner"],
    ["editor", "editor"],
  ] as const)("returns the %s role for an authorized user", async (role, expected) => {
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ role }] }),
    };

    await expect(
      getScrapbookRole(db as never, "user-1", "scrapbook-1"),
    ).resolves.toBe(expected);
  });

  it("returns null when a user has no scrapbook membership", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };

    await expect(
      getScrapbookRole(db as never, "user-2", "scrapbook-1"),
    ).resolves.toBeNull();
  });

  it("allows an owner mutation and attaches the resolved role", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ role: "owner" }] }),
    };
    const app = authenticatedApp(
      requireScrapbookRole(db as never, ["owner", "editor"]),
    );

    await request(app)
      .get("/scrapbooks/scrapbook-1")
      .expect(200, { role: "owner" });
  });

  it("rejects an editor from an owner-only mutation", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ role: "editor" }] }),
    };
    const app = authenticatedApp(requireScrapbookRole(db as never, ["owner"]));

    const response = await request(app).get("/scrapbooks/scrapbook-1");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
  });

  it("rejects a user with no scrapbook role", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const app = authenticatedApp(
      requireScrapbookRole(db as never, ["owner", "editor"]),
      "user-2",
    );

    const response = await request(app).get("/scrapbooks/scrapbook-1");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
  });

  it("rejects public requests before querying scrapbook membership", async () => {
    const db = { query: vi.fn() };
    const app = express();
    app.use(createAuthContext(db as never));
    app.get(
      "/scrapbooks/:scrapbookId",
      requireScrapbookRole(db as never, ["owner", "editor"]),
      (_request, response) => response.sendStatus(204),
    );
    app.use(errorHandler);

    await request(app).get("/scrapbooks/scrapbook-1").expect(401);
    expect(db.query).not.toHaveBeenCalled();
  });
});
