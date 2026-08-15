# Subtask 6: Collaborators, Sharing Controls, and Themes

## Task

Add the editor-facing collaborator panel, public-link controls, and persisted theme selection. Connect the role rules to the controls so owners and editors see the actions they are allowed to perform.

This task focuses on management UI and theme presentation. The underlying scrapbook and membership APIs come from Subtask 3.

## Dependencies

- Subtask 3: Scrapbooks, sharing, and editor permissions.
- Subtask 5: Authenticated editor workspace.

## Acceptance criteria

- The collaborator panel lists the current user’s role and editor membership state without exposing private data to public viewers.
- Owners and editors can add editors by entering an email address.
- Only the owner can remove editors; editor users do not receive an enabled remove action.
- A pending membership is visibly distinguishable from a linked account when that information is safe to show to an authenticated collaborator.
- The owner can copy the public link and access controls to rotate, disable, or re-enable it.
- The theme picker provides four named presets, including the approved default field-journal theme.
- Owners and editors can change the active theme and the selected theme persists across refreshes and public viewing.
- Public viewers never see collaborator-management controls.
- Role-specific controls remain correct after a page refresh and after a session changes.
- Browser verification covers owner controls, editor controls, attempted editor removal by an editor, share-link actions, and theme persistence.

