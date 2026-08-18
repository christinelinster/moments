import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../errors.js";
import { createStickerRouter } from "./routes.js";
import { normalizePlacement } from "./repository.js";

function makeApp(db: unknown, storage: unknown, userId = "editor-1") {
  const app = express();
  app.use((request, _response, next) => {
    request.auth = { userId, user: { id: userId, email: `${userId}@example.com`, createdAt: new Date("2026-08-15T12:00:00.000Z") } };
    next();
  });
  app.use("/api/stickers", createStickerRouter({ db: db as never, storage: storage as never }));
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
