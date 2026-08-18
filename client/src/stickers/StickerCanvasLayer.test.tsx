import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StickerCanvasLayer } from "./StickerCanvasLayer";

describe("StickerCanvasLayer", () => {
  it("renders a placement with transform controls and accessible delete", () => {
    render(<StickerCanvasLayer editable placements={[{ id: "placement-1", albumId: "album-1", stickerAssetId: "sticker-1", x: 25, y: 40, scale: 1, rotation: 0, layer: 1 }]} assets={[{ id: "sticker-1", originalName: "star.png", mimeType: "image/png", byteSize: 10, fileUrl: "/star.png" }]} onChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("img", { name: "star.png" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete sticker star\.png/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bring sticker star\.png forward/i })).toBeInTheDocument();
  });

  it("persists a drag once when the pointer is released", () => {
    const onChange = vi.fn();
    render(<StickerCanvasLayer editable placements={[{ id: "placement-1", albumId: "album-1", stickerAssetId: "sticker-1", x: 25, y: 40, scale: 1, rotation: 0, layer: 1 }]} assets={[{ id: "sticker-1", originalName: "star.png", mimeType: "image/png", byteSize: 10, fileUrl: "/star.png" }]} onChange={onChange} onDelete={vi.fn()} />);
    const placement = screen.getByRole("img", { name: "star.png" }).closest(".sticker-placement") as HTMLDivElement;
    const layer = placement.parentElement as HTMLDivElement;
    Object.defineProperty(layer, "getBoundingClientRect", { value: () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100 }) });
    placement.setPointerCapture = vi.fn();

    fireEvent.pointerDown(placement, { pointerId: 1, clientX: 50, clientY: 40 });
    const move = (clientX: number, clientY: number) => { const event = new Event("pointermove", { bubbles: true }); Object.defineProperties(event, { clientX: { value: clientX }, clientY: { value: clientY } }); placement.dispatchEvent(event); };
    move(100, 50);
    move(150, 75);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(placement, { pointerId: 1, clientX: 150, clientY: 75 });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: "placement-1", x: 75, y: 75 }));
  });
});
