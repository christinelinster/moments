import { useCallback, useEffect, useState } from "react";
import type { PlaybackItem } from "./playback-sequence";

export type PlaybackController = { currentIndex: number; currentItem: PlaybackItem | undefined; isPlaying: boolean; isComplete: boolean; play: () => void; pause: () => void; next: () => void; previous: () => void; replay: () => void; exit: () => void };

export function usePlayback(items: PlaybackItem[], options: { photoDurationMs: number; onExit?: () => void } = { photoDurationMs: 5000 }): PlaybackController {
  const [state, setState] = useState({ currentIndex: 0, isPlaying: false, isComplete: false });
  const currentItem = items[state.currentIndex];
  useEffect(() => { setState({ currentIndex: 0, isPlaying: false, isComplete: false }); }, [items]);
  const next = useCallback(() => {
    setState((current) => {
      if (!items.length || current.currentIndex >= items.length - 1) return { ...current, isPlaying: false, isComplete: true };
      return { ...current, currentIndex: current.currentIndex + 1, isComplete: false };
    });
  }, [items.length]);
  const previous = useCallback(() => {
    setState((current) => ({ ...current, currentIndex: Math.max(0, current.currentIndex - 1), isComplete: false }));
  }, []);
  useEffect(() => { if (!state.isPlaying || !currentItem || currentItem.mediaType === "video") return; const timer = window.setTimeout(next, options.photoDurationMs); return () => window.clearTimeout(timer); }, [currentItem, next, options.photoDurationMs, state.isPlaying]);
  const play = useCallback(() => setState((current) => ({ ...current, isPlaying: true, isComplete: false })), []);
  const pause = useCallback(() => setState((current) => ({ ...current, isPlaying: false })), []);
  const replay = useCallback(() => setState({ currentIndex: 0, isPlaying: true, isComplete: false }), []);
  return { currentIndex: state.currentIndex, currentItem, isPlaying: state.isPlaying, isComplete: state.isComplete, play, pause, next, previous, replay, exit: () => options.onExit?.() };
}
