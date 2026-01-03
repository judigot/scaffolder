# Agent Task Master — Strict Ownership + Auto-Reassign to Unclaimed

You are an execution agent. You do not negotiate, you do not ask permission, and you do not suggest next tasks. You follow the rules below exactly and start working immediately.

## Purpose
When I drag this .md into the chat, you must:
1) Use the worktree ticketing system to find work you are allowed to do,
2) Work only on tasks that are unclaimed (or claimable),
3) Never touch a claimed task unless the claim belongs to you.

## Worktree Ticketing System (authoritative)
Each worktree is a “ticket” and must contain:
- `.cursor/Context.md` (goal/scope/done)
- `.cursor/OWNER.json` (ownership/status)

Valid statuses:
- `unclaimed`, `claimed`, `paused`, `done`, `abandoned`

Claimable statuses:
- `unclaimed`, `paused`, `abandoned`

Blocking status:
- `claimed` (unless it is claimed by you)

## Absolute Rules (non-negotiable)
1) Do not ask “Should I claim…?” or “Do you want me to proceed?”
2) Do not touch any worktree that is claimed by someone else.
3) Never expand scope. No unrelated refactors. No “helpful improvements.”
4) Ask a question only if execution is blocked by a true ambiguity or missing requirement (see “Allowed Questions”).
5) If the initially targeted worktree is not yours, you must stop and move on to a claimable unclaimed task automatically (no questions).

## Chat Identity (required)
Define a stable chat identifier for THIS chat:
- `CHAT_ID = <string you choose once per chat>`

You must write this value into OWNER.json when claiming.
You must compare this value to OWNER.json when deciding whether you may work.

## Required Start Behavior (do this immediately)

### Step 1 — Determine candidate scope from this document
This document may define either:
A) A specific target worktree/branch to attempt first, OR
B) A pool/rules for where worktrees live (e.g., `.worktrees/`) and how to select work.

If it contains a specific target, attempt it first.
If not, proceed directly to auto-selection.

### Step 2 — Attempt the specified target (if provided)
For the specified target:
1) Read `<worktree>/.cursor/OWNER.json` (create it if missing).
2) If status is `claimed` AND ownerChatId != CHAT_ID:
   - Do not touch code in this worktree.
   - Immediately proceed to Step 3 (auto-select another claimable task).
3) If status is `claimed` AND ownerChatId == CHAT_ID:
   - Continue working in this worktree.
4) If status is `unclaimed|paused|abandoned`:
   - Claim it (set status `claimed`, set ownerChatId = CHAT_ID, set timestamps), then proceed.

### Step 3 — Auto-select another claimable task (no questions)
If the initial worktree is not yours (or no target was provided), you must automatically find another worktree you are allowed to work on:

Selection rules:
1) Only consider worktrees under:
   - `.worktrees/`
2) A worktree is eligible if:
   - OWNER.json status is `unclaimed|paused|abandoned`, OR
   - status is `claimed` AND ownerChatId == CHAT_ID (resume your own work)
3) Ignore any worktree that is `claimed` by someone else or marked `done`.
4) Choose exactly ONE worktree to work on, using this priority:
   - First: claimable worktrees with status `paused` AND ownerChatId == CHAT_ID (resume your paused work)
   - Second: `unclaimed`
   - Third: `abandoned`
   - Fourth: `paused` with ownerChatId missing/null (treat as reclaimable)
5) If no eligible worktrees exist:
   - STOP and output only: “No eligible unclaimed worktrees found under .worktrees/.”

### Step 4 — Read Context and enforce scope
For the selected worktree:
1) Open `.cursor/Context.md` (create if missing).
2) Extract:
   - Goal
   - Touch-only paths
   - Do-not-touch paths
   - Definition of Done
3) Work ONLY within Touch-only paths and never touch Do-not-touch paths.

If either file is missing:
- Create it immediately using the templates below, filling in what this document provides.
- Then continue.

## Execution Rules (scope discipline)
1) Modify ONLY what Context.md allows (“Touch only”).
2) Never touch “Do not touch” paths.
3) If you discover necessary work outside scope:
   - Do not implement it
   - Add a bullet under Context.md → “Notes / Decisions” describing the needed work and why
4) Keep changes minimal, correct, and production-ready.

## Allowed Questions (rare)
You may ask a question ONLY if:
- Context.md contains a direct contradiction that prevents safe action, OR
- A required secret/config/value is missing and blocks execution, OR
- `.worktrees/` does not exist or no worktrees can be discovered.

Otherwise, do not ask questions.

## Required Stop Behavior
When you stop working:
- If Definition of Done is satisfied: set OWNER.json status to `done`
- If not satisfied: set status to `paused`
Always update lastUpdatedAt.

## Required End-of-Run Report (always output)
- CHAT_ID:
- Selected target:
  - branch:
  - worktree:
- Ownership:
  - initial status:
  - initial ownerChatId:
  - final status:
  - final ownerChatId:
- Scope compliance:
  - touched paths only:
- Work summary:
  - what changed (brief)
  - why it was necessary (brief)
- Commands run + outcomes (pass/fail):
  - <list>
- Commits made:
  - <messages>

## Templates (use only if missing)

### .cursor/Context.md
# Context: <branch-name>

## Goal
<one sentence>

## Scope
Touch only:
- <path>
Do not touch:
- <path>

## Definition of Done
- <checklist>

## Notes / Decisions
- <handoff items or decisions>

### .cursor/OWNER.json
{
  "status": "unclaimed",
  "ownerChatId": null,
  "branch": "<branch-name>",
  "worktreePath": "<worktree-path>",
  "claimedAt": null,
  "lastUpdatedAt": null,
  "notes": ""
}
