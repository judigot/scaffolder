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
- feat/<feature-name>
Examples:
- feat/add-color
- feat/add-color-v2

Worktree folder:
- .worktrees/wt-<branch-name>

Examples:
- feat/add-color       → .worktrees/wt-feat/add-color
- feat/add-color-v2    → .worktrees/wt-feat/add-color-v2

Rules:
- The worktree folder name is always `wt-` + the exact branch name.
- Branch names may contain `/`, so the worktree folder may contain subfolders (intended).
- A single branch cannot be checked out in two worktrees at the same time. If you want parallel variants, use separate branches (e.g., `feat/add-color` and `feat/add-color-v2`).

## Create Worktrees (from repo root)
1) Ensure base folder exists:
- mkdir -p .worktrees

2) Create a worktree + branch:
- git worktree add .worktrees/wt-<branch-name> -b <branch-name>

Examples:
- git worktree add .worktrees/wt-feat/add-color -b feat/add-color
- git worktree add .worktrees/wt-feat/add-color-v2 -b feat/add-color-v2
- git worktree add .worktrees/wt-feat/auth -b feat/auth

If the branch already exists:
- git worktree add .worktrees/wt-<branch-name> <branch-name>

## Cursor Workflow (mandatory)
1) Keep one Cursor window opened on the main repo (coordination only).
2) For each active worktree:
   - File → New Window
   - Open Folder… → .worktrees/wt-<branch-name>
3) In each worktree window:
   - Work only on that branch’s purpose (a task or a feature variant).
   - Commit early and often.
   - Push regularly.

## Switching
- Switch tasks by switching Cursor windows (not by switching branches inside one folder).
- Treat each worktree chat as dedicated to that branch.

## Ticketing Idea (Worktrees as Tickets)
Treat each worktree like a lightweight ticket with scope, state, and ownership.

Each worktree should contain:
- `.cursor/Context.md` — ticket description (goal, scope, definition of done)
- `.cursor/OWNER.json` — ticket state + assignment (who “owns” this worktree)

### Required statuses (OWNER.json)
- `unclaimed`: no one is working on it yet
- `claimed`: actively owned by a specific chat/window
- `paused`: owned, but temporarily inactive
- `done`: ready for PR/merge (or ready to remove if abandoned)
- `abandoned`: intentionally left behind; safe to reclaim

### Ownership rule
- If a worktree is `claimed` by someone else, do not work on it.
- If it is `unclaimed`, `paused`, or `abandoned`, claim it before working.

### Minimal OWNER.json fields (recommended)
- `status`
- `ownerChatId` (a stable identifier you choose for that window/chat)
- `branch`
- `worktreePath`
- `claimedAt`
- `lastUpdatedAt`
- `notes`

### Minimal Context.md sections (recommended)
- Goal (one sentence)
- Scope (touch-only / do-not-touch)
- Definition of Done
- Notes / Decisions

## Safety Rules
- Never edit the same file in two worktrees at the same time.
- If two streams must touch the same file, sequence the work:
  - finish/merge one branch first, then rebase/merge into the other.
- Keep active worktrees limited (recommended: 2–4) to avoid overhead.

## Maintenance
List worktrees:
- git worktree list

Remove a finished worktree (after merging or abandoning):
- git worktree remove .worktrees/wt-<branch-name>

Delete the local branch when done (optional):
- git branch -d <branch-name>
(or -D only if you intentionally want to force-delete locally)

Clean stale metadata:
- git worktree prune

## Success Criteria
This workflow is correct if:
- Each parallel effort (task or feature variant) has its own branch and its own worktree folder under .worktrees/ using `wt-<branch-name>`.
- Each worktree is opened in its own Cursor window/chat.
- Work does not leak between branches.
- Each active worktree has `.cursor/Context.md` and `.cursor/OWNER.json` so ownership and scope are always visible.
