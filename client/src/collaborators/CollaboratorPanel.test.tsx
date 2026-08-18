import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollaboratorPanel } from "./CollaboratorPanel";

describe("CollaboratorPanel", () => {
  it("shows pending state and hides remove controls from editors", () => {
    render(<CollaboratorPanel currentRole="editor" members={[{ id: "membership-1", email: "pending@example.com", userId: null, linkedAt: null }]} onAdd={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Pending account")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove pending@example.com/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add editor/i })).toBeInTheDocument();
  });
});
