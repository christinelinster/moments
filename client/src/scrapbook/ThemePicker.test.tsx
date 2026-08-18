import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemePicker } from "./ThemePicker";

describe("ThemePicker", () => {
  it("offers the four named presets and marks the active theme", () => {
    render(<ThemePicker value="field-journal" canEdit onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /field journal/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /poolside/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /citrus notebook/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /moonlight ink/i })).toBeInTheDocument();
  });
});
