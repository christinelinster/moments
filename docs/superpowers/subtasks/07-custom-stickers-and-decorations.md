# Subtask 7: Custom Stickers and Scrapbook Decorations

## Task

Implement custom sticker uploads and the persisted decoration layer. Owners and editors can upload raster sticker images, use a scrapbook-specific sticker tray, and place decorations on album spreads with transform and layer controls.

Sticker assets are uploaded files. The server must not fetch arbitrary remote URLs.

## Dependencies

- Subtask 4: Albums, media uploads, and organization API.
- Subtask 5: Authenticated editor workspace.
- Subtask 6: Collaborators, sharing controls, and themes.

## Acceptance criteria

- Owners and editors can upload PNG, JPEG, and WebP sticker images.
- Unsupported types, oversized files, and arbitrary remote sticker URLs are rejected with clear errors.
- Uploaded stickers appear in a scrapbook-specific sticker tray after upload and after refresh.
- An editor can place a sticker on the active album spread.
- Sticker placement supports drag, resize, rotate, delete, and layer-order changes.
- Placement state persists album ID, sticker asset ID, position, scale, rotation, and layer order.
- Sticker assets and placements remain correct after a browser refresh and API restart.
- Public album views render the persisted stickers without edit controls.
- Playback can render stickers for the current album page.
- Automated or browser-level tests cover sticker upload, placement persistence, transformation, deletion, public rendering, and rejected uploads.

