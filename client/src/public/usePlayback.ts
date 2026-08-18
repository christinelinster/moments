import { useCallback, useEffect, useState } from "react";
import type { PlaybackItem } from "./playback-sequence";

export type PlaybackController = { currentIndex: number; currentItem: PlaybackItem | undefined; isPlaying: boolean; isComplete: boolean; play: () => void; pause: () => void; next: () => void; previous: () => void; replay: () => void; exit: () => void };

export function usePlayback(items: PlaybackItem[], options: { photoDurationMs: number; onExit?: () => void } = { photoDurationMs: 5000 }): PlaybackController {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const currentItem = items[currentIndex];
  const isComplete = items.length > 0 && currentIndex >= items.length - 1 && !isPlaying;
  useEffect(() => { setCurrentIndex(0); setPlaying(false); }, [items]);
  const next = useCallback(() => { setCurrentIndex((index) => { if (index >= items.length - 1) { setPlaying(false); return index; } return index + 1; }); }, [items.length]);
  const previous = useCallback(() => { setCurrentIndex((index) => Math.max(0, index - 1)); }, []);
  useEffect(() => { if (!isPlaying || !currentItem || currentItem.mediaType === "video") return; const timer = window.setTimeout(next, options.photoDurationMs); return () => window.clearTimeout(timer); }, [currentItem, isPlaying, next, options.photoDurationMs]);
  return { currentIndex, currentItem, isPlaying, isComplete, play: () => setPlaying(true), pause: () => setPlaying(false), next, previous, replay: () => { setCurrentIndex(0); setPlaying(true); }, exit: () => options.onExit?.() };
}
