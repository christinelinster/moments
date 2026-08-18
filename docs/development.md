# Development

## Prerequisites

- Node.js and npm compatible with the checked-in workspace dependencies.
- A running PostgreSQL instance reachable through `DATABASE_URL`.
- A persistent local media directory for development uploads.

## Configuration

Use `server/.env.example` as the environment-variable template. The current server configuration includes:

- `NODE_ENV`: `development`, `test`, or `production`.
- `PORT`: API port, defaulting to `3000`.
- `DATABASE_URL`: PostgreSQL connection string.
- `E2E_DATABASE_URL`: dedicated PostgreSQL connection string ending in `_test` or `_e2e`, used only by Playwright.
- `CLIENT_ORIGIN`: browser origin allowed for credentialed CORS requests.
- `MEDIA_ROOT`: local media-storage directory.
- `MAX_MEDIA_BYTES`: maximum photo/video upload size, defaulting to 250 MB.
- `MAX_STICKER_BYTES`: maximum sticker upload size, defaulting to 10 MB.
- `SESSION_TTL_SECONDS`: bounded session lifetime.

Environment files and runtime media are ignored by Git. Do not commit secrets or uploaded files.

## Commands

Run these commands from the repository root:

- `npm install`: install workspace dependencies.
- `npm run db:migrate`: apply server database migrations.
- `npm run dev`: start the API and Vite client together.
- `npm test`: run tests in each workspace that provides a test script.
- `npm run build`: build each workspace that provides a build script.
- `npm run test --workspace server`: run server tests only.
- `npm run test --workspace client`: run client tests only.
- `npm run build --workspace server`: build the server and copy migrations.
- `npm run build --workspace client`: type-check and build the client.
- `E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/moments_test npm run test:e2e`: run the isolated browser suite. The command creates and drops the `moments_e2e` schema and uses a temporary media directory. It refuses to run against a database whose name does not end in `_test` or `_e2e`.

## Verification expectations

- Run the smallest relevant workspace test command during task development.
- Run the full `npm test` and the relevant build command before claiming a cross-workspace task is complete.
- API changes should include server-level tests.
- React user flows should include browser-level verification when the browser workflow exists.
- The Playwright browser suite requires `E2E_DATABASE_URL`; it creates an isolated schema and temporary media root for each run.

## References

- Workspace scripts: @package.json
- Server scripts and dependencies: @server/package.json
- Environment template: @server/.env.example
- Server configuration: @server/src/config.ts
