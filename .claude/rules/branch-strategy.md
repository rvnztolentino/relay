## Branch Strategy & Naming

Use this strategy before implementation begins.

**Step 1: Required Reads**
Determine the active task source first. Then read `branch.md`.

If `branch.md` does not exist, create it before making code changes. It must summarize the selected branch strategy based on the active task source.

**Step 2: Evaluation**
Analyze the tasks from the active task source to determine if the work requires a **single branch** or should be split into **multiple branches** based on scope, logical separation, dependencies, risk, and independent deliverability.

**Step 3: Automatic Branch Creation**
Create the required branch or branches automatically before implementation starts.

Strict rules:

* Do not push changes.
* Do not create remote branches.
* Do not open a pull request automatically.
* Keep branch names short, clear, and task-focused.

**Step 4: Multi-Branch Tracking**
If multiple branches are required, track them in `branch.md`.

Use only `branch.md` as the persistent branch strategy and progress tracker so the work can be resumed later. Read it before continuing any existing branch work.

Each branch entry must include:

* Branch name
* Scope
* Branch status: `Planned`, `In Progress`, `Blocked`, or `Completed`
* PR status: `Not Started`, `Ready`, `Active`, `Merged`, or `Not Needed`
* Completed work
* Remaining work
* Dependencies on other branches
* Whether it can be merged independently
* Notes needed to resume the branch later

For multi-branch work, complete only the current branch scope. After the current branch is complete, update `branch.md`, generate the branch artifacts, and stop for user review before continuing to another branch.

If the user says a completed branch now has an active PR, update that branch's PR status to `Active`, then start only the next branch with branch status `Planned`.

Use this `branch.md` shape when multiple branches are required:

```md
# Branch Strategy and Progress

## branch-name
Branch status: Planned | In Progress | Blocked | Completed
PR status: Not Started | Ready | Active | Merged | Not Needed
Scope:
Completed work:
Remaining work:
Dependencies:
Can merge independently:
Resume notes:
```

**Step 5: Naming & Scope Definition**
For each required branch, identify the correct name using these prefixes:

* `feat/` for new features or functionality
* `fix/` for bug fixes
* `chore/` for maintenance, updates, or non-functional changes
* `refactor/` for code restructuring without changing behavior
* `test/` for adding or updating tests
* `docs/` for documentation updates

**Format:**
**branch-name:** `prefix/short-descriptive-name`

For each branch, clearly define:

* What is included
* What is excluded
* Dependencies on other branches (if any)
* Whether it can be merged independently

**Step 6: Final Branch Requirement**
The final branch must verify that all tasks from the active task source are completed. If any task is incomplete, fix it before considering the final branch complete.

Keep names very short, simple, and aligned with the task.
