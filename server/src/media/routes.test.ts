import { Readable } from "node:stream";

import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../errors.js";
import { createFileRouter, createMediaRouter } from "./routes.js";

function makeApp(
  db: unknown,
  storage: unknown,
  userId?: string,
) {
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
  app.use(
    "/api/media",
    createMediaRouter({
      db: db as never,
      storage: storage as never,
      config: { maxMediaBytes: 250 },
    }),
  );
  app.use(
    "/api/files",
    createFileRouter({ db: db as never, storage: storage as never }),
  );
  app.use(errorHandler);
  return app;
}

const mediaRow = {
  id: "media-1",
  scrapbook_id: "scrapbook-1",
  album_id: "album-1",
  storage_key: "media-key-1",
  original_name: "memory.jpg",
  media_type: "photo",
  mime_type: "image/jpeg",
  byte_size: 6,
  caption: "Beach day",
  location: "Toronto",
  position: 0,
  created_by: "editor-1",
  created_at: new Date("2026-08-15T12:00:00.000Z"),
  updated_at: new Date("2026-08-15T12:00:00.000Z"),
};

describe("media routes", () => {
  it("uploads a supported photo and persists its metadata", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({ rows: [mediaRow] }),
    };
    const storage = {
      put: vi.fn().mockResolvedValue({ key: mediaRow.storage_key, byteSize: 6 }),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const response = await request(makeApp(db, storage, "editor-1"))
      .post("/api/media/scrapbook-1")
      .field("albumId", "album-1")
      .field("caption", "Beach day")
      .field("location", "Toronto")
      .attach(
        "file",
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        { filename: "memory.jpg", contentType: "image/jpeg" },
      );

    expect(response.status).toBe(201);
    expect(response.body.media).toMatchObject({
      id: "media-1",
      scrapbookId: "scrapbook-1",
      albumId: "album-1",
      caption: "Beach day",
      location: "Toronto",
      mediaType: "photo",
    });
    expect(storage.put).toHaveBeenCalledOnce();
  });

  it("rejects unsupported uploads before storage or media persistence", async () => {
    const db = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ role: "editor" }] }),
    };
    const storage = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const response = await request(makeApp(db, storage, "editor-1"))
      .post("/api/media/scrapbook-1")
      .attach("file", Buffer.from("%PDF-1.7"), {
        filename: "notes.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(415);
    expect(response.body.error).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(storage.put).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledOnce();
  });

  it("lists media for the scrapbook or a selected album", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({ rows: [mediaRow] }),
    };

    const response = await request(makeApp(db, {}, "editor-1"))
      .get("/api/media/scrapbook-1")
      .query({ albumId: "album-1" });

    expect(response.status).toBe(200);
    expect(response.body.media[0]).toMatchObject({
      id: "media-1",
      albumId: "album-1",
    });
  });

  it("updates captions and locations for an authorized editor", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({
          rows: [{ ...mediaRow, caption: "Updated note", location: "Ottawa" }],
        }),
    };

    const response = await request(makeApp(db, {}, "editor-1"))
      .patch("/api/media/scrapbook-1/media-1")
      .send({ caption: "Updated note", location: "Ottawa" });

    expect(response.status).toBe(200);
    expect(response.body.media).toMatchObject({
      caption: "Updated note",
      location: "Ottawa",
    });
  });

  it("reorders and bulk-moves media transactionally", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
      .mockResolvedValueOnce({ rows: [{ role: "owner" }] });
    const transactionQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT id FROM albums")) {
        return { rowCount: 1, rows: [{ id: "album-2" }] };
      }
      if (sql.includes("SELECT id, album_id")) {
        return {
          rows: [
            { id: "media-1", album_id: "album-1" },
            { id: "media-2", album_id: "album-1" },
          ],
        };
      }
      if (sql.includes("SELECT id") && sql.includes("ORDER BY position")) {
        return { rows: [{ id: "media-1" }, { id: "media-2" }] };
      }
      if (sql.includes("UPDATE media_items")) {
        return { rowCount: 1, rows: [] };
      }
      return { rows: [] };
    });
    const db = {
      query,
      connect: vi.fn().mockResolvedValue({
        query: transactionQuery,
        release: vi.fn(),
      }),
    };

    const app = makeApp(db, {}, "owner-1");
    const reorderResponse = await request(app)
      .post("/api/media/scrapbook-1/reorder")
      .send({ albumId: "album-1", orderedIds: ["media-2", "media-1"] });
    const moveResponse = await request(app)
      .post("/api/media/scrapbook-1/bulk-move")
      .send({ mediaIds: ["media-1", "media-2"], albumId: "album-2" });

    expect(reorderResponse.status).toBe(204);
    expect(moveResponse.status).toBe(204);
    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE media_items"),
      expect.any(Array),
    );
  });

  it("bulk-deletes media only after storage cleanup succeeds", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "media-1",
            storageKey: "media-key-1",
          },
          {
            id: "media-2",
            storageKey: "media-key-2",
          },
        ],
      });
    const transactionQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const storage = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const db = {
      query,
      connect: vi.fn().mockResolvedValue({
        query: transactionQuery,
        release: vi.fn(),
      }),
    };

    const response = await request(makeApp(db, storage, "owner-1"))
      .post("/api/media/scrapbook-1/bulk-delete")
      .send({ mediaIds: ["media-1", "media-2"] });

    expect(response.status).toBe(204);
    expect(storage.delete).toHaveBeenCalledWith("media-key-1");
    expect(storage.delete).toHaveBeenCalledWith("media-key-2");
  });

  it("returns a retryable error when stored media cleanup fails", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({ rows: [{ id: "media-1", storageKey: "media-key-1" }] }),
      connect: vi.fn(),
    };
    const storage = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn().mockRejectedValue(new Error("storage unavailable")),
    };

    const response = await request(makeApp(db, storage, "owner-1"))
      .delete("/api/media/scrapbook-1/media-1");

    expect(response.status).toBe(503);
    expect(response.body.error).toBe("STORAGE_CLEANUP_FAILED");
    expect(db.connect).not.toHaveBeenCalled();
  });

  it("serves a file only when an active share token owns its storage key", async () => {
    const db = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [
          {
            storage_key: "media-key-1",
            original_name: "memory.jpg",
            mime_type: "image/jpeg",
            byte_size: 9,
            scrapbook_id: "scrapbook-1",
          },
        ],
      }),
    };
    const storage = {
      put: vi.fn(),
      get: vi.fn().mockResolvedValue(Readable.from(["file-data"])),
      delete: vi.fn(),
    };

    const response = await request(makeApp(db, storage))
      .get("/api/files/media-key-1")
      .query({ shareToken: "active-token" });

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("file-data");
    expect(response.headers["content-type"]).toContain("image/jpeg");
    expect(storage.get).toHaveBeenCalledWith("media-key-1");
  });

  it("serves a public file by media ID without exposing its storage key", async () => {
    const db = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [
          {
            storage_key: "private/storage-key",
            original_name: "memory.jpg",
            mime_type: "image/jpeg",
            byte_size: 9,
            scrapbook_id: "scrapbook-1",
          },
        ],
      }),
    };
    const storage = {
      put: vi.fn(),
      get: vi.fn().mockResolvedValue(Readable.from(["file-data"])),
      delete: vi.fn(),
    };

    const response = await request(makeApp(db, storage))
      .get("/api/files/by-media/media-1")
      .query({ shareToken: "active-token" });

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("file-data");
    expect(storage.get).toHaveBeenCalledWith("private/storage-key");
  });

  it("rejects unauthenticated media mutations", async () => {
    const db = { query: vi.fn() };
    const response = await request(makeApp(db, {}))
      .post("/api/media/scrapbook-1/bulk-delete")
      .send({ mediaIds: ["media-1"] });

    expect(response.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });
});
