# Task 7: Custom Stickers and Scrapbook Decorations Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Implement scrapbook-specific sticker uploads and persisted album decoration placements with drag, resize, rotation, layer, keyboard nudge, and delete controls.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/07-custom-stickers-and-decorations.md

**Dependencies:** Tasks 4, 5, and 6.

## Files

- Create: `server/src/stickers/repository.ts`, `server/src/stickers/routes.ts`, `server/src/stickers/routes.test.ts`.
- Create: `client/src/stickers/StickerTray.tsx`, `StickerCanvasLayer.tsx`, `sticker-api.ts`, `StickerTray.test.tsx`, `StickerCanvasLayer.test.tsx`.
- Modify: `server/src/public/routes.ts` to include sticker assets and placements.
- Modify: `client/src/scrapbook/ScrapbookWorkspace.tsx` to mount sticker UI.

## Interfaces and routes

- `StickerAsset` includes `id`, `scrapbookId`, `storageKey`, `mimeType`, `byteSize`, and `createdAt`.
- `StickerPlacement` includes `id`, `albumId`, `assetId`, `x`, `y`, `scale`, `rotation`, and `layer`.
- `StickerCanvasLayerProps` includes `placements`, `assets`, `editable`, `onChange`, and `onDelete`.
- `buildStickerPlacement(input: NewStickerPlacement): StickerPlacement` bounds and normalizes transform values.
- Routes cover sticker list/upload/delete and album placement create/update/delete/reorder.

## Test-first implementation steps

- [ ] **Step 1: Write failing API and component tests.**

Cover accepted PNG/JPEG/WebP uploads, rejected remote URLs and unsupported/oversized files, tray appearance, placement, transform, layer order, delete, refresh persistence, public read-only rendering, and role enforcement.

- [ ] **Step 2: Run tests and verify missing sticker behavior.**

Run: `npm test --workspace server -- stickers/routes.test.ts`

Run: `npm test --workspace client -- StickerTray.test.tsx StickerCanvasLayer.test.tsx`

Expected: FAIL because sticker routes and placement components do not exist.

- [ ] **Step 3: Implement sticker assets, placements, and editor controls.**

Use a 10 MB sticker limit and accept raster PNG, JPEG, and WebP files. Do not fetch remote URLs. Store placement coordinates as album-relative percentages and bound scale/rotation values so layouts survive viewport changes.

Provide pointer drag, keyboard nudge, resize handles, rotate controls, layer actions, delete, and accessible labels. Keep sticker assets separate from photos/videos so All memories and playback sequences do not include stickers as media items.

- [ ] **Step 4: Run tests and verify they pass.**

Run the server and client commands from Step 2.

Expected: PASS for upload validation, placement persistence, transforms, layer order, deletion, public rendering, and permissions.

- [ ] **Step 5: Refactor after green.**

Keep public rendering read-only and ensure deleting an asset has deterministic behavior for its placements. Stop for human approval before Task 8.

**Acceptance criteria:** @docs/superpowers/subtasks/07-custom-stickers-and-decorations.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
