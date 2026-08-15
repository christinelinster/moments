# Task 9: Final Verification and Handoff Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Verify the complete approved application, document setup and persistent storage, and prepare a final diff for human review without committing or staging.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/09-final-verification-and-handoff.md

**Dependencies:** Tasks 1 through 8.

## Files

- Create: `playwright.config.ts`, `e2e/auth.spec.ts`, `e2e/editor.spec.ts`, `e2e/public-viewer.spec.ts`, `e2e/media-and-playback.spec.ts`.
- Create or modify: `README.md`, `.env.example`, `server/scripts/test-database.ts`, `client/src/test/test-fixtures.ts`, `server/src/test/test-fixtures.ts`.
- Modify: root `package.json` only for reproducible verification scripts.

## Commands

- `npm run db:migrate` applies migrations to `DATABASE_URL`.
- `npm test` runs server and client tests.
- `npm run build` creates production client and server output.
- `npm run test:e2e` starts the configured app against a test database and runs Playwright flows.

## Test-first implementation steps

- [ ] **Step 1: Write failing end-to-end smoke tests.**

Cover registration, owner scrapbook creation, upload, public-link copy, public viewing without login, editor addition, editor restrictions, albums, captions, bulk actions, themes, stickers, deletion, refresh persistence, restart persistence, and playback.

- [ ] **Step 2: Run the e2e tests and verify incomplete-flow failures.**

Run: `npm run test:e2e`

Expected: FAIL only for missing setup or incomplete flows, with actionable output.

- [ ] **Step 3: Implement test fixtures, isolated test database lifecycle, startup scripts, README setup, and only verified defects.**

Document Node version, environment variables, Postgres setup, migration command, development startup, `var/media` persistence, test/build/e2e commands, and production S3-compatible storage configuration. Ensure e2e tests use isolated users and a clean test database or schema.

- [ ] **Step 4: Run the complete verification suite.**

Run: `npm test`

Expected: PASS with zero unit, API, and component failures.

Run: `npm run build`

Expected: PASS with production artifacts.

Run: `npm run test:e2e`

Expected: PASS for all browser flows.

- [ ] **Step 5: Review the final diff and hand off.**

Confirm no secrets or uploaded files are tracked, the implementation remains within the approved scope, the relevant diff is shown to the human, and no commit or staging occurs.

**Acceptance criteria:** @docs/superpowers/subtasks/09-final-verification-and-handoff.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
