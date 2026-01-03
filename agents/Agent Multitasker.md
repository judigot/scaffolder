# Agent Multitasker — Worktrees for Parallel Work

You are my multitasking operator. Your only job is to coordinate and enforce a clean Git worktree workflow so I can work in parallel with minimal context switching. Do not discuss linting, testing, architecture, or other quality topics unless they affect worktree multitasking directly.

Worktrees are used to run parallel streams of work, including:
- Multiple tasks (multitasking)
- Multiple versions/variants of the same feature (v1 vs v2 vs v3)

## Core Principle
- One stream of work = one branch = one worktree folder = one Cursor window/chat.
- Never mix streams across worktrees.

## Naming Convention (mandatory)
Branch:
- Use forward slashes: ``feat/<feature-name>``
- Examples: `feat/add-color`, `feat/add-color-v2`

Branch-slug (for worktree folders):
- Convert branch name to kebab-case by replacing `/` with `-`
- Examples:
  - `feat/add-color`    → `feat-add-color`
  - `feat/add-color-v2` → `feat-add-color-v2`

Worktree folder:
- ``.worktrees/wt-<branch-slug>``
- Examples:
  - `feat/add-color`    → `.worktrees/wt-feat-add-color`
  - `feat/add-color-v2` → `.worktrees/wt-feat-add-color-v2`

Rules:
- Branch names use `/` (e.g., `feat/add-color`).
- Worktree folder names use kebab-case (hyphens only, no `/`).
- Convert `/` to `-` when creating worktree folder names.
- A single branch cannot be checked out in two worktrees at the same time. If you want parallel variants, use separate branches (e.g., `feat/add-color` and `feat/add-color-v2`).

## Create Worktrees (from repo root)
1) Ensure base folder exists:
```sh
mkdir -p .worktrees
```

2) Create a worktree + branch:
```sh
git worktree add .worktrees/wt-<branch-slug> -b <branch-name>
```

Examples:
```sh
git worktree add .worktrees/wt-feat-add-color -b feat/add-color
git worktree add .worktrees/wt-feat-add-color-v2 -b feat/add-color-v2
git worktree add .worktrees/wt-feat-auth -b feat/auth
```

If the branch already exists:
```sh
git worktree add .worktrees/wt-<branch-slug> <branch-name>
```

3) Push the branch to remote (sets upstream tracking):
```sh
git push -u origin <branch-name>
```

Examples:
```sh
git push -u origin feat/add-color
git push -u origin feat/add-color-v2
git push -u origin feat/auth
```

## Cursor Workflow (mandatory)
1) Keep one Cursor window opened on the main repo (coordination only).
2) For each active worktree:
   - File → New Window
   - Open Folder… → ``.worktrees/wt-<branch-slug>``
3) In each worktree window:
   - **Work inside the worktree directory** - All file modifications happen within the worktree (e.g., `.worktrees/wt-feat-add-color/`). The worktree is the working directory for that branch.
   - Work only on that branch's purpose (a task or a feature variant).
   - **Modify files within the worktree** - Edit, create, and delete files inside the worktree directory. All changes are isolated to that branch.
   - **Commit from within the worktree** - Perform all git operations (add, commit, push) from the worktree directory, committing to that branch.
   - Commit early and often.
   - Push regularly.

## Switching
- Switch tasks by switching Cursor windows (not by switching branches inside one folder).
- Treat each worktree chat as dedicated to that branch.

## Ticketing Idea (Worktrees as Tickets)
Treat each worktree like a lightweight ticket with scope, state, and ownership.

Each worktree should contain:
- `.agent-task-context/Context.md` — detailed ticket description (goal, scope, definition of done, step-by-step instructions)
- `.agent-task-context/STATE.<status>` — state file (one of: STATE.unclaimed, STATE.claimed, STATE.paused, STATE.done, STATE.abandoned)
- `.agent-task-context/OWNER.<chat-id>` — owner file (filename contains the owner chat ID)

### File-Based State System

State is stored using separate files for faster directory listing operations:

**State Files:**
- `.agent-task-context/STATE.unclaimed` — no one is working on it yet
- `.agent-task-context/STATE.claimed` — actively owned by a specific chat/window
- `.agent-task-context/STATE.paused` — owned, but temporarily inactive
- `.agent-task-context/STATE.done` — ready for PR/merge (or ready to remove if abandoned)
- `.agent-task-context/STATE.abandoned` — intentionally left behind; safe to reclaim

**Owner File:**
- `.agent-task-context/OWNER.<chat-id>` — contains the owner chat ID in the filename
- Example: `.agent-task-context/OWNER.taskmaster__feat-add-color__2024-01-15__1430__01`

**Rules:**
- Only ONE STATE.* file should exist at a time
- Only ONE OWNER.* file should exist at a time (or none if unclaimed)
- The presence of a STATE.* file indicates the current status
- The presence of an OWNER.* file indicates ownership (and the filename contains the owner ID)

### Ownership rule
- If a worktree has `STATE.claimed` and an `OWNER.*` file with a different chat ID, do not work on it.
- If it has `STATE.unclaimed`, `STATE.paused`, or `STATE.abandoned`, claim it before working.

### State Commands

Read status (which STATE.* file exists):
```sh
ls .agent-task-context/STATE.* 2>/dev/null | sed 's|.*/STATE\.||'
```

Read owner (filename of OWNER.* file):
```sh
ls .agent-task-context/OWNER.* 2>/dev/null | sed 's|.*/OWNER\.||'
```

Check if claimed:
```sh
[ -f .agent-task-context/STATE.claimed ]
```

Check if unclaimed:
```sh
[ -f .agent-task-context/STATE.unclaimed ]
```

Check ownership (replace OWNER_ID with generated ownerChatId):
```sh
[ -f ".agent-task-context/OWNER.OWNER_ID" ]
```

Check if worktree is mine (STATE.claimed exists AND OWNER file matches):
```sh
[ -f .agent-task-context/STATE.claimed ] && [ -f ".agent-task-context/OWNER.OWNER_ID" ]
```

Set state (remove all STATE.* files, create new one):
```sh
rm -f .agent-task-context/STATE.* && touch .agent-task-context/STATE.<status>
```

Set owner (remove all OWNER.* files, create new one):
```sh
rm -f .agent-task-context/OWNER.* && touch ".agent-task-context/OWNER.OWNER_ID"
```

Claim a worktree:
```sh
rm -f .agent-task-context/STATE.* .agent-task-context/OWNER.* && touch .agent-task-context/STATE.claimed && touch ".agent-task-context/OWNER.OWNER_ID"
```

Pause a worktree (keep owner):
```sh
OWNER_FILE=$(ls .agent-task-context/OWNER.* 2>/dev/null | head -1)
rm -f .agent-task-context/STATE.* && touch .agent-task-context/STATE.paused
[ -n "$OWNER_FILE" ] && touch "$OWNER_FILE"
```

Complete a worktree:
```sh
rm -f .agent-task-context/STATE.* .agent-task-context/OWNER.* && touch .agent-task-context/STATE.done
```

Abandon a worktree:
```sh
rm -f .agent-task-context/STATE.* .agent-task-context/OWNER.* && touch .agent-task-context/STATE.abandoned
```

### Detailed Context.md Structure (for Junior Developers)

The Context.md file should be comprehensive and treat the executing agent as a beginner or junior developer. Include:

**Required Sections:**
1. **Goal** — Clear, one-sentence objective
2. **Background** — Why this task exists, what problem it solves
3. **Scope** — Explicitly list:
   - Touch-only paths (files/directories that CAN be modified)
   - Do-not-touch paths (files/directories that MUST NOT be modified)
   - Dependencies or related systems to be aware of
4. **Step-by-Step Instructions** — Detailed, actionable steps:
   - What to do first
   - What to check before proceeding
   - Common pitfalls to avoid
   - How to verify each step
5. **Definition of Done** — Clear checklist of completion criteria
6. **Examples** — Code examples, patterns to follow, or reference implementations
7. **Troubleshooting** — Common issues and how to resolve them
8. **Notes / Decisions** — Important decisions made, handoff items, or future considerations

**Writing Style:**
- Use clear, simple language
- Explain the "why" behind instructions, not just the "what"
- Include explicit file paths and commands
- Add warnings about common mistakes
- Provide context about the codebase structure if relevant

## Safety Rules
- Never edit the same file in two worktrees at the same time.
- If two streams must touch the same file, sequence the work:
  - finish/merge one branch first, then rebase/merge into the other.
- Keep active worktrees limited (recommended: 2–4) to avoid overhead.

## Maintenance
List worktrees:
```sh
git worktree list
```

Remove a finished worktree (after merging or abandoning):
```sh
git worktree remove .worktrees/wt-<branch-slug>
```

Delete the local branch when done (optional):
```sh
git branch -d <branch-name>
```
(or -D only if you intentionally want to force-delete locally)

Clean stale metadata:
```sh
git worktree prune
```

## Success Criteria
This workflow is correct if:
- Each parallel effort (task or feature variant) has its own branch and its own worktree folder under .worktrees/ using ``wt-<branch-slug>`` (kebab-case, no subfolders).
- Each worktree is opened in its own Cursor window/chat.
- Work does not leak between branches.
- Each active worktree has `.agent-task-context/Context.md`, `.agent-task-context/STATE.<status>`, and optionally `.agent-task-context/OWNER.<chat-id>` so ownership and scope are always visible.