# Subtask 4: Albums, Media Uploads, and Organization API

## Task

Implement the server-side album and media workflows. Add local-disk media storage behind the storage interface, multipart uploads with validation, album CRUD, media metadata updates, ordering, moves, bulk actions, and deletion.

This task must persist all state in Postgres and the configured storage adapter. It must not rely on browser state for uploaded files or ordering.

## Dependencies

- Subtask 1: Application foundation and database.
- Subtask 2: Authentication and sessions.
- Subtask 3: Scrapbooks, sharing, and editor permissions.

## Implementation plan

@docs/superpowers/plans/2026-08-15-photo-scrapbook-task-04-media-api.md

## Acceptance criteria

- An owner or editor can upload supported photo and video files through a multipart API.
- The server validates MIME type and file size before creating a visible media record.
- Each successful upload creates one media record with scrapbook, optional album, storage key, media type, MIME type, size, uploader, and position.
- Uploaded files remain available after API restarts when the configured persistent storage directory is retained.
- Owners and editors can create, rename, reorder, and delete albums.
- Deleting an album leaves its media intact and changes those media items to unassigned.
- Owners and editors can update captions and locations.
- Owners and editors can reorder media within an album and move media between albums.
- The API supports bulk move and bulk delete for selected media IDs.
- Individual and bulk deletion remove media records and stored files, and failures return a retryable error instead of a false success.
- Public file responses verify that the requested file belongs to the scrapbook identified by the active share token.
- Automated tests cover valid uploads, rejected uploads, album behavior, ordering, caption updates, bulk actions, deletion, and unauthorized access.
