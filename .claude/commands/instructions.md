# Agent Instructions

## Branch Strategy
- Before making code changes, determine the active task source using the `Project` section.
- Follow `rules/branch-strategy.md` for branch planning, naming, creation, tracking, and final verification.
- Use `.claude/branch.md` as the persistent branch strategy and progress tracker when branch tracking is needed.
- Do not push changes, create remote branches, or open pull requests automatically.

## Project
Use the active task source for all work.

The active task source may be:
- `vision.md`, when it contains the current planned or long-form task.
- The user’s latest chat message, when `vision.md` is empty, outdated, unrelated, or clearly not aligned with the current request.

If `vision.md` appears stale or unrelated, do not treat it as authoritative. Use the latest user-provided task instead, especially for short, quick, follow-up tasks or small changes.

If `vision.md` already contains a complete and relevant task definition or implementation plan, treat it as complete and authoritative.

## Standard Outputs
- Implementation plan or task source: `vision.md`
- Branch strategy and progress tracker: `.claude/branch.md`
- Manual tests after completed work: `.claude/tests.md`
- Setup guide when manual setup is required: `.claude/setup.md`
- Pull request description: `.claude/pull-request.md` using `agents/release-engineer.md`

## Output Lifecycle
- Keep existing outputs aligned with the latest accepted task scope.
- When the user suggests changes, corrections, or scope updates during planning or implementation, update affected existing outputs instead of creating conflicting new artifacts.
- If the active task source is empty, outdated, or unrelated after a completed task, clear task-specific output files so stale results are not reused.
- If the active task source changes after a completed task, replace task-specific output files with outputs for the current task.
- Task-specific output files include `.claude/branch.md`, `.claude/tests.md`, `.claude/setup.md`, and `.claude/pull-request.md`.

## Task Execution
- For simple/small changes, complete in one pass — no need to break into steps.
- For heavy or multi-part tasks, break into numbered steps.
- Run build/tests before each step.
- Fix all errors before proceeding automatically — do not stop to ask.
- Label each step clearly when steps are used.

## Clarifications & Suggestions
- If any part of the task is unclear, incomplete, or ambiguous, ask clarifying questions before proceeding — but only when truly necessary.
- When asking for clarification, always include a concrete recommendation or suggested approach so progress is not blocked.
- Do not ask questions for information already available in the repo, `vision.md`, or `docs/`.
- If reasonable assumptions can be made safely from existing context, proceed without asking.

## Setup Guide
- For all components requiring manual setup, provide a detailed and complete configuration guide.
- Include relevant schemas, initialization code, or deployment logic only when strictly necessary for the task.
- If a component is plug-and-play or not required, do not include a setup section for it.
- Generate the setup guide at `.claude/setup.md` only when the task or completed changes require manual setup.
- Update `.claude/setup.md` whenever later task changes, fixes, or implementation changes affect manual setup steps, required configuration, schemas, initialization code, deployment logic, environment variables, or external services.
- If existing manual setup is no longer required after changes, clear or remove `.claude/setup.md` so stale setup instructions are not preserved.

## Dependency Management
- Apply this section only when the project is newly starting, when the user explicitly asks, or when the active task source includes dependency/package work.
- Before adding any dependency or package, check the current latest stable release from the official package registry or official source.
- Use the exact latest stable version number instead of loose versions, ranges, or unpinned versions.
- This applies to all ecosystems, including npm, pnpm, yarn, Python, .NET/NuGet, Java, Go, Rust, and other package managers.
- Do not use prerelease, beta, alpha, nightly, deprecated, or unmaintained versions unless the task explicitly requires it.
- Avoid packages or versions with known open CVEs, active security advisories, or recent credible security concerns.
- Prefer maintained, widely used packages with clear documentation and recent stable releases.
- If a safe latest stable version cannot be confirmed, do not add the package automatically. Document the concern and recommend a safer alternative.
- Record newly added dependencies, exact versions, and the reason for adding them in `.claude/pull-request.md`.

## On Completion
- Save or update the relevant files listed in `Standard Outputs`.
- Create or update `.claude/tests.md` only after implementation work is done and the completed task needs verification or testing.
- At the end of each completed branch, generate `.claude/pull-request.md` for that branch using `agents/release-engineer.md`.
- If a task is already done but minor quick changes or fixes are needed later, apply the fix and update `.claude/pull-request.md` and `.claude/tests.md` when the change affects completed behavior, verification steps, branch summary, implementation details, testing notes, risks, or review notes.
- If a task is already done but minor quick changes or fixes affect manual setup, update or clear `.claude/setup.md`.

## Code Conventions
- Follow existing file/code/directory patterns.
- Follow all guidelines, standards, and architecture in the `docs/` folder.
- Do not modify files outside the exact scope of the task.
- Reflect new/updated features in `command-specs` if applicable.
- Run build tests and fix all errors.
