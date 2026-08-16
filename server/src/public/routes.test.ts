import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../errors.js";
import { createPublicRouter } from "./routes.js";

function publicApp(db: unknown) {
  const app = express();
  app.use("/api/public", createPublicRouter({ db: db as never }));
  app.use(errorHandler);
  return app;
}

describe("public scrapbook routes", () => {
  it("returns a read-only snapshot without private account or share data", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: "scrapbook-1",
              title: "Summer memories",
              theme_key: "field-journal",
              created_at: new Date("2026-08-15T12:00:00.000Z"),
              updated_at: new Date("2026-08-15T12:00:00.000Z"),
              owner_id: "owner-1",
              public_share_token: "active-token",
              share_enabled: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: "album-1", name: "Summer", position: 0 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "media-1",
              album_id: "album-1",
              original_name: "beach.jpg",
              media_type: "photo",
              mime_type: "image/jpeg",
              byte_size: 100,
              caption: "The beach",
              location: "Toronto",
              position: 0,
              created_at: new Date("2026-08-15T12:00:00.000Z"),
              storage_key: "private/storage-key",
              created_by: "owner-1",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "sticker-1",
              original_name: "star.png",
              mime_type: "image/png",
              byte_size: 50,
              storage_key: "private/sticker-key",
              created_by: "owner-1",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "placement-1",
              album_id: "album-1",
              sticker_asset_id: "sticker-1",
              x: "0.5",
              y: "0.5",
              scale: "1",
              rotation: "0",
              layer: 1,
            },
          ],
        }),
    };

    const response = await request(publicApp(db)).get("/api/public/active-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      scrapbook: {
        id: "scrapbook-1",
        title: "Summer memories",
        themeKey: "field-journal",
        createdAt: "2026-08-15T12:00:00.000Z",
        updatedAt: "2026-08-15T12:00:00.000Z",
      },
      albums: [{ id: "album-1", name: "Summer", position: 0 }],
      media: [
        {
          id: "media-1",
          albumId: "album-1",
          originalName: "beach.jpg",
          mediaType: "photo",
          mimeType: "image/jpeg",
          byteSize: 100,
          caption: "The beach",
          location: "Toronto",
          position: 0,
          createdAt: "2026-08-15T12:00:00.000Z",
        },
      ],
      stickerAssets: [
        {
          id: "sticker-1",
          originalName: "star.png",
          mimeType: "image/png",
          byteSize: 50,
        },
      ],
      stickerPlacements: [
        {
          id: "placement-1",
          albumId: "album-1",
          stickerAssetId: "sticker-1",
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          layer: 1,
        },
      ],
    });
    expect(response.body).not.toHaveProperty("scrapbook.ownerId");
    expect(response.body).not.toHaveProperty("scrapbook.publicShareToken");
    expect(response.body).not.toHaveProperty("editors");
    expect(JSON.stringify(response.body)).not.toContain("password");
    expect(JSON.stringify(response.body)).not.toContain("storage-key");
  });

  it.each(["invalid-token", "disabled-token", "superseded-token"])(
    "does not return scrapbook data for %s",
    async (shareToken) => {
      const db = { query: vi.fn().mockResolvedValue({ rows: [] }) };

      const response = await request(publicApp(db)).get(`/api/public/${shareToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("PUBLIC_SCRAPBOOK_NOT_FOUND");
      expect(response.body).not.toHaveProperty("scrapbook");
    },
  );
});
