# Task 6: Collaborators, Sharing Controls, and Themes Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` inline, one checklist step at a time. Do not commit or stage changes.

**Goal:** Add collaborator management UI, role-specific share-link controls, four persisted theme presets, and editor/public theme rendering.

**Spec:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
**Subtask:** @docs/superpowers/subtasks/06-collaborators-sharing-and-themes.md

**Dependencies:** Tasks 3 and 5.

## Files

- Create: `client/src/collaborators/CollaboratorPanel.tsx`, `ShareLinkPanel.tsx`, `collaborator-api.ts`.
- Create: `client/src/scrapbook/ThemePicker.tsx`, `client/src/styles/theme-presets.ts`.
- Modify: `server/src/scrapbooks/routes.ts`, `repository.ts` if theme persistence is not complete in Task 3.
- Modify: `client/src/scrapbook/ScrapbookWorkspace.tsx`.
- Create: `client/src/collaborators/CollaboratorPanel.test.tsx`, `client/src/scrapbook/ThemePicker.test.tsx`, `server/src/scrapbooks/theme-routes.test.ts`.

## Interfaces

- `ThemeKey = "field-journal" | "poolside" | "citrus-notebook" | "moonlight-ink"`.
- `ThemePickerProps` includes `value`, `canEdit`, and `onChange(theme: ThemeKey): Promise<void>`.
- `CollaboratorPanelProps` includes `members`, `currentRole`, `canRemove`, `onAdd`, and `onRemove`.
- `ShareLinkPanel` exposes copy, rotate, enable, and disable only to owners.

## Test-first implementation steps

- [ ] **Step 1: Write failing API and UI tests.**

Cover theme validation/persistence, owner add/remove, editor add, editor removal rejection, pending membership display, share-link copy/rotate/enable/disable, and public absence of collaborator controls.

- [ ] **Step 2: Run the tests and verify missing-control or missing-endpoint failures.**

Run: `npm test --workspace client -- CollaboratorPanel.test.tsx ThemePicker.test.tsx`

Run: `npm test --workspace server -- theme-routes.test.ts`

Expected: FAIL because controls and theme persistence do not exist.

- [ ] **Step 3: Implement theme and collaborator features.**

Implement `PATCH /api/scrapbooks/:scrapbookId/theme` with the four validated keys. Owners and editors can change themes and add editors. Only owners can remove editors or change share-link state. Reuse Task 2 email validation.

Render the active theme through CSS custom properties. Show pending versus linked memberships only to authenticated collaborators. Never expose collaborator controls on public routes.

- [ ] **Step 4: Run tests and verify they pass.**

Run the client and server commands from Step 2.

Expected: PASS for role-specific controls, membership actions, invalid emails, theme persistence/reload, and owner-only link lifecycle.

- [ ] **Step 5: Refactor after green.**

Keep role checks on the API and theme values as a validated enum. Stop for human approval before Task 7.

**Acceptance criteria:** @docs/superpowers/subtasks/06-collaborators-sharing-and-themes.md
**Planning clarifications:** @docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md
