# Claude Prompt Router

Use this file only as a lightweight index.

Do not read every Markdown file in `.claude/` by default. Read only the file the user explicitly mentions, or a file explicitly required by that selected command.

Common entrypoints:
- Main task instructions: `commands/instructions.md`
- Task source or implementation plan: `vision.md`
- Pull request writer: `agents/release-engineer.md`

Common agents:
- Engineering Manager: `agents/engineering-manager.md`
- Release Engineer: `agents/release-engineer.md`
- Code Reviewer: `agents/code-reviewer.md`
- Security Officer: `agents/security-officer.md`
- QA Lead: `agents/qa-lead.md`

Folders:
- `commands/` - prompts to run on request
- `rules/` - shared rules referenced by commands
- `agents/` - specialist review and verification prompts
- `skills/` - Cluade skills with `SKILL.md`, when needed
