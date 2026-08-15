# Photo Scrapbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real multi-user photo scrapbook with Express, React, Postgres-backed persistence, public share links, authenticated editing, media uploads, custom stickers, themes, and slideshow playback.

**Architecture:** Use an npm-workspaces monorepo with a TypeScript Express API and React/Vite client. The API uses `pg` with checked-in SQL migrations, opaque HTTP-only cookie sessions, and server-enforced owner/editor permissions. Media metadata and ordering live in Postgres; files use a local persistent storage adapter with an S3-compatible adapter boundary.

**Tech Stack:** TypeScript, Node.js, Express, React, Vite, PostgreSQL, `pg`, SQL migrations, `multer`, `zod`, Vitest, Supertest, React Testing Library, Playwright, CSS modules or scoped styles.

## Global Constraints

- Public visitors can view and play a scrapbook without signing in.
- Owners and editors must authenticate before mutations.
- Owners and editors can add editors; only owners can remove editors.
- Owners and editors can upload, caption, move, reorder, delete, theme, and decorate scrapbook content.
- Email input is trimmed, normalized to lowercase, and validated for syntax before storage or membership matching.
- Use `pg` and SQL migrations; do not add Prisma or another ORM.
- Use opaque HTTP-only cookie sessions backed by Postgres; do not store auth credentials in browser local storage.
- Use local disk storage for development and keep the storage interface compatible with S3-compatible production storage.
- Do not send invitation emails or fetch arbitrary remote sticker URLs.
- Use test-first development for every behavior change: write a failing test, run it, implement the smallest change, run the test again, then refactor.
- Work inline without sub-agents, git worktrees, commits, or staging. Stop for human approval between subtasks.
- Do not start application implementation until this plan has human approval.

---

## Repository layout

The implementation will create these boundaries:

- `package.json`: root workspace scripts for development, tests, build, migrations, and end-to-end verification.
- `server/`: Express API, Postgres access, migrations, authentication, authorization, file storage, and API tests.
- `client/`: React/Vite application, editor workspace, public viewer, playback, styles, and component tests.
- `e2e/`: Playwright browser flows that exercise the running client and API.
- `var/media/`: ignored local development storage directory created at runtime.
- `docs/superpowers/specs/`: approved design specification.
- `docs/superpowers/subtasks/`: approved subtask definitions.
- `docs/superpowers/plans/`: this implementation plan.

The server will use focused modules rather than a single route file:

```text
server/src/
  app.ts
  server.ts
  config.ts
  errors.ts
  db/
    pool.ts
    migrate.ts
    migrations/
  auth/
    email.ts
    password.ts
    sessions.ts
    middleware.ts
    routes.ts
  scrapbooks/
    permissions.ts
    repository.ts
    membership-repository.ts
    routes.ts
  albums/
    repository.ts
    routes.ts
  media/
    validation.ts
    repository.ts
    routes.ts
  stickers/
    repository.ts
    routes.ts
  public/
    routes.ts
  storage/
    storage.ts
    local-storage.ts
```

The client will use feature folders:

```text
client/src/
  main.tsx
  app.tsx
  api/http.ts
  auth/
  scrapbook/
  collaborators/
  stickers/
  public/
  components/
  styles/
```

## Task plan files

Each implementation task is also maintained as a standalone plan so it can be executed and reviewed independently:

1. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-01-foundation.md
2. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-02-authentication.md
3. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-03-sharing-permissions.md
4. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-04-media-api.md
5. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-05-editor-workspace.md
6. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-06-collaborators-themes.md
7. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-07-stickers.md
8. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-08-public-playback.md
9. @docs/superpowers/plans/2026-08-15-photo-scrapbook-task-09-verification.md

## Task 1: Application foundation and database

**Files:**

- Create: `package.json`, `tsconfig.base.json`, `.env.example`, `.gitignore` additions.
- Create: `server/package.json`, `server/tsconfig.json`.
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`.
- Create: `server/src/config.ts`, `server/src/errors.ts`, `server/src/db/pool.ts`, `server/src/db/migrate.ts`, `server/src/app.ts`, `server/src/server.ts`.
- Create: `server/src/db/migrations/001_initial_schema.sql`.
- Create: `server/src/storage/storage.ts` and `server/src/storage/local-storage.ts`.
- Create: `server/src/test/test-database.ts`, `server/src/test/test-storage.ts`, `server/src/foundation/foundation.test.ts`.

**Interfaces:**

- `loadConfig(env: NodeJS.ProcessEnv): AppConfig` returns typed database, server, client, storage, cookie, and upload configuration.
- `createPool(config: AppConfig): Pool` creates the shared `pg` connection pool.
- `runMigrations(pool: Pool): Promise<void>` applies ordered SQL files exactly once using a `schema_migrations` table.
- `type AppDependencies = { db: Pool; storage: MediaStorage }` defines the minimum injectable app dependencies used by tests.
- `createApp(dependencies: AppDependencies): Express` returns the testable Express app without listening on a port.
- `MediaStorage.put(input: StoragePutInput): Promise<StoredObject>`, `get(key: string): Promise<NodeJS.ReadableStream>`, and `delete(key: string): Promise<void>` define storage behavior.

- [ ] **Step 1: Write the failing foundation test.**

```ts
import request from "supertest";
import { createApp } from "../app";

it("reports API and database health", async () => {
  const app = createApp({ db: testPool, storage: testStorage });

  const response = await request(app).get("/api/health");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ok: true, database: "up" });
});
```

- [ ] **Step 2: Run the foundation test and verify it fails for the missing foundation.**

Run: `npm test --workspace server -- foundation.test.ts`

Expected: FAIL because the app factory and health route do not exist yet.

- [ ] **Step 3: Create the workspace, configuration, database pool, migration runner, initial schema, storage interface, and health route.**

The initial schema must define `users`, `sessions`, `scrapbooks`, `scrapbook_editors`, `albums`, `media_items`, `sticker_assets`, and `sticker_placements`. Use UUID primary keys, timestamp columns, foreign keys, normalized email uniqueness, role-safe membership constraints, album/media ordering fields, and the relationships in the approved design. Add a `schema_migrations` table and use a transaction per migration.

The local storage adapter must resolve keys beneath the configured media root, reject path traversal, create the directory when needed, and stream files through the interface rather than exposing the directory as a public static route.

- [ ] **Step 4: Run the foundation tests and build.**

Run: `npm test --workspace server -- foundation.test.ts`

Expected: PASS with the health response and migration assertions.

Run: `npm run build`

Expected: PASS for both client and server TypeScript builds.

- [ ] **Step 5: Refactor only after green.**

Confirm configuration errors are actionable, the migration runner is idempotent, and `var/media/` is ignored by Git. Do not add application behavior from later tasks.

## Task 2: Authentication and sessions

**Files:**

- Create: `server/src/auth/email.ts`, `server/src/auth/password.ts`, `server/src/auth/sessions.ts`, `server/src/auth/middleware.ts`, `server/src/auth/routes.ts`, `server/src/auth/types.ts`.
- Modify: `server/src/app.ts` to mount `/api/auth` and the authenticated request context.
- Create: `server/src/auth/email.test.ts`, `server/src/auth/routes.test.ts`, `server/src/auth/sessions.test.ts`.

**Interfaces:**

- `normalizeAndValidateEmail(input: unknown): string` trims, lowercases, validates, and throws a typed validation error.
- `hashPassword(password: string): Promise<string>` returns a salted password hash using Node’s built-in `crypto.scrypt`.
- `verifyPassword(password: string, encodedHash: string): Promise<boolean>` verifies the encoded hash with constant-time comparison.
- `createSession(userId: string): Promise<{ token: string; expiresAt: Date }>` stores a hash of the opaque token and returns the raw token only to the cookie writer.
- `requireSession: RequestHandler` attaches `req.auth.userId` or returns `401`.

- [ ] **Step 1: Write failing email and authentication tests.**

```ts
import { normalizeAndValidateEmail } from "./email";

it.each([
  "missing-at.example.com",
  "person@",
  "@example.com",
  "person with space@example.com",
  "person@example..com",
  "person@-example.com",
])("rejects invalid email input: %s", (email) => {
  expect(() => normalizeAndValidateEmail(email)).toThrow();
});

it("normalizes a valid email before storage", () => {
  expect(normalizeAndValidateEmail("  Person@Example.com ")).toBe("person@example.com");
});
```

- [ ] **Step 2: Run the tests and verify they fail because the validators and routes do not exist.**

Run: `npm test --workspace server -- email.test.ts routes.test.ts sessions.test.ts`

Expected: FAIL with missing module or missing route behavior.

- [ ] **Step 3: Implement email validation, password hashing, session persistence, cookie parsing, and auth routes.**

Email validation must require exactly one `@`, a non-empty local part and domain, no whitespace or control characters, no consecutive dots, a local part no longer than 64 characters, a total address no longer than 254 characters, and domain labels that do not begin or end with a hyphen or dot and do not exceed 63 characters. Do not perform DNS or delivery checks.

Implement:

- `POST /api/auth/register` with `{ email, password }`.
- `POST /api/auth/login` with `{ email, password }`.
- `POST /api/auth/logout`.
- `GET /api/auth/me`.

Use an opaque random token in an HTTP-only cookie. Store only its SHA-256 hash, user ID, expiry, created timestamp, and optional revocation timestamp in Postgres. Configure `Secure` in production, `SameSite=Lax`, and a bounded `Max-Age`.

- [ ] **Step 4: Run the authentication tests and verify they pass.**

Run: `npm test --workspace server -- email.test.ts routes.test.ts sessions.test.ts`

Expected: PASS for valid and invalid email input, registration, login, logout, current-session loading, duplicate emails, invalid credentials, expired sessions, and protected-route rejection.

- [ ] **Step 5: Refactor after green.**

Keep password and cookie handling behind focused modules. Ensure error responses do not reveal whether an email exists during login.

## Task 3: Scrapbooks, sharing, and editor permissions

**Files:**

- Create: `server/src/scrapbooks/permissions.ts`, `server/src/scrapbooks/repository.ts`, `server/src/scrapbooks/membership-repository.ts`, `server/src/scrapbooks/routes.ts`, `server/src/public/routes.ts`.
- Modify: `server/src/auth/routes.ts` to link pending memberships after successful registration and login.
- Modify: `server/src/app.ts` to mount scrapbook and public routes.
- Create: `server/src/scrapbooks/permissions.test.ts`, `server/src/scrapbooks/routes.test.ts`, `server/src/public/routes.test.ts`.

**Interfaces:**

- `type ScrapbookRole = "owner" | "editor"`.
- `getScrapbookRole(userId: string, scrapbookId: string): Promise<ScrapbookRole | null>`.
- `requireScrapbookRole(allowed: readonly ScrapbookRole[]): RequestHandler`.
- `createScrapbook(ownerId: string, title: string): Promise<Scrapbook>`.
- `addEditor(scrapbookId: string, email: string): Promise<EditorMembership>`.
- `removeEditor(scrapbookId: string, membershipId: string): Promise<void>`.
- `linkPendingMemberships(userId: string, normalizedEmail: string): Promise<void>`.
- `getPublicSnapshot(shareToken: string): Promise<PublicScrapbookSnapshot | null>`.

- [ ] **Step 1: Write failing permission-matrix tests.**

```ts
it("allows an editor to add an editor but rejects editor removal", async () => {
  const editorSession = await signInAs(editorUser);

  const addResponse = await request(app)
    .post(`/api/scrapbooks/${scrapbook.id}/editors`)
    .set("Cookie", editorSession.cookie)
    .send({ email: "new-editor@example.com" });

  const removeResponse = await request(app)
    .delete(`/api/scrapbooks/${scrapbook.id}/editors/${membership.id}`)
    .set("Cookie", editorSession.cookie);

  expect(addResponse.status).toBe(201);
  expect(removeResponse.status).toBe(403);
});
```

- [ ] **Step 2: Run the permission tests and verify they fail because scrapbook and membership routes do not exist.**

Run: `npm test --workspace server -- permissions.test.ts routes.test.ts public/routes.test.ts`

Expected: FAIL with missing route or permission behavior.

- [ ] **Step 3: Implement scrapbook creation, public share tokens, membership persistence, role middleware, and safe public snapshots.**

Implement:

- `POST /api/scrapbooks`.
- `GET /api/scrapbooks/:scrapbookId`.
- `PATCH /api/scrapbooks/:scrapbookId` for title and public-link state.
- `GET /api/scrapbooks/:scrapbookId/share-link`.
- `POST /api/scrapbooks/:scrapbookId/share-link/rotate`.
- `POST /api/scrapbooks/:scrapbookId/share-link/enable`.
- `POST /api/scrapbooks/:scrapbookId/share-link/disable`.
- `POST /api/scrapbooks/:scrapbookId/editors`.
- `DELETE /api/scrapbooks/:scrapbookId/editors/:membershipId`.
- `GET /api/public/:shareToken`.

The public token must be cryptographically random, stored with its active state, and returned only through an authenticated share-link endpoint. Public snapshots must exclude user IDs, email addresses, password hashes, session data, and membership-management fields. Call the shared email validator before creating or updating memberships.

When registration or login succeeds, update pending memberships for the normalized user email. Owner removal must be checked independently from editor add permission.

- [ ] **Step 4: Run the permission tests and verify they pass.**

Run: `npm test --workspace server -- permissions.test.ts routes.test.ts public/routes.test.ts`

Expected: PASS for owner/editor/public access, pending membership linking, invalid collaborator emails, share-token rotation and disablement, and public-data redaction.

- [ ] **Step 5: Refactor after green.**

Make role checks reusable by albums, media, themes, and stickers. Keep all permission decisions on the server even if the client hides controls.

## Task 4: Albums, media uploads, and organization API

**Files:**

- Create: `server/src/albums/repository.ts`, `server/src/albums/routes.ts`.
- Create: `server/src/media/validation.ts`, `server/src/media/repository.ts`, `server/src/media/routes.ts`.
- Modify: `server/src/storage/storage.ts` and `server/src/storage/local-storage.ts` if the foundation interface needs streaming or temp-file support.
- Modify: `server/src/public/routes.ts` to include safe media metadata and file references.
- Modify: `server/src/app.ts` to mount album and media routes.
- Create: `server/src/albums/routes.test.ts`, `server/src/media/validation.test.ts`, `server/src/media/routes.test.ts`.

**Interfaces:**

- `validateUploadedFile(file: UploadedFile, kind: "media" | "sticker"): Promise<ValidatedUpload>`.
- `listAlbums(scrapbookId: string): Promise<Album[]>`.
- `reorderAlbums(scrapbookId: string, orderedIds: string[]): Promise<void>`.
- `listMedia(scrapbookId: string, albumId?: string | null): Promise<MediaItem[]>`.
- `reorderMedia(scrapbookId: string, albumId: string | null, orderedIds: string[]): Promise<void>`.
- `bulkMoveMedia(scrapbookId: string, mediaIds: string[], albumId: string | null): Promise<void>`.
- `deleteMedia(scrapbookId: string, mediaIds: string[]): Promise<void>`.

- [ ] **Step 1: Write failing upload, album, ordering, and bulk-action tests.**

```ts
it("persists a valid upload and rejects an unsupported file", async () => {
  const response = await request(app)
    .post(`/api/scrapbooks/${scrapbook.id}/media`)
    .set("Cookie", editorCookie)
    .attach("file", Buffer.from("not-a-real-executable"), {
      filename: "bad.exe",
      contentType: "application/x-msdownload",
    });

  expect(response.status).toBe(415);
});

it("reorders media inside one album transactionally", async () => {
  const response = await request(app)
    .post(`/api/scrapbooks/${scrapbook.id}/media/reorder`)
    .set("Cookie", editorCookie)
    .send({ albumId: album.id, orderedIds: [second.id, first.id] });

  expect(response.status).toBe(204);
  expect(await listMedia(scrapbook.id, album.id)).toMatchObject([
    { id: second.id, position: 0 },
    { id: first.id, position: 1 },
  ]);
});
```

- [ ] **Step 2: Run the tests and verify they fail because album/media routes and storage writes do not exist.**

Run: `npm test --workspace server -- albums/routes.test.ts media/validation.test.ts media/routes.test.ts`

Expected: FAIL with missing route, validation, or repository behavior.

- [ ] **Step 3: Implement album CRUD, media upload validation, storage writes, metadata updates, ordering, moves, bulk actions, and deletion.**

Implement:

- `GET /api/scrapbooks/:scrapbookId/albums`.
- `POST /api/scrapbooks/:scrapbookId/albums`.
- `PATCH /api/scrapbooks/:scrapbookId/albums/:albumId`.
- `POST /api/scrapbooks/:scrapbookId/albums/reorder`.
- `DELETE /api/scrapbooks/:scrapbookId/albums/:albumId`.
- `GET /api/scrapbooks/:scrapbookId/media`.
- `POST /api/scrapbooks/:scrapbookId/media` using multipart field `file`.
- `PATCH /api/scrapbooks/:scrapbookId/media/:mediaId` for caption, location, and album assignment.
- `POST /api/scrapbooks/:scrapbookId/media/reorder`.
- `POST /api/scrapbooks/:scrapbookId/media/bulk-move`.
- `DELETE /api/scrapbooks/:scrapbookId/media` with `{ mediaIds: string[] }`.
- `GET /api/files/:storageKey` only after checking the scrapbook relationship.

Allow the configured photo/video MIME types and inspect file signatures where supported. Use a configurable default media limit of 250 MB and return `413` for oversized files. Use a separate 10 MB limit for sticker uploads in Task 7. On successful upload, write the file first, then create the database row; if the database write fails, remove the orphaned file. On deletion, remove the database row and storage object as one reported operation, with a retryable error when cleanup cannot complete.

Use Postgres transactions for album deletion, album/media moves, reordering, and bulk operations. Reindex positions from zero within each album and within the unassigned set.

- [ ] **Step 4: Run the album and media tests and verify they pass.**

Run: `npm test --workspace server -- albums/routes.test.ts media/validation.test.ts media/routes.test.ts`

Expected: PASS for valid and invalid uploads, album behavior, metadata updates, ordering, bulk move/delete, persistence, file access, and authorization.

- [ ] **Step 5: Refactor after green.**

Keep file validation, storage, repository transactions, and HTTP response formatting in separate modules. Do not serve the storage directory as a static folder.

## Task 5: Authenticated editor workspace

**Files:**

- Create: `client/src/main.tsx`, `client/src/app.tsx`, `client/src/api/http.ts`.
- Create: `client/src/auth/AuthProvider.tsx`, `client/src/auth/AuthPage.tsx`, `client/src/auth/auth-api.ts`.
- Create: `client/src/scrapbook/ScrapbookWorkspace.tsx`, `client/src/scrapbook/AlbumDrawer.tsx`, `client/src/scrapbook/MediaGrid.tsx`, `client/src/scrapbook/MediaCard.tsx`, `client/src/scrapbook/MediaDetailsPanel.tsx`, `client/src/scrapbook/UploadDropzone.tsx`, `client/src/scrapbook/AllMemoriesToolbar.tsx`, `client/src/scrapbook/scrapbook-api.ts`.
- Create: `client/src/components/Button.tsx`, `client/src/components/Modal.tsx`, `client/src/components/Toast.tsx`, `client/src/components/EmptyState.tsx`.
- Create: `client/src/styles/tokens.css`, `client/src/styles/global.css`, `client/src/styles/scrapbook.css`.
- Create: `client/src/auth/AuthProvider.test.tsx`, `client/src/scrapbook/ScrapbookWorkspace.test.tsx`, `client/src/scrapbook/MediaGrid.test.tsx`.

**Interfaces:**

- `apiFetch<T>(path: string, options?: RequestInit): Promise<T>` always sends credentials and converts API errors into typed client errors.
- `AuthProvider` exposes `{ user, status, signIn, signOut, register }`.
- `ScrapbookWorkspace` consumes `ScrapbookSnapshot` and exposes album, media, and selection actions through feature hooks.
- `MediaCardProps` includes `media`, `selected`, `onSelect`, `onOpenDetails`, `onMove`, and `onDelete`.
- `UploadDropzoneProps` includes `scrapbookId`, `albumId`, `accept`, `onUploaded`, and `onError`.

- [ ] **Step 1: Write failing component tests for auth gating, workspace regions, selection, and upload state.**

```tsx
it("renders the editor shell for an authenticated user", async () => {
  render(<App initialUser={userFixture} initialScrapbook={scrapbookFixture} />);

  expect(await screen.findByRole("navigation", { name: /memory drawer/i })).toBeVisible();
  expect(screen.getByRole("region", { name: /scrapbook spread/i })).toBeVisible();
  expect(screen.getByRole("complementary", { name: /media details/i })).toBeVisible();
});
```

- [ ] **Step 2: Run client tests and verify they fail because the app components do not exist.**

Run: `npm test --workspace client -- AuthProvider.test.tsx ScrapbookWorkspace.test.tsx MediaGrid.test.tsx`

Expected: FAIL with missing components or missing interaction behavior.

- [ ] **Step 3: Implement the client shell, auth screens, API client, album drawer, media grid, upload flow, details panel, and All memories selection.**

Use the approved field-journal visual direction: ink navy desk, warm paper, pool blue, marigold, persimmon, and lavender accents; serif display type with a system sans-serif interface; paper tabs, restrained tape, and media-first spacing. Keep the central album canvas distinct from the dense All memories view.

The API client must use `credentials: "include"`, handle `401` by returning the app to auth, and surface server validation errors. Drag-and-drop must have keyboard and touch move alternatives. Selection state must be cleared or updated deterministically after bulk actions.

- [ ] **Step 4: Run client tests and verify they pass.**

Run: `npm test --workspace client -- AuthProvider.test.tsx ScrapbookWorkspace.test.tsx MediaGrid.test.tsx`

Expected: PASS for auth gating, workspace layout, upload state, caption editing, album navigation, selection, bulk action wiring, and accessible focus states.

- [ ] **Step 5: Refactor after green.**

Keep API calls out of presentational cards, preserve the server as the source of truth, and add loading, empty, permission, and upload-error states without changing approved behavior.

## Task 6: Collaborators, sharing controls, and themes

**Files:**

- Create: `client/src/collaborators/CollaboratorPanel.tsx`, `client/src/collaborators/ShareLinkPanel.tsx`, `client/src/collaborators/collaborator-api.ts`.
- Create: `client/src/scrapbook/ThemePicker.tsx`, `client/src/styles/theme-presets.ts`.
- Modify: `server/src/scrapbooks/routes.ts` and `server/src/scrapbooks/repository.ts` for theme updates and safe link controls if not completed in Task 3.
- Modify: `client/src/scrapbook/ScrapbookWorkspace.tsx` to mount collaborator and theme controls.
- Create: `client/src/collaborators/CollaboratorPanel.test.tsx`, `client/src/scrapbook/ThemePicker.test.tsx`, `server/src/scrapbooks/theme-routes.test.ts`.

**Interfaces:**

- `ThemeKey = "field-journal" | "poolside" | "citrus-notebook" | "moonlight-ink"`.
- `ThemePickerProps` includes `value: ThemeKey`, `canEdit: boolean`, and `onChange(theme: ThemeKey): Promise<void>`.
- `CollaboratorPanelProps` includes `members`, `currentRole`, `canRemove`, `onAdd`, and `onRemove`.
- `ShareLinkPanel` exposes copy, rotate, enable, and disable actions only when the current user is the owner.

- [ ] **Step 1: Write failing UI and API tests for theme persistence and role-specific collaborator controls.**

```tsx
it("does not render remove controls for an editor", () => {
  render(<CollaboratorPanel currentRole="editor" members={membersFixture} />);

  expect(screen.queryByRole("button", { name: /remove editor/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /add editor/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the tests and verify they fail because the controls and theme endpoint do not exist.**

Run: `npm test --workspace client -- CollaboratorPanel.test.tsx ThemePicker.test.tsx`

Run: `npm test --workspace server -- theme-routes.test.ts`

Expected: FAIL with missing controls or missing persistence behavior.

- [ ] **Step 3: Implement theme persistence, collaborator UI, share-link controls, and four theme presets.**

Implement `PATCH /api/scrapbooks/:scrapbookId/theme` with the validated `ThemeKey` values. Owners and editors can update the theme. Only owners can remove memberships and change share-link state. Owners and editors can add memberships. Reuse the email validator from Task 2.

The client must render the active theme using CSS custom properties, persist the selected key through the API, and reflect the active theme in the editor. The collaborator panel must distinguish pending and linked memberships without exposing private data to public viewers.

- [ ] **Step 4: Run the tests and verify they pass.**

Run: `npm test --workspace client -- CollaboratorPanel.test.tsx ThemePicker.test.tsx`

Run: `npm test --workspace server -- theme-routes.test.ts`

Expected: PASS for role-specific controls, adding/removing members, invalid email errors, theme selection, theme reload, and owner-only link lifecycle actions.

- [ ] **Step 5: Refactor after green.**

Keep role checks on the API even when the client hides a control. Keep theme values as a small validated enum instead of accepting arbitrary CSS from users.

## Task 7: Custom stickers and scrapbook decorations

**Files:**

- Create: `server/src/stickers/repository.ts`, `server/src/stickers/routes.ts`, `server/src/stickers/routes.test.ts`.
- Create: `client/src/stickers/StickerTray.tsx`, `client/src/stickers/StickerCanvasLayer.tsx`, `client/src/stickers/sticker-api.ts`, `client/src/stickers/StickerTray.test.tsx`, `client/src/stickers/StickerCanvasLayer.test.tsx`.
- Modify: `server/src/public/routes.ts` to include public sticker assets and placements.
- Modify: `client/src/scrapbook/ScrapbookWorkspace.tsx` to mount the sticker tray and canvas layer.

**Interfaces:**

- `StickerAsset` includes `id`, `scrapbookId`, `storageKey`, `mimeType`, `byteSize`, and `createdAt`.
- `StickerPlacement` includes `id`, `albumId`, `assetId`, `x`, `y`, `scale`, `rotation`, and `layer`.
- `StickerCanvasLayerProps` includes `placements`, `assets`, `editable`, `onChange`, and `onDelete`.
- `buildStickerPlacement(input: NewStickerPlacement): StickerPlacement` creates normalized position, scale, rotation, and layer values.

- [ ] **Step 1: Write failing API and component tests for sticker upload, placement, transform, layer, and delete.**

```ts
it("rejects a remote sticker URL and accepts an uploaded PNG", async () => {
  const remote = await request(app)
    .post(`/api/scrapbooks/${scrapbook.id}/stickers`)
    .set("Cookie", editorCookie)
    .send({ url: "https://example.com/sticker.png" });

  const upload = await request(app)
    .post(`/api/scrapbooks/${scrapbook.id}/stickers`)
    .set("Cookie", editorCookie)
    .attach("file", pngFixture, { filename: "star.png", contentType: "image/png" });

  expect(remote.status).toBe(400);
  expect(upload.status).toBe(201);
});
```

- [ ] **Step 2: Run the tests and verify they fail because sticker routes and placement components do not exist.**

Run: `npm test --workspace server -- stickers/routes.test.ts`

Run: `npm test --workspace client -- StickerTray.test.tsx StickerCanvasLayer.test.tsx`

Expected: FAIL with missing sticker behavior.

- [ ] **Step 3: Implement sticker asset uploads, placement CRUD, transforms, layer ordering, and the editor sticker tray/canvas.**

Implement:

- `GET /api/scrapbooks/:scrapbookId/stickers`.
- `POST /api/scrapbooks/:scrapbookId/stickers` using multipart field `file`.
- `DELETE /api/scrapbooks/:scrapbookId/stickers/:assetId`.
- `POST /api/scrapbooks/:scrapbookId/albums/:albumId/sticker-placements`.
- `PATCH /api/scrapbooks/:scrapbookId/albums/:albumId/sticker-placements/:placementId`.
- `DELETE /api/scrapbooks/:scrapbookId/albums/:albumId/sticker-placements/:placementId`.
- `POST /api/scrapbooks/:scrapbookId/albums/:albumId/sticker-placements/reorder`.

Validate PNG, JPEG, and WebP uploads with a default 10 MB sticker limit. Store placements in normalized album-relative percentages and bounded scale/rotation values so different viewport sizes render the same composition. Support pointer drag, keyboard nudge, resize handles, rotate controls, layer actions, and delete. Use `aria-label` values for transform controls.

- [ ] **Step 4: Run the tests and verify they pass.**

Run: `npm test --workspace server -- stickers/routes.test.ts`

Run: `npm test --workspace client -- StickerTray.test.tsx StickerCanvasLayer.test.tsx`

Expected: PASS for accepted/rejected uploads, placement persistence, transforms, layer order, deletion, role enforcement, and public-read data.

- [ ] **Step 5: Refactor after green.**

Keep sticker assets separate from photos/videos so All memories and playback sequences do not treat stickers as media items. Keep public rendering read-only.

## Task 8: Public viewer and slideshow playback

**Files:**

- Create: `client/src/public/PublicScrapbookPage.tsx`, `client/src/public/PublicAlbumView.tsx`, `client/src/public/public-api.ts`.
- Create: `client/src/public/PlaybackPlayer.tsx`, `client/src/public/usePlayback.ts`, `client/src/public/playback-sequence.ts`, `client/src/public/PlaybackPlayer.test.tsx`, `client/src/public/playback-sequence.test.ts`.
- Create: `client/src/styles/public.css`, `client/src/styles/playback.css`.
- Modify: `client/src/app.tsx` to route `/shared/:shareToken` without authentication.
- Modify: `server/src/public/routes.ts` to return ordered media, albums, themes, captions, locations, sticker assets, and placements.

**Interfaces:**

- `buildPlaybackSequence(snapshot: PublicScrapbookSnapshot, scope: "album" | "all", albumId?: string): PlaybackItem[]`.
- `usePlayback(items: PlaybackItem[], options: { photoDurationMs: number }): PlaybackController`.
- `PlaybackController` exposes `currentIndex`, `isPlaying`, `play`, `pause`, `next`, `previous`, `replay`, and `exit`.
- `PlaybackItem` includes media ID, media type, source URL, caption, location, album ID, album name, and sticker placements.

- [ ] **Step 1: Write failing sequence and player tests.**

```ts
it("builds full-book playback in album order, then media order", () => {
  const sequence = buildPlaybackSequence(snapshotFixture, "all");

  expect(sequence.map((item) => item.id)).toEqual([
    "album-one-photo",
    "album-one-video",
    "album-two-photo",
    "unassigned-photo",
  ]);
});

it("advances a photo after five seconds", () => {
  vi.useFakeTimers();
  const controller = renderPlaybackHook(photoItems);

  controller.play();
  vi.advanceTimersByTime(5000);

  expect(controller.currentIndex).toBe(1);
});
```

- [ ] **Step 2: Run the tests and verify they fail because public routes, sequence building, and player behavior do not exist.**

Run: `npm test --workspace client -- playback-sequence.test.ts PlaybackPlayer.test.tsx`

Expected: FAIL with missing sequence or playback behavior.

- [ ] **Step 3: Implement the unauthenticated public route, cover, album browsing, ordered playback, video handling, controls, captions, locations, themes, stickers, and page-turn transitions.**

The public page must not mount authenticated editor providers or send mutation requests. The playback sequence must sort albums by album position, media by media position, and append unassigned media. Photos use a default 5000 ms timer. Videos advance on `ended`; playback begins from a user gesture so browser autoplay restrictions are respected. The player must stop at the final item and expose Replay and Exit.

Use `prefers-reduced-motion` to remove or reduce page-turn animation. Keep controls keyboard reachable and label previous, next, play/pause, progress, and exit actions. Use the stored media source through the safe file endpoint.

- [ ] **Step 4: Run the tests and verify they pass.**

Run: `npm test --workspace client -- playback-sequence.test.ts PlaybackPlayer.test.tsx`

Expected: PASS for public navigation, sequence ordering, photo timer, video end behavior, controls, captions, stickers, final state, replay, exit, and reduced motion.

- [ ] **Step 5: Refactor after green.**

Keep sequence construction pure and independently testable. Keep public rendering read-only and do not duplicate editor data models.

## Task 9: Final verification and handoff

**Files:**

- Create: `playwright.config.ts`, `e2e/auth.spec.ts`, `e2e/editor.spec.ts`, `e2e/public-viewer.spec.ts`, `e2e/media-and-playback.spec.ts`.
- Create or modify: `README.md`, `.env.example`, `server/scripts/test-database.ts`, `client/src/test/test-fixtures.ts`, `server/src/test/test-fixtures.ts`.
- Modify: root `package.json` scripts only as needed for reproducible verification.

**Interfaces:**

- `npm run db:migrate` applies migrations to `DATABASE_URL`.
- `npm test` runs server and client unit/component tests.
- `npm run build` creates production client and server output.
- `npm run test:e2e` starts the configured app against a test database and runs Playwright flows.

- [ ] **Step 1: Write failing end-to-end smoke tests for the approved primary flows.**

```ts
test("owner creates a scrapbook and public visitor can play it without login", async ({ page, browser }) => {
  await registerAndCreateScrapbook(page);
  await uploadFixture(page, "photo.jpg");
  const shareUrl = await copyShareUrl(page);

  const publicPage = await browser.newPage();
  await publicPage.goto(shareUrl);

  await expect(publicPage.getByRole("button", { name: /play scrapbook/i })).toBeVisible();
  await expect(publicPage.getByRole("button", { name: /sign in/i })).not.toBeVisible();
});
```

- [ ] **Step 2: Run the end-to-end tests and verify they fail until the complete app is running.**

Run: `npm run test:e2e`

Expected: FAIL only for missing end-to-end flows or incomplete setup, with actionable output.

- [ ] **Step 3: Implement test fixtures, test database lifecycle, startup scripts, README setup, and any verified defects found by the smoke tests.**

Document Node version, environment variables, Postgres setup, migration command, development startup, persistent `var/media` behavior, test command, build command, and production storage adapter configuration. Ensure the e2e runner creates isolated users and a clean test database or schema per run.

The e2e suite must cover registration, owner creation, editor addition, editor restrictions, public access without login, upload, album organization, captions, bulk move/delete, themes, stickers, deletion, refresh persistence, server restart persistence when storage is retained, and playback.

- [ ] **Step 4: Run the full verification suite.**

Run: `npm test`

Expected: PASS with zero unit, API, and component test failures.

Run: `npm run build`

Expected: PASS with production client and server artifacts.

Run: `npm run test:e2e`

Expected: PASS for all browser flows.

- [ ] **Step 5: Review the final diff and hand off without committing or staging.**

Check that the implementation remains within the approved design and subtasks, that no secrets or uploaded files are tracked, and that the final diff is shown to the human. Wait for human direction before any commit or integration step.

## Plan self-review

### Spec coverage

- Authentication, email validation, and sessions are covered by Task 2.
- Scrapbook creation, public link lifecycle, editor membership, and permissions are covered by Task 3.
- Albums, uploads, captions, locations, ordering, bulk actions, and deletion are covered by Task 4 and Task 5.
- Theme presets and persisted theme changes are covered by Task 6.
- Custom uploaded stickers and placements are covered by Task 7.
- Public browsing, album/full playback, video behavior, captions, stickers, page turns, Replay, Exit, responsive behavior, and reduced motion are covered by Task 8.
- Persistence, storage adapters, API security, and server-side role checks are covered by Tasks 1 through 4 and verified by Task 9.
- No email delivery, live collaboration, remote URL fetching, native app, transcoding, or chat is introduced.

### Type and interface consistency

- Task 1 defines `AppConfig`, `Pool`, `createApp`, `runMigrations`, and `MediaStorage`, which are consumed by later server tasks.
- Task 2 defines normalized email and session behavior consumed by membership and protected routes.
- Task 3 defines `ScrapbookRole`, `requireScrapbookRole`, membership linking, and public snapshots consumed by Tasks 4 through 8.
- Task 4 defines album/media repositories and storage behavior consumed by the editor and public viewer.
- Task 6 defines `ThemeKey`, which is used by scrapbook persistence and the client theme picker.
- Task 7 defines `StickerAsset` and `StickerPlacement`, which are included in public snapshots and playback items in Task 8.
- Task 8 defines `PlaybackItem` and `PlaybackController`, which are tested independently from the public page.

### Final scope scan

No unresolved implementation gaps remain. The plan does not authorize commits, staging, sub-agents, worktrees, or implementation before human approval.
