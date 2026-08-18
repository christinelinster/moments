import { describe, expect, it } from "vitest";
import { buildPlaybackSequence } from "./playback-sequence";

const snapshot = {
  scrapbook: { id: "book", title: "Trip", themeKey: "field-journal", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  albums: [{ id: "album-b", name: "Second", position: 1 }, { id: "album-a", name: "First", position: 0 }],
  media: [
    { id: "unassigned", albumId: null, originalName: "loose.jpg", mediaType: "photo", mimeType: "image/jpeg", byteSize: 1, fileUrl: "/loose", caption: null, location: null, position: 0, createdAt: "2026-01-01" },
    { id: "b-1", albumId: "album-b", originalName: "b.jpg", mediaType: "photo", mimeType: "image/jpeg", byteSize: 1, fileUrl: "/b", caption: "B", location: null, position: 0, createdAt: "2026-01-01" },
    { id: "a-2", albumId: "album-a", originalName: "a2.jpg", mediaType: "photo", mimeType: "image/jpeg", byteSize: 1, fileUrl: "/a2", caption: null, location: null, position: 1, createdAt: "2026-01-01" },
    { id: "a-1", albumId: "album-a", originalName: "a1.jpg", mediaType: "photo", mimeType: "image/jpeg", byteSize: 1, fileUrl: "/a1", caption: null, location: null, position: 0, createdAt: "2026-01-01" },
  ],
  stickerAssets: [],
  stickerPlacements: [],
};

describe("buildPlaybackSequence", () => {
  it("sorts albums, media, and appends unassigned media", () => {
    expect(buildPlaybackSequence(snapshot, "all").map((item) => item.id)).toEqual(["a-1", "a-2", "b-1", "unassigned"]);
  });

  it("limits album playback to the selected album", () => {
    expect(buildPlaybackSequence(snapshot, "album", "album-a").map((item) => item.id)).toEqual(["a-1", "a-2"]);
  });
});
