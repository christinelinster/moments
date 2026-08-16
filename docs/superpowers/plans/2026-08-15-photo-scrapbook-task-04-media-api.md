# Task 4: Albums, Media Uploads, and Organization API Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Implement server-side album management, photo/video uploads, MIME and size validation, captions, locations, ordering, moves, bulk actions, safe file responses, and deletion.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/04-albums-media-and-organization-api.md

**Dependencies:** Tasks 1 through 3.

## References

- Task spec: @docs/superpowers/subtasks/04-albums-media-and-organization-api.md
- Architecture: @docs/architecture.md
- Security: @docs/security.md
- Development: @docs/development.md

## Files

- Create: `server/src/albums/repository.ts`, `server/src/albums/routes.ts`.
- Create: `server/src/media/validation.ts`, `server/src/media/repository.ts`, `server/src/media/routes.ts`.
- Modify: `server/src/storage/storage.ts` and `local-storage.ts` for temp-file or stream support.
- Modify: `server/src/public/routes.ts` to include safe media metadata and references.
- Modify: `server/src/app.ts` to mount album and media routes.
- Create: `server/src/albums/routes.test.ts`, `server/src/media/validation.test.ts`, `server/src/media/routes.test.ts`.

## Interfaces and routes

- `validateUploadedFile(file: UploadedFile, kind: "media" | "sticker"): Promise<ValidatedUpload>`.
- `listAlbums(scrapbookId: string): Promise<Album[]>`.
- `reorderAlbums(scrapbookId: string, orderedIds: string[]): Promise<void>`.
- `listMedia(scrapbookId: string, albumId?: string | null): Promise<MediaItem[]>`.
- `reorderMedia(scrapbookId: string, albumId: string | null, orderedIds: string[]): Promise<void>`.
- `bulkMoveMedia(scrapbookId: string, mediaIds: string[], albumId: string | null): Promise<void>`.
- `deleteMedia(scrapbookId: string, mediaIds: string[]): Promise<void>`.
- Routes cover album CRUD/order, media list/upload/update/reorder/bulk move/delete, and safe `GET /api/files/:storageKey`.

## Test-first implementation steps

- [ ] **Step 1: Write failing upload, album, ordering, and bulk-action tests.**

Cover valid image/video uploads, unsupported MIME types, oversized files, album create/rename/reorder/delete, caption/location updates, media reorder, move to another album, bulk move, bulk delete, safe file access, and unauthorized access.

- [ ] **Step 2: Run the tests and verify missing-route or missing-storage failures.**

Run: `npm test --workspace server -- albums/routes.test.ts media/validation.test.ts media/routes.test.ts`

Expected: FAIL because album/media routes, validation, and storage writes do not exist.

- [ ] **Step 3: Implement validation, storage, repositories, transactions, and routes.**

Accept configured photo/video MIME types and inspect file signatures where supported. Use a default 250 MB media limit and return `413` for oversized files. Write uploaded files before database records; remove orphaned files if database creation fails. On deletion, report storage cleanup failures as retryable errors.

Use Postgres transactions for album deletion, album/media moves, reordering, and bulk operations. Reindex positions from zero within each album and within unassigned media. Deleting an album leaves media intact and sets `album_id` to null.

- [ ] **Step 4: Run the tests and verify they pass.**

Run: `npm test --workspace server -- albums/routes.test.ts media/validation.test.ts media/routes.test.ts`

Expected: PASS for uploads, validation, persistence, album behavior, metadata, ordering, bulk actions, deletion, file access, and permissions.

- [ ] **Step 5: Refactor after green.**

Keep validation, storage, repository transactions, and response formatting separate. Do not serve the storage directory as a static folder. Stop for human approval before Task 5.

**Acceptance criteria:** @docs/superpowers/subtasks/04-albums-media-and-organization-api.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
