import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MediaItem } from "../api/types";
import { ScrapbookWorkspace } from "./ScrapbookWorkspace";

const { bulkMoveMediaMock } = vi.hoisted(() => ({ bulkMoveMediaMock: vi.fn() }));

vi.mock("./scrapbook-api", () => ({
  bulkMoveMedia: bulkMoveMediaMock,
  bulkDeleteMedia: vi.fn(),
  createAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
  deleteMedia: vi.fn(),
  reorderAlbums: vi.fn(),
  reorderMedia: vi.fn(),
  renameAlbum: vi.fn(),
  updateMedia: vi.fn(),
}));

vi.mock("../stickers/sticker-api", () => ({
  listStickers: vi.fn().mockResolvedValue({ assets: [] }),
  listPlacements: vi.fn().mockResolvedValue({ placements: [] }),
}));

const selectableMedia: MediaItem[] = [0, 1, 2].map((index) => ({
  id: `media-${index + 1}`,
  albumId: null,
  originalName: `memory-${index + 1}.jpg`,
  mediaType: "photo",
  mimeType: "image/jpeg",
  byteSize: 42,
  fileUrl: `/api/files/by-media/media-${index + 1}`,
  caption: null,
  location: null,
  position: index,
  createdAt: "2026-01-01T00:00:00.000Z",
}));

const scrapbook = { id: "scrapbook-1", ownerId: "user-1", title: "Summer notes", themeKey: "field-journal", shareEnabled: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } as const;
const albums = [
  { id: "album-1", scrapbookId: "scrapbook-1", name: "City walks", position: 0 },
  { id: "album-2", scrapbookId: "scrapbook-1", name: "At home", position: 1 },
];
const albumMedia: MediaItem[] = [
  { ...selectableMedia[0], albumId: "album-1" },
  { ...selectableMedia[1], albumId: "album-1" },
];

function renderWorkspace(media: MediaItem[] = albumMedia, onRefresh = vi.fn().mockResolvedValue(undefined)) {
  return render(<ScrapbookWorkspace scrapbook={scrapbook} albums={albums} media={media} editors={[]} currentUserId="user-1" onRefresh={onRefresh} />);
}

describe("ScrapbookWorkspace", () => {
  it("clears a selected media item after moving it through the card dialog", async () => {
    const user = userEvent.setup();
    bulkMoveMediaMock.mockResolvedValue(undefined);
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "Select memory-1.jpg" }));
    await user.click(screen.getByRole("button", { name: "Move memory-1.jpg" }));
    const dialog = screen.getByRole("dialog", { name: "Move memory" });
    await user.selectOptions(within(dialog).getByRole("combobox"), "album-2");
    await user.click(within(dialog).getByRole("button", { name: "Move memory" }));

    await waitFor(() => expect(bulkMoveMediaMock).toHaveBeenCalledWith("scrapbook-1", ["media-1"], "album-2"));
    expect(screen.queryByRole("toolbar", { name: "Bulk memory actions" })).not.toBeInTheDocument();
  });

  it("clears a selected media item after dragging it to another album", async () => {
    const user = userEvent.setup();
    bulkMoveMediaMock.mockResolvedValue(undefined);
    renderWorkspace();

    await user.click(screen.getByRole("checkbox", { name: "Select memory-1.jpg" }));
    const dataTransfer = { getData: vi.fn().mockReturnValue("media-1"), setData: vi.fn(), types: ["text/media-id"] };
    fireEvent.drop(screen.getByRole("button", { name: /^At home/ }), { dataTransfer });

    await waitFor(() => expect(bulkMoveMediaMock).toHaveBeenCalledWith("scrapbook-1", ["media-1"], "album-2"));
    expect(screen.queryByRole("toolbar", { name: "Bulk memory actions" })).not.toBeInTheDocument();
  });

  it("initializes the move destination from the media instead of a stale album draft", async () => {
    const user = userEvent.setup();
    bulkMoveMediaMock.mockResolvedValue(undefined);
    renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Rename City walks" }));
    const renameDialog = screen.getByRole("dialog", { name: "Rename album" });
    await user.clear(within(renameDialog).getByLabelText("Album name"));
    await user.type(within(renameDialog).getByLabelText("Album name"), "Stale album name");
    await user.click(within(renameDialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Move memory-1.jpg" }));
    const moveDialog = screen.getByRole("dialog", { name: "Move memory" });
    expect(within(moveDialog).getByRole("combobox")).toHaveValue("album-1");
    await user.click(within(moveDialog).getByRole("button", { name: "Move memory" }));

    await waitFor(() => expect(bulkMoveMediaMock).toHaveBeenCalledWith("scrapbook-1", ["media-1"], "album-1"));
  });

  it("shows the scrapbook shell, album drawer, paper spread, and details panel", () => {
    render(
      <ScrapbookWorkspace
        scrapbook={{
          id: "scrapbook-1",
          ownerId: "user-1",
          title: "Summer notes",
          themeKey: "field-journal",
          shareEnabled: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }}
        albums={[]}
        media={[]}
        editors={[]}
        currentUserId="user-1"
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByRole("navigation", { name: /memory drawer/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /paper spread/i })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /media details/i })).toBeInTheDocument();
    expect(screen.getByText(/no memories yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
  });

  it("selects the full visible range when shift-clicking a memory", async () => {
    const user = userEvent.setup();
    render(
      <ScrapbookWorkspace
        scrapbook={{ id: "scrapbook-1", ownerId: "user-1", title: "Summer notes", themeKey: "field-journal", shareEnabled: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }}
        albums={[]}
        media={selectableMedia}
        editors={[]}
        currentUserId="user-1"
        onRefresh={vi.fn()}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.keyboard("{Shift>}");
    await user.click(checkboxes[2]);
    await user.keyboard("{/Shift}");

    expect(checkboxes.every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true);
  });
});
