
## Phase 1 Agent Constraints
- Do not use sub-agents for implementation, automated testing, local verification, planning, or pre-PR review. The only exception is the post-PR review gate defined below.
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
- Break the approved scope into independently verifiable subtasks, each with explicit acceptance criteria.
- Present the subtasks and acceptance criteria to the human for review and approval before invoking the writing-plans workflow.
- Only after the human approves the subtasks and acceptance criteria may the agent create the implementation plan with the writing-plans workflow.
- Execute the implementation plan one task at a time. Each task requires human approval before starting the next task.
- After each completed task, run its relevant verification, show the resulting diff, and wait for human approval before continuing.
- In planning Markdown files, reference other repository files with concise repo-root `@path` references, such as `@docs/superpowers/specs/example.md`.
- Keep each task's acceptance criteria in its approved `docs/superpowers/subtasks/*.md` file. Task plans must reference that file instead of duplicating the criteria.
- If planning introduces a new acceptance criterion, add it to the referenced design spec before continuing.

## Implementation, Testing, and PR Review Flow
- The implementation agent completes one approved task at a time.
- After implementation, run relevant automated verification before claiming the task is complete. For React user flows, prefer browser-level Playwright coverage when applicable, together with the relevant unit, API, and build checks.
- Report the exact verification commands and results, show the relevant diff, and wait for my approval.
- Only after I have reviewed the diff, committed the changes, and opened a PR may the agent invoke the `requesting-code-review` skill.
- For that post-PR gate, dispatch a separate, read-only, general-purpose reviewer agent. The reviewer must be a different agent/session from the agent that implemented the changes and requested the review. When the runtime supports model selection, use a different model as well.
- Give the reviewer the PR or exact base/head context, requirements, and verification results. The reviewer must inspect the PR without modifying the working tree, index, branch, PR, or remote, and must not commit, stage, push, or merge.
- Do not substitute self-review if an independent reviewer agent/model is unavailable. Report the limitation and wait for direction.
- Treat the independent review as the only permitted sub-agent use in this phase. Any fixes identified by the review return to the normal implementation, testing, diff, and human-approval flow.

I want to learn the workflow, so do not optimize for
maximum autonomy. Keep human approval gates explicit.
