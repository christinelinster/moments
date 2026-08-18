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
        .mockResolvedValueOnce({ rows: [{ id: "album-1" }] })
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

  it("persists failed-upload cleanup and returns a retryable error", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
      .mockRejectedValueOnce(new Error("media insert failed"))
      .mockResolvedValue({ rows: [] });
    const db = { query };
    const storage = {
      put: vi.fn().mockResolvedValue({ key: "media-orphan.jpg", byteSize: 6 }),
      get: vi.fn(),
      delete: vi.fn().mockRejectedValue(new Error("storage unavailable")),
    };

    const response = await request(makeApp(db, storage, "editor-1"))
      .post("/api/media/scrapbook-1")
      .attach(
        "file",
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        { filename: "memory.jpg", contentType: "image/jpeg" },
      );

    expect(response.status).toBe(503);
    expect(response.body.error).toBe("UPLOAD_CLEANUP_FAILED");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO media_upload_cleanup_jobs"),
      ["scrapbook-1", "media-orphan.jpg"],
    );
    expect(storage.delete).toHaveBeenCalledWith("media-orphan.jpg");
  });

  it("notifies the client when the same media content already exists", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rows: [] });
    const db = { query };
    const storage = {
      put: vi.fn().mockResolvedValue({ key: "media-duplicate.jpg", byteSize: 6 }),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const response = await request(makeApp(db, storage, "editor-1"))
      .post("/api/media/scrapbook-1")
      .attach(
        "file",
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        { filename: "memory.jpg", contentType: "image/jpeg" },
      );

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: "DUPLICATE_MEDIA",
      message: expect.stringContaining("already exists"),
    });
    expect(storage.delete).toHaveBeenCalledWith("media-duplicate.jpg");
  });

  it("rejects an album that is not in the target scrapbook before storage", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ role: "editor" }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const storage = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const response = await request(makeApp(db, storage, "editor-1"))
      .post("/api/media/scrapbook-1")
      .field("albumId", "album-from-another-scrapbook")
      .attach(
        "file",
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        { filename: "memory.jpg", contentType: "image/jpeg" },
      );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("ALBUM_NOT_FOUND");
    expect(storage.put).not.toHaveBeenCalled();
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
    expect(transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("pg_advisory_xact_lock"),
      ["scrapbook-1"],
    );
  });

  it("bulk-deletes media only after storage cleanup succeeds", async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ role: "owner" }] });
    const claimQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM media_items") && sql.includes("FOR UPDATE")) {
        return {
          rows: [
            { id: "media-1", storageKey: "media-key-1" },
            { id: "media-2", storageKey: "media-key-2" },
          ],
        };
      }
      if (sql.includes("FROM media_deletion_jobs")) {
        return { rows: [] };
      }
      if (sql.includes("DELETE FROM media_items")) {
        return {
          rowCount: 2,
          rows: [{ id: "media-1" }, { id: "media-2" }],
        };
      }
      return { rows: [] };
    });
    const finalizeQuery = vi.fn().mockResolvedValue({ rowCount: 2, rows: [] });
    const storage = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const db = {
      query,
      connect: vi
        .fn()
        .mockResolvedValueOnce({ query: claimQuery, release: vi.fn() })
        .mockResolvedValueOnce({ query: finalizeQuery, release: vi.fn() }),
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
      query: vi.fn().mockResolvedValue({ rows: [{ role: "owner" }] }),
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("FROM media_items") && sql.includes("FOR UPDATE")) {
            return { rows: [{ id: "media-1", storageKey: "media-key-1" }] };
          }
          if (sql.includes("FROM media_deletion_jobs")) {
            return { rows: [] };
          }
          if (sql.includes("DELETE FROM media_items")) {
            return { rowCount: 1, rows: [{ id: "media-1" }] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      }),
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
    expect(db.connect).toHaveBeenCalledOnce();
  });

  it("keeps deletion recoverable when finalizing storage cleanup fails", async () => {
    const events: string[] = [];
    const target = { id: "media-1", storageKey: "media-key-1" };
    const firstClaimQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM media_deletion_jobs")) {
        return { rows: [] };
      }
      if (sql.includes("FROM media_items") && sql.includes("FOR UPDATE")) {
        return { rows: [target] };
      }
      if (sql.includes("INSERT INTO media_deletion_jobs")) {
        return { rows: [] };
      }
      if (sql.includes("DELETE FROM media_items")) {
        events.push("delete-media-row");
        return { rowCount: 1, rows: [{ id: target.id }] };
      }
      return { rows: [] };
    });
    const firstFinalizeQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("DELETE FROM media_deletion_jobs")) {
        throw new Error("database unavailable");
      }
      return { rows: [] };
    });
    const retryClaimQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM media_items") && sql.includes("FOR UPDATE")) {
        return { rows: [] };
      }
      if (sql.includes("FROM media_deletion_jobs")) {
        return { rows: [target] };
      }
      return { rows: [] };
    });
    const retryFinalizeQuery = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("DELETE FROM media_deletion_jobs")) {
        events.push("delete-pending-job");
        return { rowCount: 1, rows: [] };
      }
      return { rows: [] };
    });
    const makeClient = (query: ReturnType<typeof vi.fn>) => ({
      query,
      release: vi.fn(),
    });
    const db = {
      query: vi.fn().mockResolvedValue({ rows: [{ role: "owner" }] }),
      connect: vi
        .fn()
        .mockResolvedValueOnce(makeClient(firstClaimQuery))
        .mockResolvedValueOnce(makeClient(firstFinalizeQuery))
        .mockResolvedValueOnce(makeClient(retryClaimQuery))
        .mockResolvedValueOnce(makeClient(retryFinalizeQuery)),
    };
    let storageDeleteCount = 0;
    const storage = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn().mockImplementation(async () => {
        storageDeleteCount += 1;
        events.push(`delete-storage-${storageDeleteCount}`);
      }),
    };

    const app = makeApp(db, storage, "owner-1");
    const firstResponse = await request(app)
      .delete("/api/media/scrapbook-1/media-1");
    const retryResponse = await request(app)
      .delete("/api/media/scrapbook-1/media-1");

    expect(firstResponse.status).toBe(503);
    expect(firstResponse.body.error).toBe("STORAGE_CLEANUP_FAILED");
    expect(retryResponse.status).toBe(204);
    expect(events.indexOf("delete-media-row")).toBeLessThan(
      events.indexOf("delete-storage-1"),
    );
    expect(events).toContain("delete-pending-job");
    expect(storageDeleteCount).toBe(2);
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
