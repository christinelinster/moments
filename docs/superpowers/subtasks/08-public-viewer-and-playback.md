# Subtask 8: Public Viewer and Slideshow Playback

## Task

Build the public read-only scrapbook route and playback experience. Visitors should be able to open a share link without authentication, browse the scrapbook, play one album or the entire scrapbook, and see the same theme, captions, locations, and stickers that editors saved.

Playback must follow persisted ordering and must work for both photos and videos.

## Dependencies

- Subtask 3: Scrapbooks, sharing, and editor permissions.
- Subtask 4: Albums, media uploads, and organization API.
- Subtask 6: Collaborators, sharing controls, and themes.
- Subtask 7: Custom stickers and scrapbook decorations.

## Acceptance criteria

- A visitor can open the active public share link in a fresh browser without signing in.
- The public cover shows the scrapbook title, active theme, album list, media counts, and a read-only entry point for All memories.
- Visitors can browse albums, media, captions, locations, and stickers without seeing editor controls or collaborator data.
- Visitors can start playback for a selected album or the entire scrapbook.
- Album playback follows media position order.
- Full scrapbook playback follows album position order, then media position order, with unassigned media at the end.
- Photos display for five seconds by default, and videos advance after playback ends.
- Playback provides play/pause, previous, next, progress, album context, and exit controls.
- Page-turn transitions appear between items and are disabled or reduced when the user requests reduced motion.
- Captions, locations, themes, and sticker placements appear in the current playback page.
- Playback stops at the final item and provides Replay and Exit actions.
- Browser verification covers public access without login, album playback, full scrapbook playback, video behavior, ordering, captions, stickers, and responsive states.

