# Photo Scrapbook Design Specification

**Status:** Draft for human review
**Date:** 2026-08-15

## Goal

Build a shareable digital photo scrapbook for storing photos, videos, captions, albums, and scrapbook decorations. Public visitors can view and play a scrapbook without signing in. The owner and invited editors can authenticate and collaboratively manage the scrapbook.

## Product boundary

The product is a web application with a real Express API, Postgres persistence, and durable media storage. The first version focuses on one scrapbook workspace per signed-in owner, public read-only sharing, authenticated editing, media organization, custom stickers, and slideshow playback.

The application does not require email delivery for editor access. An editor invitation is an email address stored in the database. When that person signs up or signs in with the matching normalized email address, the membership is available to them.

## Roles and permissions

### Owner

- Creates the scrapbook and controls its ownership.
- Can upload, edit, caption, move, reorder, and delete photos and videos.
- Can create, rename, reorder, and delete albums.
- Can upload, place, transform, and delete custom stickers.
- Can change the scrapbook theme.
- Can add and remove editors.
- Can copy, rotate, or disable the public share link.

### Editor

- Signs in with the invited email address.
- Can upload, edit, caption, move, reorder, and delete photos and videos.
- Can create, rename, reorder, and delete albums.
- Can upload, place, transform, and delete custom stickers.
- Can change the scrapbook theme.
- Can add other editors.
- Cannot remove editors.

### Public visitor

- Uses a valid public share link without an account.
- Can view the scrapbook cover, albums, photos, videos, captions, locations, themes, and stickers.
- Can play a specific album or the entire scrapbook.
- Cannot upload, edit, reorder, move, delete, manage editors, or change the theme.

## Core workflows

### Authentication and editor access

1. A visitor can register with an email address and password or sign in with an existing account.
2. The server normalizes email addresses to lowercase before uniqueness checks and membership matching.
3. The owner or any editor enters an email address in the collaborator panel to add an editor.
4. The server creates or updates a pending membership record. No email is sent.
5. When a matching account signs in or registers, the pending membership is recognized for that scrapbook.
6. The owner can remove a membership. Editors cannot remove memberships.
7. A session uses an opaque server-side token stored in an HTTP-only cookie. Passwords are stored only as salted hashes.

### Scrapbook editing

1. The authenticated editor opens the scrapbook workspace.
2. The workspace shows a paper scrapbook spread with an album drawer, a central album canvas, and a details panel.
3. The user can create albums and reorder album tabs.
4. The user can upload one or more photos or videos using a file picker or drag-and-drop.
5. Each uploaded item is persisted as one media record with optional album membership, caption, location, and position.
6. Media can be reordered within an album by drag-and-drop. A second accessible move control supports keyboard and touch users.
7. Media can be dragged onto another album tab to move it. Moving media persists the new album and position.
8. Deleting an album removes only the album. Its media becomes unassigned and remains visible in All memories.
9. Deleting media requires confirmation and removes both its database record and stored file.

### All memories and bulk actions

1. All memories lists every photo and video, including unassigned items.
2. The view supports selecting individual items with checkboxes.
3. The user can move all selected items into a chosen album in one action.
4. The user can delete all selected items after a single confirmation.
5. Bulk actions report success or failure without losing the current selection unexpectedly.

### Public viewing

1. The public link opens a read-only scrapbook cover with the title, active theme, album list, and media counts.
2. A visitor can browse a specific album or all memories.
3. The public API exposes only the data needed for viewing and never exposes passwords, session data, or editor emails.
4. The owner can disable or rotate the public token. Disabled or superseded tokens no longer return scrapbook data.

### Playback

1. A visitor or editor can start playback for one album or the entire scrapbook.
2. Album playback follows the persisted media order.
3. Full scrapbook playback follows album order and then media order within each album. Unassigned media is included at the end of the sequence.
4. Photos display for a default five seconds. Videos play until they finish, then playback advances.
5. Playback has play/pause, previous, next, progress, album context, and exit controls.
6. Each item appears inside a scrapbook page with a page-turn transition.
7. Captions and locations are displayed with the current item.
8. Playback stops at the last item and offers Replay and Exit.
9. The controls remain usable when reduced motion is enabled.

### Custom stickers

1. The owner or an editor can upload a sticker image from their device.
2. The first version accepts raster image stickers such as PNG, JPEG, and WebP. The server rejects unsupported types and arbitrary remote URLs.
3. Uploaded sticker assets appear in a scrapbook-specific sticker tray.
4. An editor can place a sticker on an album spread and drag, resize, rotate, layer, or delete it.
5. Each placement persists the album, asset, position, scale, rotation, and layer order.
6. Sticker placements appear in the editor, public album view, and playback.
7. Public visitors can see stickers but cannot change them.
8. The default maximum upload size is 250 MB per photo or video and 10 MB per sticker. These limits are configurable through server environment settings, and oversized uploads return a clear size error.
9. Deleting a sticker asset also removes its placements from album spreads after confirmation.

## Visual direction

The visual language is a sunlit field journal rather than a generic media dashboard:

- Surrounding workspace: deep ink navy desk surface.
- Page surface: warm paper with subtle grain and imperfect edges.
- Accents: faded pool blue, marigold, persimmon, and lavender.
- Display type: a bookish serif stack such as Baskerville, Iowan Old Style, or Georgia.
- Interface type: a clean system sans-serif stack.
- Editor layout: top utility bar, left memory drawer, central paper spread, and right media details panel.
- Media cards: lightly varied rotation, paper shadows, restrained washi tape, stickers, labels, and album tabs.
- Responsive layout: a single-column mobile workspace with a bottom action bar.
- Accessibility: visible focus states, keyboard move controls, alt text for media where available, and reduced-motion handling.

The signature interaction is the paper album tab: selecting a tab pulls that album's spread forward while keeping the scrapbook spine and surrounding desk visible.

### Theme presets

The four persisted theme keys are:

- `field-journal`: the default ink navy, warm paper, pool blue, marigold, persimmon, and lavender palette.
- `poolside`: a faded aqua, sun-bleached coral, and navy palette.
- `citrus-notebook`: a lemon, leaf green, warm paper, and ink palette.
- `moonlight-ink`: a midnight, lavender, silver, and pale blue palette.

## Technical architecture

### Application stack

- TypeScript for the client and server.
- Express for the HTTP API.
- React with Vite for the web client.
- PostgreSQL accessed through the `pg` connection pool.
- Checked-in SQL migrations under `server/db/migrations`.
- No Prisma or other ORM is required.
- HTTP-only cookie sessions backed by a `sessions` table.
- Local disk storage as the default media adapter.
- An S3-compatible storage adapter interface for production deployments.

### Core database entities

- `users`: normalized email, password hash, timestamps.
- `sessions`: hashed session token, user, expiry, timestamps.
- `scrapbooks`: owner, title, share token state, active theme, timestamps.
- `scrapbook_editors`: scrapbook, normalized email, optional linked user, timestamps.
- `albums`: scrapbook, name, position, timestamps.
- `media_items`: scrapbook, optional album, storage key, media type, MIME type, file size, caption, location, position, uploader, timestamps.
- `sticker_assets`: scrapbook, storage key, image metadata, uploader, timestamps.
- `sticker_placements`: album, sticker asset, x/y position, scale, rotation, layer position, timestamps.

The database enforces unique user emails, unique editor emails per scrapbook, valid scrapbook relationships, and stable ordering fields. Media and sticker operations that change multiple rows use transactions.

### API boundaries

- `/api/auth`: register, sign in, sign out, current session.
- `/api/scrapbooks`: create, load, update, share-link lifecycle, editor membership management.
- `/api/albums`: album CRUD and ordering.
- `/api/media`: multipart upload, item updates, move/reorder, bulk move, delete.
- `/api/stickers`: sticker upload, placement CRUD, placement ordering, delete.
- `/api/public/:shareToken`: read-only scrapbook, album, media, sticker, and playback data.
- `/api/files/...`: safe file responses that verify the owning scrapbook before returning stored content.

Every mutation checks the authenticated user and scrapbook role in the server. Public routes authorize using the share token only. Storage paths are generated by the server and are never accepted directly from the client.

Share tokens are cryptographically random bearer values. Their active state is stored server-side, and the raw value is returned only through an authenticated share-link endpoint. Public scrapbook payloads do not contain editor or session data.

### Persistence and failure handling

- Refreshing the app reloads scrapbook state from Postgres and files from the configured storage adapter.
- Upload records are created only after validation succeeds. Failed uploads do not create visible media items.
- Database operations report clear validation or permission errors to the client.
- Deletion failures do not silently report success; the API returns an error that leaves the user able to retry.
- Storage directories are configurable and must live on a persistent volume in deployment.
- Session cookies are HTTP-only, use `SameSite=Lax`, use `Secure` in production, and have a bounded expiry.
- The local storage adapter rejects path traversal and never exposes the media root as an unrestricted static directory.
- No live presence or real-time conflict resolution is required in the first version. Refetching is the collaboration synchronization mechanism.

## Scope exclusions

- No outbound invitation email service.
- No social login or passwordless login.
- No native mobile applications.
- No automatic video transcoding or video editing.
- No real-time presence, chat, or conflict-resolution UI.
- No arbitrary remote URL fetching for photos or stickers.

## Design-level verification

The implementation must later demonstrate:

- authenticated owner and editor flows;
- public access through a share token without login;
- server-enforced owner/editor/public permissions;
- Postgres-backed persistence across refreshes and server restarts;
- durable photo, video, and sticker uploads;
- album and media ordering persistence;
- bulk move and delete behavior;
- slideshow ordering and video playback behavior;
- theme and sticker placement persistence;
- responsive editor and public viewer states;
- automated API tests and browser-level verification of the primary workflows.

## Planning gate

This document is a design artifact, not an implementation plan. After human approval, the next planning step is to break the design into independently verifiable subtasks with explicit acceptance criteria. The writing-plans workflow may begin only after the human approves that subtask breakdown. Implementation will then proceed one task at a time with approval between tasks.
