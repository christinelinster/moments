import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../errors.js";
import { createScrapbookRouter } from "./routes.js";
import { linkPendingMemberships } from "./membership-repository.js";

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
  app.use("/api/scrapbooks", createScrapbookRouter({ db: db as never }));
  app.use(errorHandler);
  return app;
}

const scrapbookRow = {
  id: "scrapbook-1",
  owner_id: "owner-1",
  title: "Summer memories",
  theme_key: "field-journal",
  share_enabled: true,
  created_at: new Date("2026-08-15T12:00:00.000Z"),
  updated_at: new Date("2026-08-15T12:00:00.000Z"),
  public_share_token: "raw-owner-token",
};

describe("scrapbook routes", () => {
  it("lists the signed-in user's scrapbooks for workspace entry", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: "scrapbook-1", owner_id: "owner-1", title: "Summer memories", theme_key: "field-journal", share_enabled: true, created_at: scrapbookRow.created_at, updated_at: scrapbookRow.updated_at }] }),
    };

    const response = await request(makeApp(db, "owner-1")).get("/api/scrapbooks");

    expect(response.status).toBe(200);
    expect(response.body.scrapbooks).toEqual([
      expect.objectContaining({ id: "scrapbook-1", title: "Summer memories", ownerId: "owner-1" }),
    ]);
  });

  it("creates a scrapbook with the default theme without exposing its raw share token", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [scrapbookRow] }),
    };

    const response = await request(makeApp(db, "owner-1"))
      .post("/api/scrapbooks")
      .send({ title: "Summer memories" });

    expect(response.status).toBe(201);
    expect(response.body.scrapbook).toMatchObject({
      id: "scrapbook-1",
      ownerId: "owner-1",
      title: "Summer memories",
      themeKey: "field-journal",
      shareEnabled: true,
    });
    expect(response.body.scrapbook).not.toHaveProperty("publicShareToken");
    expect(response.body.scrapbook).not.toHaveProperty("shareToken");
  });

  it("loads scrapbook state and private editor memberships for an authorized owner", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({ rows: [scrapbookRow] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "editor-1",
              scrapbook_id: "scrapbook-1",
              email: "editor@example.com",
              user_id: "editor-user-1",
              linked_at: new Date("2026-08-15T12:00:00.000Z"),
              created_at: new Date("2026-08-15T12:00:00.000Z"),
            },
          ],
        }),
    };

    const response = await request(makeApp(db, "owner-1")).get(
      "/api/scrapbooks/scrapbook-1",
    );

    expect(response.status).toBe(200);
    expect(response.body.scrapbook.title).toBe("Summer memories");
    expect(response.body.editors).toEqual([
      expect.objectContaining({
        id: "editor-1",
        email: "editor@example.com",
        userId: "editor-user-1",
      }),
    ]);
  });

  it("serves a public-shaped preview to an authorized editor without a share token", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({ rows: [scrapbookRow] })
        .mockResolvedValue({ rows: [] }),
    };

    const response = await request(makeApp(db, "editor-1"))
      .get("/api/scrapbooks/scrapbook-1/preview");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      scrapbook: { id: "scrapbook-1", title: "Summer memories" },
      albums: [],
      media: [],
      stickerAssets: [],
      stickerPlacements: [],
    });
    expect(JSON.stringify(response.body)).not.toContain("raw-owner-token");
  });

  it("allows an editor to change scrapbook state and add another editor", async () => {
    const updatedRow = { ...scrapbookRow, theme_key: "poolside" };
    const membershipRow = {
      id: "editor-2",
      scrapbook_id: "scrapbook-1",
      email: "new-editor@example.com",
      user_id: null,
      linked_at: null,
      created_at: new Date("2026-08-15T12:00:00.000Z"),
    };
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
      .mockResolvedValueOnce({ rows: [updatedRow] })
      .mockResolvedValueOnce({ rows: [{ role: "editor" }] });
    const transactionQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [membershipRow] })
      .mockResolvedValueOnce({ rows: [] });
    const db = {
      query,
      connect: vi.fn().mockResolvedValue({
        query: transactionQuery,
        release: vi.fn(),
      }),
    };
    const app = makeApp(db, "editor-user-1");

    await request(app)
      .patch("/api/scrapbooks/scrapbook-1")
      .send({ themeKey: "poolside" })
      .expect(200);
    const addResponse = await request(app)
      .post("/api/scrapbooks/scrapbook-1/editors")
      .send({ email: " New-Editor@Example.COM " });

    expect(addResponse.status).toBe(201);
    expect(addResponse.body.editor.email).toBe("new-editor@example.com");
  });

  it("rejects an invalid collaborator email before database mutation", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [{ role: "owner" }] }) };

    const response = await request(makeApp(db, "owner-1"))
      .post("/api/scrapbooks/scrapbook-1/editors")
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("INVALID_EMAIL");
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("allows the owner to remove an editor but rejects editor removal", async () => {
    const ownerDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    await request(makeApp(ownerDb, "owner-1"))
      .delete("/api/scrapbooks/scrapbook-1/editors/editor-1")
      .expect(204);

    const editorDb = {
      query: vi.fn().mockResolvedValue({ rows: [{ role: "editor" }] }),
    };
    const editorResponse = await request(makeApp(editorDb, "editor-user-1")).delete(
      "/api/scrapbooks/scrapbook-1/editors/editor-1",
    );

    expect(editorResponse.status).toBe(403);
    expect(editorResponse.body.error).toBe("FORBIDDEN");
  });

  it("exposes share-link tokens only through owner share-link routes", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({
          rows: [{ public_share_token: "active-token", share_enabled: true }],
        })
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({
          rows: [{ public_share_token: "rotated-token", share_enabled: true }],
        })
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({
          rows: [{ public_share_token: "rotated-token", share_enabled: false }],
        })
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({
          rows: [{ public_share_token: "rotated-token", share_enabled: true }],
        }),
    };
    const app = makeApp(db, "owner-1");

    await request(app)
      .get("/api/scrapbooks/scrapbook-1/share-link")
      .expect(200, { shareToken: "active-token", enabled: true });
    await request(app)
      .post("/api/scrapbooks/scrapbook-1/share-link/rotate")
      .expect(200, { shareToken: "rotated-token", enabled: true });
    await request(app)
      .post("/api/scrapbooks/scrapbook-1/share-link/disable")
      .expect(200, { shareToken: "rotated-token", enabled: false });
    await request(app)
      .post("/api/scrapbooks/scrapbook-1/share-link/enable")
      .expect(200, { shareToken: "rotated-token", enabled: true });
  });

  it("links pending memberships to a matching normalized account", async () => {
    const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };

    await linkPendingMemberships(db as never, "user-1", "person@example.com");

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE scrapbook_editors"),
      ["user-1", "person@example.com"],
    );
  });
});
