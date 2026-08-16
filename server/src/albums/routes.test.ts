import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../errors.js";
import { createAlbumRouter } from "./routes.js";

function makeApp(db: unknown, userId?: string) {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    if (userId) {
      request.auth = {
        userId,
        user: {
          id: userId,
          email: `${userId}@example.com`,
          createdAt: new Date("2026-08-15T12:00:00.000Z"),
        },
      };
    }
    next();
  });
  app.use("/api/albums", createAlbumRouter({ db: db as never }));
  app.use(errorHandler);
  return app;
}

const albumRow = {
  id: "album-1",
  scrapbook_id: "scrapbook-1",
  name: "Summer",
  position: 0,
  created_at: new Date("2026-08-15T12:00:00.000Z"),
  updated_at: new Date("2026-08-15T12:00:00.000Z"),
};

describe("album routes", () => {
  it("creates, lists, and renames albums for an editor", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({ rows: [albumRow] })
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({ rows: [albumRow] })
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({ rows: [{ ...albumRow, name: "Vacation" }] }),
      connect: vi.fn(),
    };
    const app = makeApp(db, "editor-1");

    const createResponse = await request(app)
      .post("/api/albums/scrapbook-1")
      .send({ name: "Summer" });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.album).toMatchObject({
      id: "album-1",
      scrapbookId: "scrapbook-1",
      name: "Summer",
      position: 0,
    });

    const listResponse = await request(app).get("/api/albums/scrapbook-1");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.albums[0]).toMatchObject({
      id: "album-1",
      name: "Summer",
    });

    const renameResponse = await request(app)
      .patch("/api/albums/scrapbook-1/album-1")
      .send({ name: "Vacation" });
    expect(renameResponse.status).toBe(200);
    expect(renameResponse.body.album.name).toBe("Vacation");
  });

  it("reorders albums transactionally", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ role: "owner" }] });
    const transactionQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "album-2" }, { id: "album-1" }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    const db = {
      query,
      connect: vi.fn().mockResolvedValue({
        query: transactionQuery,
        release: vi.fn(),
      }),
    };

    const response = await request(makeApp(db, "owner-1"))
      .post("/api/albums/scrapbook-1/reorder")
      .send({ orderedIds: ["album-2", "album-1"] });

    expect(response.status).toBe(204);
    expect(transactionQuery).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(transactionQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE albums"),
      ["scrapbook-1", "album-2", 0],
    );
    expect(transactionQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("UPDATE albums"),
      ["scrapbook-1", "album-1", 1],
    );
  });

  it("deletes an album while leaving its media unassigned", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ role: "owner" }] });
    const transactionQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const db = {
      query,
      connect: vi.fn().mockResolvedValue({
        query: transactionQuery,
        release: vi.fn(),
      }),
    };

    const response = await request(makeApp(db, "owner-1")).delete(
      "/api/albums/scrapbook-1/album-1",
    );

    expect(response.status).toBe(204);
    expect(transactionQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE media_items"),
      ["scrapbook-1", "album-1"],
    );
    expect(transactionQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("DELETE FROM albums"),
      ["scrapbook-1", "album-1"],
    );
  });

  it("rejects public and unauthenticated album access", async () => {
    const db = { query: vi.fn() };

    const response = await request(makeApp(db)).get("/api/albums/scrapbook-1");

    expect(response.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });
});
