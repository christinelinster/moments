# Task 3: Scrapbooks, Sharing, and Editor Permissions Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Implement scrapbook creation, public share-token lifecycle, editor memberships, pending-email linking, public read-only snapshots, and server-side owner/editor permission checks.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/03-scrapbooks-sharing-and-permissions.md

**Dependencies:** Tasks 1 and 2.

## Files

- Create: `server/src/scrapbooks/permissions.ts`, `repository.ts`, `membership-repository.ts`, `routes.ts`.
- Create: `server/src/public/routes.ts`.
- Modify: `server/src/auth/routes.ts` to link pending memberships after registration and login.
- Modify: `server/src/app.ts` to mount scrapbook and public routes.
- Create: `server/src/scrapbooks/permissions.test.ts`, `routes.test.ts`, `server/src/public/routes.test.ts`.

## Interfaces and routes

- `type ScrapbookRole = "owner" | "editor"`.
- `getScrapbookRole(userId: string, scrapbookId: string): Promise<ScrapbookRole | null>`.
- `requireScrapbookRole(allowed: readonly ScrapbookRole[]): RequestHandler`.
- `createScrapbook(ownerId: string, title: string): Promise<Scrapbook>`.
- `addEditor(scrapbookId: string, email: string): Promise<EditorMembership>`.
- `removeEditor(scrapbookId: string, membershipId: string): Promise<void>`.
- `linkPendingMemberships(userId: string, normalizedEmail: string): Promise<void>`.
- `getPublicSnapshot(shareToken: string): Promise<PublicScrapbookSnapshot | null>`.
- Routes: scrapbook create/load/update, share-link get/rotate/enable/disable, editor add/remove, and `GET /api/public/:shareToken`.

## Test-first implementation steps

- [ ] **Step 1: Write the failing role matrix.**

Cover owner mutations, editor mutations, editor add, editor removal rejection, owner removal, public read, public mutation rejection, pending membership linking, invalid collaborator emails, token rotation, and disabled tokens.

- [ ] **Step 2: Run the permission tests and verify missing-route failures.**

Run: `npm test --workspace server -- permissions.test.ts routes.test.ts public/routes.test.ts`

Expected: FAIL because scrapbook, membership, and public routes do not exist.

- [ ] **Step 3: Implement repositories, middleware, routes, and safe public snapshots.**

Generate cryptographically random share tokens and store active state. Return the raw token only through an authenticated share-link endpoint. Public snapshots must exclude user IDs, email addresses, password hashes, session data, and membership-management fields.

Call `normalizeAndValidateEmail` before adding or updating a membership. On successful registration or login, link pending memberships for the normalized email. Editors may add members, but only owners may remove them or change share-link state.

- [ ] **Step 4: Run the tests and verify the full matrix passes.**

Run: `npm test --workspace server -- permissions.test.ts routes.test.ts public/routes.test.ts`

Expected: PASS for owner, editor, public, pending-membership, invalid-email, share-token, and redaction behavior.

- [ ] **Step 5: Refactor after green.**

Keep permission checks reusable by album, media, theme, and sticker routes. Stop for human approval before Task 4.

**Acceptance criteria:** @docs/superpowers/subtasks/03-scrapbooks-sharing-and-permissions.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
