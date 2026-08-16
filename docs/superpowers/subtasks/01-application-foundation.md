# Subtask 1: Application Foundation and Database

## Task

Create the TypeScript application foundation for the React/Vite client and Express API. Establish the Postgres connection, SQL migration workflow, environment configuration, local persistent media directory, and shared test/build commands. Create the approved database schema and its core constraints so later subtasks can build on stable tables.

This task is infrastructure only. It must not implement scrapbook workflows, authentication behavior, media UI, or playback.

## Dependencies

- None.

## Implementation plan

@docs/superpowers/plans/2026-08-15-photo-scrapbook-task-01-foundation.md

## Acceptance criteria

- The repository contains separate client and server entry points with TypeScript configuration.
- The documented development command starts the client and API together or provides clear commands to start each independently.
- `GET /api/health` returns a successful response when the API and Postgres connection are available.
- Environment variables are documented in an `.env.example` file and missing required values produce a clear startup error.
- A SQL migration command can create the approved tables for users, sessions, scrapbooks, editor memberships, albums, media items, sticker assets, and sticker placements.
- The migration schema includes foreign keys, unique user emails, unique editor emails per scrapbook, valid scrapbook relationships, and ordering fields.
- The local media directory is configurable and is not committed to source control.
- A test command and a production client build command exist and run against the foundation.
- No application data is stored in browser local storage as a substitute for Postgres.
