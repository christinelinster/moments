# Task 5: Authenticated Editor Workspace Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Build the authenticated React editor shell with auth gating, album navigation, All memories, upload flow, media details, captions, locations, drag-and-drop, accessible move controls, and bulk actions.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/05-authenticated-editor-workspace.md

**Dependencies:** Tasks 2, 3, and 4.

## Files

- Create: `client/src/main.tsx`, `app.tsx`, `api/http.ts`.
- Create: `client/src/auth/AuthProvider.tsx`, `AuthPage.tsx`, `auth-api.ts`.
- Create: `client/src/scrapbook/ScrapbookWorkspace.tsx`, `AlbumDrawer.tsx`, `MediaGrid.tsx`, `MediaCard.tsx`, `MediaDetailsPanel.tsx`, `UploadDropzone.tsx`, `AllMemoriesToolbar.tsx`, `scrapbook-api.ts`.
- Create: `client/src/components/Button.tsx`, `Modal.tsx`, `Toast.tsx`, `EmptyState.tsx`.
- Create: `client/src/styles/tokens.css`, `global.css`, `scrapbook.css`.
- Create: `client/src/auth/AuthProvider.test.tsx`, `client/src/scrapbook/ScrapbookWorkspace.test.tsx`, `MediaGrid.test.tsx`.

## Interfaces

- `apiFetch<T>(path: string, options?: RequestInit): Promise<T>` sends credentials and maps API errors.
- `AuthProvider` exposes `{ user, status, signIn, signOut, register }`.
- `ScrapbookWorkspace` consumes `ScrapbookSnapshot` and exposes album, media, and selection actions.
- `MediaCardProps` includes `media`, `selected`, `onSelect`, `onOpenDetails`, `onMove`, and `onDelete`.
- `UploadDropzoneProps` includes `scrapbookId`, `albumId`, `accept`, `onUploaded`, and `onError`.

## Test-first implementation steps

- [ ] **Step 1: Write failing component tests.**

Cover signed-out auth entry points, authenticated editor regions, album selection, empty states, media selection, upload progress/error, caption editing, and accessible move controls.

- [ ] **Step 2: Run client tests and verify missing-component failures.**

Run: `npm test --workspace client -- AuthProvider.test.tsx ScrapbookWorkspace.test.tsx MediaGrid.test.tsx`

Expected: FAIL because the app components and interactions do not exist.

- [ ] **Step 3: Implement the client shell and editor features.**

Use `credentials: "include"`, return to auth on `401`, and surface server validation errors. Build the field-journal direction with ink navy desk, warm paper, pool blue, marigold, persimmon, lavender, serif display type, paper tabs, restrained tape, and media-first spacing.

Provide drag-and-drop plus keyboard/touch move alternatives. Keep the central album canvas distinct from dense All memories. Clear or update selection deterministically after bulk actions. Add loading, empty, permission, upload-error, and confirmation states.

- [ ] **Step 4: Run client tests and verify they pass.**

Run: `npm test --workspace client -- AuthProvider.test.tsx ScrapbookWorkspace.test.tsx MediaGrid.test.tsx`

Expected: PASS for auth gating, layout, upload state, album navigation, captioning, selection, bulk action wiring, and focus states.

- [ ] **Step 5: Refactor after green.**

Keep API calls out of presentational cards and preserve the API as the source of truth. Stop for human approval before Task 6.

**Acceptance criteria:** @docs/superpowers/subtasks/05-authenticated-editor-workspace.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
