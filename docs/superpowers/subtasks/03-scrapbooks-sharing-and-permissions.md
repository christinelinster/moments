# Subtask 3: Scrapbooks, Sharing, and Editor Permissions

## Task

Implement the scrapbook resource, public share-token lifecycle, editor membership records, and server-side role checks. This task establishes the permission rules that every later mutation must use.

The owner and editors can add editors. Only the owner can remove editors. Public visitors can read through an active share token without signing in and cannot access private collaborator data.

## Dependencies

- Subtask 1: Application foundation and database.
- Subtask 2: Authentication and sessions.

## Acceptance criteria

- An authenticated user can create a scrapbook and load its current state.
- A new scrapbook has an active random public share token and an active default theme.
- The owner can retrieve, rotate, disable, and re-enable the public share link.
- A valid share token returns read-only scrapbook data without requiring a session.
- Invalid, disabled, or superseded share tokens return a not-found or disabled response without scrapbook data.
- The owner can add an editor by a validated, normalized email and remove an editor.
- An editor can add another editor by a validated, normalized email but cannot remove any editor.
- Invalid collaborator emails are rejected using the shared email validator from Subtask 2.
- A pending email membership becomes associated with the matching user account when that user registers or signs in.
- The owner and editors can access editor routes; public visitors cannot access editor routes.
- Public responses exclude passwords, session data, editor emails, and other private account details.
- Automated tests cover the complete owner, editor, pending-membership, public-token, and unauthorized-request matrix.
