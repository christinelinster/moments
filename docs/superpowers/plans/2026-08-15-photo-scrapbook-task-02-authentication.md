# Task 2: Authentication and Sessions Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Implement email/password registration, strict email validation, login/logout, current-session loading, and Postgres-backed opaque HTTP-only cookie sessions.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/02-authentication-and-sessions.md

**Dependencies:** Task 1.

## Files

- Create: `server/src/auth/email.ts`, `password.ts`, `sessions.ts`, `middleware.ts`, `routes.ts`, `types.ts`.
- Modify: `server/src/app.ts` to mount `/api/auth` and request auth context.
- Create: `server/src/auth/email.test.ts`, `routes.test.ts`, `sessions.test.ts`.

## Interfaces

- `normalizeAndValidateEmail(input: unknown): string` trims, lowercases, validates, or throws a typed validation error.
- `hashPassword(password: string): Promise<string>` uses Node `crypto.scrypt` and a random salt.
- `verifyPassword(password: string, encodedHash: string): Promise<boolean>` uses constant-time comparison.
- `createSession(userId: string): Promise<{ token: string; expiresAt: Date }>` stores only a token hash.
- `requireSession: RequestHandler` attaches `req.auth.userId` or returns `401`.

## Test-first implementation steps

- [ ] **Step 1: Write failing validator and route tests.**

Test missing `@`, missing local/domain parts, whitespace, control characters, consecutive dots, invalid domain labels, 64-character local-part overflow, 254-character total overflow, normalization, duplicate registration, login, logout, current session, and expiry.

- [ ] **Step 2: Run the tests and verify the missing-module or missing-route failures.**

Run: `npm test --workspace server -- email.test.ts routes.test.ts sessions.test.ts`

Expected: FAIL because validators, password functions, session repository, and auth routes do not exist.

- [ ] **Step 3: Implement validation, password hashing, sessions, cookies, and routes.**

Email validation must require exactly one `@`, non-empty local/domain parts, no whitespace or control characters, no consecutive dots, local part no longer than 64 characters, total length no longer than 254 characters, and domain labels no longer than 63 characters that do not begin or end with a hyphen or dot. Do not perform DNS or delivery checks.

Implement:

- `POST /api/auth/register` with `{ email, password }`.
- `POST /api/auth/login` with `{ email, password }`.
- `POST /api/auth/logout`.
- `GET /api/auth/me`.

Use a cryptographically random opaque token in an HTTP-only cookie. Store its SHA-256 hash, user ID, expiry, timestamps, and revocation state in Postgres. Use `Secure` in production, `SameSite=Lax`, and bounded `Max-Age`.

- [ ] **Step 4: Run the authentication tests and verify they pass.**

Run: `npm test --workspace server -- email.test.ts routes.test.ts sessions.test.ts`

Expected: PASS for valid and invalid email input, registration, login, logout, current-session loading, duplicate emails, invalid credentials, expired sessions, and protected routes.

- [ ] **Step 5: Refactor after green.**

Keep password and cookie handling in focused modules and avoid login errors that reveal whether an email exists. Stop for human approval before Task 3.

**Acceptance criteria:** @docs/superpowers/subtasks/02-authentication-and-sessions.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
