# Product Requirements

## Goal

Build a shareable digital photo scrapbook for storing photos, videos, captions, albums, and scrapbook decorations. Public visitors can view and play a scrapbook without signing in. The owner and invited editors can authenticate and collaboratively manage the scrapbook.

## Product boundary

The product is a web application with a real Express API, PostgreSQL persistence, and durable media storage. The first version focuses on one scrapbook workspace per signed-in owner, public read-only sharing, authenticated editing, media organization, custom stickers, themes, and slideshow playback.

The application does not require email delivery for editor access. An editor invitation is an email address stored in the database. When that person signs up or signs in with the matching normalized email address, the membership is available to them.

## Roles and permissions

### Owner

- Creates the scrapbook and controls its ownership.
- Can upload, edit, caption, move, reorder, and delete photos and videos.
- Can create, rename, reorder, and delete albums.
- Can upload, place, transform, and delete custom stickers.
- Can change the scrapbook theme.
- Can open an authenticated public-view preview, including playback, without leaving the editor.
- Can add and remove editors.
- Can copy, rotate, or disable the public share link.

### Editor

- Signs in with the invited email address.
- Can upload, edit, caption, move, reorder, and delete photos and videos.
- Can create, rename, reorder, and delete albums.
- Can upload, place, transform, and delete custom stickers.
- Can change the scrapbook theme.
- Can open the same authenticated public-view preview as the owner.
- Can add other editors.
- Cannot remove editors.

### Public visitor

- Uses a valid public share link without an account.
- Can view the scrapbook cover, albums, photos, videos, captions, locations, themes, and stickers.
- Can play a specific album or the entire scrapbook.
- Cannot upload, edit, reorder, move, delete, manage editors, or change the theme.

## Core workflows

### Authentication and editor access

- Visitors can register or sign in.
- Pending editor memberships are matched when a user registers or signs in with the normalized invited email.
- Sessions use opaque server-side tokens in HTTP-only cookies.

### Scrapbook editing and organization

- Authenticated editors can create and reorder albums.
- Editors can upload photos and videos, edit captions and locations, reorder media, move media between albums, and delete media.
- Media uploads support JPEG/JPG, PNG, GIF, WebP, MP4, QuickTime MOV, OGG, and WebM files. Re-uploading identical file content in the same scrapbook is rejected with a clear duplicate notice.
- All memories includes unassigned media and supports selection, bulk move, and bulk delete.
- Holding Shift while selecting extends the selection across the visible ordered range.
- Bulk moves stage the destination and require an explicit Move selected confirmation before changing album membership.
- Deleting an album leaves its media unassigned rather than deleting the media.

### Public viewing and playback

- An enabled share link opens a read-only scrapbook without login.
- Visitors can browse albums and all memories without receiving collaborator data.
- Playback follows persisted album and media ordering, includes unassigned media at the end, advances after five-second photos or ended videos, and provides Replay and Exit at the end.
- Playback opens as a full-viewport book experience with a page-turn animation and reduced-motion support.
- Owners and editors can open a read-only public-view preview from the editor shell.

### Custom stickers and themes

- Owners and editors can upload supported raster sticker images, place them on album spreads, transform them, change layer order, and delete them after confirmation.
- Sticker assets and placements persist and render in editor, public, and playback views.
- The four theme keys are `field-journal`, `poolside`, `citrus-notebook`, and `moonlight-ink`.

## Visual and accessibility requirements

- The visual direction is a sunlit field journal with an ink navy desk, warm paper, restrained accents, serif display type, and a clean sans-serif interface.
- The editor uses a top utility bar, memory drawer, paper spread, and media details panel.
- Responsive layouts include a single-column mobile workspace with a bottom action bar.
- Focus states, keyboard or touch alternatives for movement, available alt text, and reduced-motion handling are required.

## Scope exclusions

- No outbound invitation email service.
- No social login or passwordless login.
- No native mobile applications.
- No automatic video transcoding or video editing.
- No real-time presence, chat, or conflict-resolution UI.
- No arbitrary remote URL fetching for photos or stickers.

## References

- Approved design baseline: @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
- Current task acceptance criteria: @docs/superpowers/subtasks/
