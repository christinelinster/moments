# Task 8: Public Viewer and Slideshow Playback Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Build the unauthenticated public scrapbook route and ordered slideshow player for one album or the entire scrapbook, including video playback, captions, locations, themes, stickers, page turns, Replay, Exit, and reduced motion.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/08-public-viewer-and-playback.md

**Dependencies:** Tasks 3, 4, 6, and 7.

## Files

- Create: `client/src/public/PublicScrapbookPage.tsx`, `PublicAlbumView.tsx`, `public-api.ts`.
- Create: `client/src/public/PlaybackPlayer.tsx`, `usePlayback.ts`, `playback-sequence.ts`, `PlaybackPlayer.test.tsx`, `playback-sequence.test.ts`.
- Create: `client/src/styles/public.css`, `playback.css`.
- Modify: `client/src/app.tsx` for `/shared/:shareToken` without auth.
- Modify: `server/src/public/routes.ts` to return ordered media and decoration data.

## Interfaces

- `buildPlaybackSequence(snapshot: PublicScrapbookSnapshot, scope: "album" | "all", albumId?: string): PlaybackItem[]`.
- `usePlayback(items: PlaybackItem[], options: { photoDurationMs: number }): PlaybackController`.
- `PlaybackController` exposes `currentIndex`, `isPlaying`, `play`, `pause`, `next`, `previous`, `replay`, and `exit`.
- `PlaybackItem` includes media ID/type/source, caption, location, album ID/name, and sticker placements.

## Test-first implementation steps

- [ ] **Step 1: Write failing sequence and player tests.**

Cover album order, media order, unassigned media at the end, a five-second photo timer, video `ended` behavior, previous/next, pause/play, final state, Replay, Exit, captions, locations, stickers, and reduced motion.

- [ ] **Step 2: Run tests and verify missing sequence/player failures.**

Run: `npm test --workspace client -- playback-sequence.test.ts PlaybackPlayer.test.tsx`

Expected: FAIL because public route, sequence builder, and playback controller do not exist.

- [ ] **Step 3: Implement public browsing and playback.**

The public page must not mount authenticated providers or send mutation requests. Sort albums by album position, media by media position, and append unassigned media. Photos use `5000` milliseconds. Videos advance on `ended`, with playback started by a user gesture. Stop at the final item with Replay and Exit.

Use the safe file endpoint, render the stored theme and sticker placements, keep controls keyboard reachable, and reduce/remove page-turn animation when `prefers-reduced-motion` is enabled.

- [ ] **Step 4: Run tests and verify they pass.**

Run: `npm test --workspace client -- playback-sequence.test.ts PlaybackPlayer.test.tsx`

Expected: PASS for public access, navigation, sequence order, timers, video behavior, controls, captions, stickers, final state, replay, exit, and reduced motion.

- [ ] **Step 5: Refactor after green.**

Keep sequence construction pure and public rendering read-only. Stop for human approval before Task 9.

**Acceptance criteria:** @docs/superpowers/subtasks/08-public-viewer-and-playback.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
