# Photo Scrapbook

Photo Scrapbook is a persistent, shareable scrapbook for photographs, videos, captions, locations, albums, collaborators, themes, and custom sticker decorations. The editor uses a warm field-journal visual language and the public route is read-only.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 14 or newer

The API uses PostgreSQL for users, sessions, scrapbooks, albums, media metadata, collaborators, share links, and sticker placements. Uploaded media and stickers are stored under `MEDIA_ROOT`; keep that directory across restarts and back it up with the database.

## Local setup

1. Create PostgreSQL databases named `moments` and `moments_test` (or `moments_e2e`) and a user with permission to create schemas and tables:

```sh
createdb moments
createdb moments_test
```

2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `E2E_DATABASE_URL`, and `MEDIA_ROOT` for your machine. `server/.env.example` contains the same API-specific template.
3. Install dependencies and apply migrations:

```sh
npm install
npm run db:migrate
```

4. Start the API and client:

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API health endpoint is [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Configuration

- `NODE_ENV`: `development`, `test`, or `production`.
- `PORT`: API port, default `3000`.
- `DATABASE_URL`: PostgreSQL connection string.
- `E2E_DATABASE_URL`: dedicated PostgreSQL connection string ending in `_test` or `_e2e`, used only by Playwright.
- `E2E_SCHEMA`: optional isolated Playwright schema name, defaulting to `moments_e2e`.
- `CLIENT_ORIGIN`: browser origin allowed by credentialed CORS, default `http://localhost:5173`.
- `MEDIA_ROOT`: persistent local media directory, default `./var/media`.
- `MAX_MEDIA_BYTES`: photo and video upload limit, default 250 MB.
- `MAX_STICKER_BYTES`: PNG, JPEG, and WebP sticker upload limit, default 10 MB.
- `SESSION_TTL_SECONDS`: session lifetime.

Production deployments should use a persistent S3-compatible storage adapter instead of an ephemeral local directory, terminate TLS at the edge, and keep the database and media backups coordinated.

## Verification commands

```sh
npm test
npm run build
npm run test --workspace server
npm run test --workspace client
```

The browser suite uses Playwright and starts the API and Vite client through the configured workspace commands. Install a browser once, then run it against the dedicated test database:

```sh
npx playwright install chromium
E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moments_test npm run test:e2e
```

The command creates and drops the `moments_e2e` schema and a temporary media directory for each run, and refuses to run against a database whose name does not end in `_test` or `_e2e`. The browser flows cover registration, owner and editor roles, editor removal, album creation, JPEG/MOV uploads, duplicate notices, captions, ordering, confirmed bulk moves, theme persistence, sticker placement, authenticated public preview, rejected public mutations, API restart persistence, public viewing without authentication, and full-viewport playback. Tests use unique accounts so a test run does not depend on browser local storage or a pre-seeded scrapbook.

## Security and data handling

Sessions are HTTP-only and credentialed API requests are scoped by scrapbook role. Public requests use an enabled share token and return only public scrapbook data. File routes require a valid session or enabled share token, and uploads are checked by MIME type, size, and file signature. Remote sticker URLs are not accepted.

See [docs/development.md](docs/development.md), [docs/architecture.md](docs/architecture.md), and [docs/security.md](docs/security.md) for the durable project guidance.
