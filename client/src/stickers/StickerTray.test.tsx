import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StickerTray } from "./StickerTray";

describe("StickerTray", () => {
  it("renders scrapbook-specific stickers and an upload control", () => {
    render(<StickerTray assets={[{ id: "sticker-1", originalName: "star.png", mimeType: "image/png", byteSize: 10, fileUrl: "/star.png" }]} onUpload={vi.fn()} onChoose={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("img", { name: "star.png" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /place star\.png/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/upload sticker/i)).toBeInTheDocument();
  });

  it("requires confirmation before deleting a sticker", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<StickerTray assets={[{ id: "sticker-1", originalName: "star.png", mimeType: "image/png", byteSize: 10, fileUrl: "/star.png" }]} onUpload={vi.fn()} onChoose={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete sticker star\.png/i }));
    expect(screen.getByRole("dialog", { name: /delete sticker/i })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /^delete sticker$/i }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "sticker-1" })));
    expect(screen.queryByRole("dialog", { name: /delete sticker/i })).not.toBeInTheDocument();
  });

  it("keeps the confirmation open and explains deletion failures", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error("Storage is unavailable"));
    render(<StickerTray assets={[{ id: "sticker-1", originalName: "star.png", mimeType: "image/png", byteSize: 10, fileUrl: "/star.png" }]} onUpload={vi.fn()} onChoose={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /delete sticker star\.png/i }));
    await user.click(screen.getByRole("button", { name: /^delete sticker$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Storage is unavailable");
    expect(screen.getByRole("dialog", { name: /delete sticker/i })).toBeInTheDocument();
  });
});
