import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../errors.js";
import { createStickerRouter } from "./routes.js";
import { normalizePlacement } from "./repository.js";

function makeApp(db: unknown, storage: unknown, userId = "editor-1", config?: { maxStickerBytes?: number }) {
  const app = express();
  app.use((request, _response, next) => {
    request.auth = { userId, user: { id: userId, email: `${userId}@example.com`, createdAt: new Date("2026-08-15T12:00:00.000Z") } };
    next();
  });
  app.use("/api/stickers", createStickerRouter({ db: db as never, storage: storage as never, config }));
  app.use(errorHandler);
  return app;
}

const assetRow = {
  id: "sticker-1",
  scrapbook_id: "scrapbook-1",
  storage_key: "sticker-key-1",
  original_name: "star.png",
  mime_type: "image/png",
  byte_size: 10,
  created_by: "editor-1",
  created_at: new Date("2026-08-15T12:00:00.000Z"),
};

describe("sticker placements", () => {
  it("bounds transforms so placements remain usable across viewport sizes", () => {
    expect(normalizePlacement({ x: -10, y: 140, scale: 9, rotation: -400, layer: 2.7 })).toEqual({ x: 0, y: 100, scale: 4, rotation: -180, layer: 3 });
  });

  it("rejects non-finite transforms", () => {
    expect(() => normalizePlacement({ x: Number.NaN, y: 10, scale: 1, rotation: 0, layer: 0 })).toThrowError(/must be numbers/);
  });

  it("rejects unsupported sticker uploads before storage", async () => {
    const db = { query: vi.fn().mockResolvedValueOnce({ rows: [{ role: "editor" }] }) };
    const storage = { put: vi.fn(), delete: vi.fn() };

    const response = await request(makeApp(db, storage)).post("/api/stickers/scrapbook-1").attach("file", Buffer.from("%PDF-1.7"), { filename: "notes.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(415);
    expect(response.body.error).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(storage.put).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledOnce();
  });

  it("rejects oversized sticker uploads before storage", async () => {
    const db = { query: vi.fn().mockResolvedValueOnce({ rows: [{ role: "editor" }] }) };
    const storage = { put: vi.fn(), delete: vi.fn() };

    const response = await request(makeApp(db, storage, "editor-1", { maxStickerBytes: 4 }))
      .post("/api/stickers/scrapbook-1")
      .attach("file", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]), { filename: "large.png", contentType: "image/png" });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe("UPLOAD_TOO_LARGE");
    expect(storage.put).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledOnce();
  });

  it("deletes an asset only after its stored file is removed", async () => {
    const db = { query: vi.fn().mockResolvedValueOnce({ rows: [{ role: "editor" }] }).mockResolvedValueOnce({ rows: [assetRow] }).mockResolvedValueOnce({ rows: [assetRow], rowCount: 1 }) };
    const storage = { delete: vi.fn().mockResolvedValue(undefined) };

    const response = await request(makeApp(db, storage)).delete("/api/stickers/scrapbook-1/sticker-1");

    expect(response.status).toBe(204);
    expect(storage.delete).toHaveBeenCalledWith("sticker-key-1");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM sticker_assets"), ["scrapbook-1", "sticker-1"]);
  });

  it("keeps an asset when storage cleanup fails", async () => {
    const db = { query: vi.fn().mockResolvedValueOnce({ rows: [{ role: "editor" }] }).mockResolvedValueOnce({ rows: [assetRow] }) };
    const storage = { delete: vi.fn().mockRejectedValue(new Error("disk unavailable")) };

    const response = await request(makeApp(db, storage)).delete("/api/stickers/scrapbook-1/sticker-1");

    expect(response.status).toBe(503);
    expect(response.body.error).toBe("STORAGE_CLEANUP_FAILED");
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
