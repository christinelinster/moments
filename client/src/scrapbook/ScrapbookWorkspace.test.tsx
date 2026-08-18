import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScrapbookWorkspace } from "./ScrapbookWorkspace";

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
});
