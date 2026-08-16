## Documentation Routing

### Project Documentation
- Current Phase 1 task specifications live in `docs/superpowers/subtasks/`; new task specifications use `docs/specs/`.
- Each task specification links to its matching plan in `docs/superpowers/plans/`.
- Read only the matching plan and its `## References` section for a single-task implementation.
- For existing plans, use the task-specific durable-document mapping before opening the broad dated design referenced by the plan. Open the full design only when the mapped documents do not answer a requirement or when cross-task review requires it.
- Do not read the full `docs/` tree, all task specs, or the top-level implementation plan for a single-task implementation. Read them only for cross-task planning, audits, or explicit requests.

### Durable documentation

- `@docs/product-requirements.md` - product behavior and scope
- `@docs/architecture.md` - architecture and component boundaries
- `@docs/development.md` - setup, commands, and verification
- `@docs/security.md`: Authentication, authorization, sessions, uploads, and storage security
- `@docs/superpowers/specs/2026-08-15-photo-scrapbook-design.md` - a compatibility reference for the current Phase 1 plans. Read only the relevant sections when an active plan points to it.

### Documentation updates

- If a task changes documented architecture, behavior, security posture, or developer workflow, update the corresponding durable documentation.
- New task specs must link to their implementation plan. New implementation plans must include a `## References` section that points to the task spec and only the durable documents needed for that task. Do not duplicate requirements or acceptance criteria in the plan.

## Constraints
- Do not use sub-agents.
- Do not use git worktrees.
- Do not commit changes.
- Do not stage, push, or open pull requests. I will review the diff, commit, push, and open the PR manually.
- I will make all commits manually.
- Work on one task at a time.
- Each task must have clear acceptance criteria before beginning implementation
- Do not begin the next task without my approval.
- Show the relevant diff after implementation.
- Ask when requirements or architectural decisions are ambiguous.

## Planning and Approval Workflow
- Treat the requirements and design phase as planning only. Do not write application implementation code until the requirements and design are complete.
- Break the approved scope into independently verifiable tasks, each with explicit acceptance criteria in its task-spec file.
- Present the task specs and acceptance criteria to the human for review and approval before invoking the writing-plans workflow.
- Only after the human approves the task specs and acceptance criteria may the agent create the implementation plan with the writing-plans workflow.
- In planning Markdown files, reference other repository files with concise repo-root `@path` references, such as `@docs/architecture.md`.


## Implementation, Testing, and PR Review Flow
- The implementation agent completes one approved task at a time.
- After implementation, run relevant automated verification before claiming the task is complete. For React user flows, prefer browser-level Playwright coverage when applicable, together with the relevant unit, API, and build checks.
- Report the exact verification commands and results, show the relevant diff, and wait for my approval.
- Only after I have reviewed the diff, committed the changes, and opened a PR may the agent invoke the `requesting-code-review` skill.
