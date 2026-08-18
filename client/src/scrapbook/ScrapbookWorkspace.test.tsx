import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MediaItem } from "../api/types";
import { ScrapbookWorkspace } from "./ScrapbookWorkspace";

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

describe("ScrapbookWorkspace", () => {
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
