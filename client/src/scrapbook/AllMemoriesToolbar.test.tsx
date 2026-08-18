import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AllMemoriesToolbar } from "./AllMemoriesToolbar";

describe("AllMemoriesToolbar", () => {
  it("stages an album destination until Move selected is confirmed", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();

    render(
      <AllMemoriesToolbar
        selectedCount={2}
        albums={[{ id: "album-1", name: "Summer", position: 0 }]}
        onMove={onMove}
        onDelete={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "album-1");
    expect(onMove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Move selected" }));
    expect(onMove).toHaveBeenCalledWith("album-1");
  });
});
