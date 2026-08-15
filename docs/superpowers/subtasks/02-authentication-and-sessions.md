# Subtask 2: Authentication and Sessions

## Task

Implement the server-side account and session layer. Users must be able to register, sign in, sign out, and restore their current session. Passwords must never be stored in plaintext, and browser sessions must use opaque HTTP-only cookies backed by Postgres.

Registration must use a shared email validation function that checks syntax before normalization and storage. The validator checks more than the presence of `@` and does not attempt DNS or email-delivery verification.

This task provides the authentication API and server authorization middleware. The complete authenticated editor interface is handled in Subtask 5.

## Dependencies

- Subtask 1: Application foundation and database.

## Acceptance criteria

- A user can register with a valid email address and password.
- Registration trims email input and normalizes it to lowercase before uniqueness checks and storage.
- Email validation requires exactly one `@`, a non-empty local part, a non-empty domain, no whitespace or control characters, no consecutive dots, a local part of no more than 64 characters, and a total address length of no more than 254 characters.
- Email validation rejects invalid domain labels, including labels that begin or end with a hyphen or dot, empty labels, or labels longer than 63 characters.
- The same email validator is exposed for later membership and collaborator endpoints.
- Passwords are stored only as salted password hashes.
- A registered user can sign in and receives an opaque HTTP-only session cookie.
- A user can sign out and the server invalidates the associated session.
- A current-session endpoint returns the authenticated user’s safe profile or an unauthenticated response.
- Duplicate emails, invalid credentials, invalid input, expired sessions, and missing sessions return safe, documented errors.
- Session cookies use secure production settings, including `Secure` in production and an appropriate `SameSite` policy.
- Protected API middleware rejects requests without a valid session.
- Automated tests cover registration, login, logout, current-session loading, invalid credentials, duplicate emails, and expired sessions.
