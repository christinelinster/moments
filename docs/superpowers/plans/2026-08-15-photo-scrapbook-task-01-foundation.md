# Task 1: Application Foundation and Database Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Establish the TypeScript client/server workspace, Express health route, Postgres connection, SQL migration runner, initial schema, and persistent local storage boundary.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/01-application-foundation.md

**Dependencies:** None.

## Files

- Create: `package.json`, `tsconfig.base.json`, `.env.example`, `.gitignore` additions.
- Create: `server/package.json`, `server/tsconfig.json`.
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`.
- Create: `server/src/config.ts`, `server/src/errors.ts`, `server/src/db/pool.ts`, `server/src/db/migrate.ts`, `server/src/app.ts`, `server/src/server.ts`.
- Create: `server/src/db/migrations/001_initial_schema.sql`.
- Create: `server/src/storage/storage.ts`, `server/src/storage/local-storage.ts`.
- Create: `server/src/test/test-database.ts`, `server/src/test/test-storage.ts`, `server/src/foundation/foundation.test.ts`.

## Interfaces

- `loadConfig(env: NodeJS.ProcessEnv): AppConfig` returns typed database, server, client, storage, cookie, and upload configuration.
- `createPool(config: AppConfig): Pool` creates the shared `pg` pool.
- `runMigrations(pool: Pool): Promise<void>` applies ordered SQL files once through `schema_migrations`.
- `type AppDependencies = { db: Pool; storage: MediaStorage }` defines testable app dependencies.
- `createApp(dependencies: AppDependencies): Express` returns an app without listening.
- `MediaStorage.put(input: StoragePutInput): Promise<StoredObject>` writes an object.
- `MediaStorage.get(key: string): Promise<NodeJS.ReadableStream>` reads an object.
- `MediaStorage.delete(key: string): Promise<void>` deletes an object.

## Test-first implementation steps

- [ ] **Step 1: Write the failing health test.**

```ts
it("reports API and database health", async () => {
  const app = createApp({ db: testPool, storage: testStorage });
  const response = await request(app).get("/api/health");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ ok: true, database: "up" });
});
```

- [ ] **Step 2: Run the test and verify the missing foundation failure.**

Run: `npm test --workspace server -- foundation.test.ts`

Expected: FAIL because the app factory and health route do not exist.

- [ ] **Step 3: Implement the workspace and foundation.**

Create npm workspaces, TypeScript configs, typed environment loading, the `pg` pool, the migration runner, the health route, the local storage adapter, and the initial schema. The schema must include users, sessions, scrapbooks, editor memberships, albums, media items, sticker assets, sticker placements, foreign keys, normalized email uniqueness, role-safe membership constraints, timestamps, and ordering fields.

The migration runner must create `schema_migrations`, apply files in lexical order inside transactions, and skip already-applied files. The local storage adapter must keep all resolved paths beneath the configured media root, reject traversal, create the directory, and never expose it as a public static directory.

- [ ] **Step 4: Run the foundation tests and build.**

Run: `npm test --workspace server -- foundation.test.ts`

Expected: PASS for health and migration assertions.

Run: `npm run build`

Expected: PASS for client and server builds.

- [ ] **Step 5: Refactor after green.**

Confirm startup errors identify missing environment values, migrations are idempotent, and `var/media/` is ignored. Stop and show the diff for human approval before Task 2.

**Acceptance criteria:** @docs/superpowers/subtasks/01-application-foundation.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
