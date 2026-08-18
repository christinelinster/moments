import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaybackPlayer } from "./PlaybackPlayer";

const items = [
  { id: "one", albumId: "album-1", albumName: "Summer", originalName: "one.jpg", mediaType: "photo", mimeType: "image/jpeg", fileUrl: "/one", caption: "One", location: "Toronto", stickerPlacements: [] },
  { id: "two", albumId: "album-1", albumName: "Summer", originalName: "two.mp4", mediaType: "video", mimeType: "video/mp4", fileUrl: "/two", caption: null, location: null, stickerPlacements: [] },
];

describe("PlaybackPlayer", () => {
  it("shows playback controls and advances a photo after five seconds", () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    render(<PlaybackPlayer items={items} onExit={onExit} />);
    expect(screen.getByRole("img", { name: "one.jpg" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play playback$/i })).toBeInTheDocument();
    act(() => { screen.getByRole("button", { name: /^play playback$/i }).click(); vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("heading", { name: /summer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exit playback/i })).toBeInTheDocument();
    act(() => { screen.getByRole("button", { name: /exit playback/i }).click(); });
    expect(onExit).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
