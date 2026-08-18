import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StickerTray } from "./StickerTray";

describe("StickerTray", () => {
  it("renders scrapbook-specific stickers and an upload control", () => {
    render(<StickerTray assets={[{ id: "sticker-1", originalName: "star.png", mimeType: "image/png", byteSize: 10, fileUrl: "/star.png" }]} onUpload={vi.fn()} onChoose={vi.fn()} />);
    expect(screen.getByRole("img", { name: "star.png" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /place star\.png/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/upload sticker/i)).toBeInTheDocument();
  });
});
