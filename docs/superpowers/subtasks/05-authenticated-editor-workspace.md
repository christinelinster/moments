# Subtask 5: Authenticated Editor Workspace

## Task

Build the authenticated React editor experience on top of the auth, scrapbook, and media APIs. Provide the scrapbook shell, album navigation, All memories view, upload flow, media details, captions, and organization controls in the approved field-journal visual direction.

The workspace must make the persisted API state visible and editable without turning browser local storage into a second source of truth.

## Dependencies

- Subtask 2: Authentication and sessions.
- Subtask 3: Scrapbooks, sharing, and editor permissions.
- Subtask 4: Albums, media uploads, and organization API.

## Acceptance criteria

- A signed-out visitor sees register/sign-in entry points instead of the editor.
- An authenticated user can enter the scrapbook workspace and see the top bar, memory drawer, paper spread, and details panel.
- The album drawer supports All memories, album selection, album creation, album rename, album reorder, and album deletion.
- The user can upload multiple photos/videos using a file picker or drag-and-drop and see upload progress or a clear error.
- Uploaded media appears in the active workspace with photo thumbnails or video previews.
- The user can edit captions and locations and see the saved values after refresh.
- The user can reorder media by drag-and-drop and through accessible keyboard/touch move controls.
- The user can drag media onto another album or use a move action to persist a new album.
- All memories supports checkbox selection, bulk move, and bulk delete with confirmation.
- The interface displays clear loading, empty, validation, permission, and upload-failure states.
- Keyboard focus is visible and reduced-motion settings are respected.
- A browser-level verification covers sign-in, album creation, upload, captioning, reorder, bulk action, refresh, and persisted state.

