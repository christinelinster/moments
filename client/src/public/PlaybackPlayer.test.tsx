import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackPlayer } from "./PlaybackPlayer";

const items = [
  { id: "one", albumId: "album-1", albumName: "Summer", originalName: "one.jpg", mediaType: "photo", mimeType: "image/jpeg", fileUrl: "/one", caption: "One", location: "Toronto", stickerPlacements: [] },
  { id: "two", albumId: "album-1", albumName: "Summer", originalName: "two.mp4", mediaType: "video", mimeType: "video/mp4", fileUrl: "/two", caption: null, location: null, stickerPlacements: [] },
];

describe("PlaybackPlayer", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows playback controls and advances a photo after five seconds", () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    render(<PlaybackPlayer items={items} onExit={onExit} />);
    expect(screen.getByRole("img", { name: "one.jpg" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play playback$/i })).toBeInTheDocument();
    act(() => { screen.getByRole("button", { name: /^play playback$/i }).click(); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("heading", { name: /summer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exit playback/i })).toBeInTheDocument();
    act(() => { screen.getByRole("button", { name: /exit playback/i }).click(); });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("keeps a single photo playable until it actually reaches the end", async () => {
    vi.useFakeTimers();
    render(<PlaybackPlayer items={[items[0]]} onExit={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^play playback$/i })).toBeInTheDocument();
    act(() => { screen.getByRole("button", { name: /^play playback$/i }).click(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole("button", { name: /^replay$/i })).toBeInTheDocument();
  });

  it("shows replay after the final video reports that it ended", () => {
    render(<PlaybackPlayer items={[items[1]]} onExit={vi.fn()} />);
    const video = screen.getByLabelText("two.mp4");

    expect(screen.getByRole("button", { name: /^play playback$/i })).toBeInTheDocument();
    act(() => { screen.getByRole("button", { name: /^play playback$/i }).click(); });
    act(() => { fireEvent.ended(video); });
    expect(screen.getByRole("button", { name: /^replay$/i })).toBeInTheDocument();
  });
});
