import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaGrid } from "./MediaGrid";

const media = [
  {
    id: "media-1",
    albumId: null,
    originalName: "lake.jpg",
    mediaType: "photo" as const,
    mimeType: "image/jpeg",
    byteSize: 42,
    fileUrl: "/api/files/by-media/media-1",
    caption: null,
    location: null,
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("MediaGrid", () => {
  it("renders selectable media and an accessible move action", () => {
    render(
      <MediaGrid
        media={media}
        selectedIds={new Set()}
        onSelect={vi.fn()}
        onOpenDetails={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "lake.jpg" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /select lake\.jpg/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^move lake\.jpg$/i })).toBeInTheDocument();
  });
});
