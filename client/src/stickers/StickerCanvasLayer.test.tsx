import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StickerCanvasLayer } from "./StickerCanvasLayer";

describe("StickerCanvasLayer", () => {
  it("renders a placement with transform controls and accessible delete", () => {
    render(<StickerCanvasLayer editable placements={[{ id: "placement-1", albumId: "album-1", stickerAssetId: "sticker-1", x: 25, y: 40, scale: 1, rotation: 0, layer: 1 }]} assets={[{ id: "sticker-1", originalName: "star.png", mimeType: "image/png", byteSize: 10, fileUrl: "/star.png" }]} onChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("img", { name: "star.png" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete sticker star\.png/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bring sticker star\.png forward/i })).toBeInTheDocument();
  });
});
