# PR 5 Review Fixes Implementation Plan

> **For agentic workers:** Execute this plan inline one task at a time. Do not commit or stage changes; the human will review and commit the final diff.

**Goal:** Close the valid follow-up review findings on PR 5 without changing the approved scrapbook scope.

**Architecture:** Keep move-selection reconciliation and dialog state in `ScrapbookWorkspace`, expose sticker upload errors and keyboard nudges at the sticker component boundary, and extend the existing isolated Playwright harness with owner, public-read-only, and fresh-API persistence checks. Documentation will describe the dedicated E2E database and media lifecycle that the harness already enforces.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Playwright, Express, PostgreSQL, local media storage.

**Spec:** @docs/superpowers/subtasks/05-authenticated-editor-workspace.md, @docs/superpowers/subtasks/07-custom-stickers-and-decorations.md, @docs/superpowers/subtasks/09-final-verification-and-handoff.md

## Global Constraints

- Owners and editors may organize scrapbook media and decorations, while public snapshots remain read-only.
- Sticker assets accept PNG, JPEG, and WebP uploads and reject unsupported, oversized, or remote inputs with clear errors.
- Playwright must use a dedicated `_test` or `_e2e` PostgreSQL database, an isolated schema, and a temporary media directory.
- Do not commit, stage, push, or open a pull request.

## References

- Task spec: @docs/superpowers/subtasks/05-authenticated-editor-workspace.md
- Task spec: @docs/superpowers/subtasks/07-custom-stickers-and-decorations.md
- Task spec: @docs/superpowers/subtasks/09-final-verification-and-handoff.md
- Product requirements: @docs/product-requirements.md
- Development setup: @docs/development.md
- Security boundaries: @docs/security.md

### Task 1: Make every single-media move safe and deterministic

**Files:**
- Modify: `client/src/scrapbook/ScrapbookWorkspace.tsx`
- Test: `client/src/scrapbook/ScrapbookWorkspace.test.tsx`

- [x] **Step 1: Write failing component regressions.** Add tests that select a media card, move it with the per-card dialog, and move a selected card by dropping it on an album; each test must assert the selection toolbar disappears after a successful move. Add a sequence test that leaves text in the create or rename draft, opens Move, and asserts the select starts at the media's current album and submits that destination.
- [x] **Step 2: Run the focused workspace tests and confirm the new tests fail for stale selection or stale draft state.**
- [x] **Step 3: Add a move helper that calls `bulkMoveMedia`, removes the moved IDs from `selectedIds`, clears `selectionAnchorId` when it moved, and use it for bulk, dialog, and drag moves. Set `draft` from `item.albumId ?? ""` in `openMove` before opening the dialog.
- [x] **Step 4: Re-run the focused tests and then the full client test suite.**

### Task 2: Surface sticker upload failures and support keyboard nudging

**Files:**
- Modify: `client/src/stickers/StickerTray.tsx`
- Modify: `client/src/stickers/StickerCanvasLayer.tsx`
- Test: `client/src/stickers/StickerTray.test.tsx`
- Test: `client/src/stickers/StickerCanvasLayer.test.tsx`

- [x] **Step 1: Write failing component tests.** Make a rejected `onUpload` render an alert with the API error message and keep the tray usable. Make an editable placement focusable and assert ArrowRight, ArrowLeft, ArrowUp, and ArrowDown call `onChange` with clamped percentage coordinates.
- [x] **Step 2: Run the two focused sticker test files and confirm the new assertions fail.**
- [x] **Step 3: Catch upload errors in `StickerTray`, reset the file input and busy state as today, and render a `role="alert"` error beside the tray. Add an accessible, focusable placement target in `StickerCanvasLayer`; prevent default arrow scrolling, move by one percentage point, clamp to 0-100, and persist through the existing `onChange` callback.
- [x] **Step 4: Re-run the sticker tests and the full client suite.**

### Task 3: Cover owner removal, public mutation rejection, and API restart persistence in Playwright

**Files:**
- Modify: `e2e/collaborators.spec.ts`
- Modify: `e2e/public-viewer.spec.ts`
- Create: `e2e/persistence.spec.ts`
- Create: `e2e/restarted-api.ts`

- [x] **Step 1: Add browser assertions before implementation changes.** Extend collaborator coverage so the owner removes the linked editor and the removed editor receives a permission error after signing in again. Extend public coverage to fetch a scrapbook mutation endpoint without authentication and assert a 401 response. Add a persistence test that uploads a media file, starts a fresh API process on an alternate port using the same isolated database and media root, and reads the scrapbook and file through that process from the browser.
- [x] **Step 2: Run the targeted Playwright specs and confirm the new coverage fails or cannot complete with the current harness.**
- [x] **Step 3: Add a small restart helper that launches the local `tsx` server with `E2E_DATABASE_URL` rewritten to the isolated schema, `E2E_MEDIA_ROOT`, and `CLIENT_ORIGIN`, waits for `/api/health`, and always terminates the child process in `finally`.
- [x] **Step 4: Re-run the targeted specs, then the complete Playwright suite with the documented dedicated database.**

### Task 4: Make the E2E setup documentation and whitespace clean

**Files:**
- Modify: `README.md`
- Modify: `docs/development.md`
- Modify: `e2e/global-teardown.ts`

- [x] **Step 1: Update the README configuration and setup text to list `E2E_DATABASE_URL`, show creation of both `moments` and `moments_test` (or `moments_e2e`), and show the guarded E2E command with the dedicated URL. Keep the existing persistent-media warning.
- [x] **Step 2: Mirror the database-creation prerequisite in `docs/development.md` so the documented command is runnable from a fresh setup.
- [x] **Step 3: Remove the trailing blank line in `e2e/global-teardown.ts` and run `git diff --check`.

### Task 5: Final verification and handoff

- [x] **Step 1: Run focused client tests for workspace and stickers.**
- [x] **Step 2: Run `npm test`.**
- [x] **Step 3: Run `npm run build`.**
- [x] **Step 4: Run `E2E_DATABASE_URL=... npm run test:e2e` against a dedicated local test database when available.**
- [x] **Step 5: Review `git diff`, `git diff --check`, and repository status; leave all changes unstaged and uncommitted for human approval.**
