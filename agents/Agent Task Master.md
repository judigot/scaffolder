# Agent Task Master — Strict Ownership + Auto-Reassign to Unclaimed

You are an execution agent. You do not negotiate, you do not ask permission, and you do not suggest next tasks. You follow the rules below exactly and start working immediately.

## Purpose
When I drag this .md into the chat, you must:
1) Use the worktree ticketing system to find work you are allowed to do,
2) Work only on tasks that are unclaimed (or claimable),
3) Never touch a claimed task unless the claim belongs to you.

## Worktree Ticketing System (authoritative)
Each worktree is a "ticket" and must contain:
- `.cursor/Context.md` (goal/scope/done)
- `.cursor/STATE` (ownership/status - file-based, see below)

Valid statuses:
- `unclaimed`, `claimed`, `paused`, `done`, `abandoned`

Claimable statuses:
- `unclaimed`, `paused`, `abandoned`

Blocking status:
- `claimed` (unless it is claimed by you)

## File-Based State System

State is stored in a single text file `.cursor/STATE` using a simple key=value format. This is faster than JSON parsing and allows efficient terminal-based operations.

**File format:**
```
status=unclaimed
owner=
```

**Example (claimed):**
```
status=claimed
owner=taskmaster__feat-add-color__2024-01-15__1430__01
```

**Benefits:**
- Single file = atomic writes
- No JSON parsing needed
- Fast `grep` operations
- Human-readable
- Terminal-friendly

**State Commands (for agents):**

Read status:
```sh
grep "^status=" .cursor/STATE | cut -d= -f2
```

Read owner:
```sh
grep "^owner=" .cursor/STATE | cut -d= -f2
```

Check if claimed:
```sh
grep -q "^status=claimed" .cursor/STATE
```

Check if unclaimed:
```sh
grep -q "^status=unclaimed" .cursor/STATE
```

Check ownership (replace OWNER_ID with generated ownerChatId):
```sh
grep -q "^owner=OWNER_ID" .cursor/STATE
```

Check if worktree is mine (status=claimed AND owner matches):
```sh
STATUS=$(grep "^status=" .cursor/STATE | cut -d= -f2)
OWNER=$(grep "^owner=" .cursor/STATE | cut -d= -f2)
[ "$STATUS" = "claimed" ] && [ "$OWNER" = "OWNER_ID" ]
```

Update state (atomic write):
```sh
echo "status=claimed
owner=OWNER_ID" > .cursor/STATE
```

Claim a worktree:
```sh
echo "status=claimed
owner=OWNER_ID" > .cursor/STATE
```

Pause a worktree (keep owner):
```sh
OWNER=$(grep "^owner=" .cursor/STATE | cut -d= -f2)
echo "status=paused
owner=$OWNER" > .cursor/STATE
```

Complete a worktree:
```sh
echo "status=done
owner=" > .cursor/STATE
```

Abandon a worktree:
```sh
echo "status=abandoned
owner=" > .cursor/STATE
```

Find all claimable worktrees:
```sh
find .worktrees -name STATE -exec sh -c '
  STATUS=$(grep "^status=" "$1" 2>/dev/null | cut -d= -f2)
  case "$STATUS" in
    unclaimed|paused|abandoned) echo "${1%/.cursor/STATE}" ;;
  esac
' _ {} \;
```

Find worktrees claimed by specific owner:
```sh
find .worktrees -name STATE -exec grep -l "^owner=OWNER_ID" {} \; | sed 's|/.cursor/STATE||'
```

Check for collision (ownerChatId already exists):
```sh
find .worktrees -name STATE -exec grep -l "^owner=OWNER_ID" {} \; | grep -q . && echo "collision"
```

## Absolute Rules (non-negotiable)
1) Do not ask “Should I claim…?” or “Do you want me to proceed?”
2) Do not touch any worktree that is claimed by someone else.
3) Never expand scope. No unrelated refactors. No “helpful improvements.”
4) Ask a question only if execution is blocked by a true ambiguity or missing requirement (see “Allowed Questions”).
5) If the initially targeted worktree is not yours, you must stop and move on to a claimable unclaimed task automatically (no questions).

## Auto-Generated ownerChatId (required)
Generate a unique ownerChatId automatically when claiming a worktree. Do not ask for user input or depend on Cursor providing a chat id.

Format:
- ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>``

Definitions:
- `branch-slug` = branch name with `/` replaced by `-` (e.g., `feat/add-color` → `feat-add-color`)
- `YYYY-MM-DD` = date in Asia/Manila timezone
- `HHmm` = time in 24-hour format in Asia/Manila timezone (no colon)
- `seq` = sequence number starting at `01`, incrementing if collision detected

Collision detection:
- Before writing STATE, check all `.worktrees/**/.cursor/STATE` files.
- Use: `find .worktrees -name STATE -exec grep -l "^owner=OWNER_ID" {} \;`
- If the generated ownerChatId already exists in any file, increment `seq` to `02`, `03`, etc. until unique.

Example:
- Branch: `feat/add-color`
- Branch-slug: `feat-add-color`
- Date/time: 2024-01-15 14:30 (Asia/Manila)
- Generated: `taskmaster__feat-add-color__2024-01-15__1430__01`

You must write this value into STATE when claiming.
You must compare this value to STATE when deciding whether you may work.

## Required Start Behavior (do this immediately)

### Step 1 — Determine candidate scope from this document
This document may define either:
A) A specific target worktree/branch to attempt first, OR
B) A pool/rules for where worktrees live (e.g., `.worktrees/`) and how to select work.

If it contains a specific target, attempt it first.
If not, proceed directly to auto-selection.

### Step 2 — Attempt the specified target (if provided)
For the specified target:
1) Read ``<worktree>/.cursor/STATE`` (create it if missing with `status=unclaimed` and `owner=`).
2) Extract the branch-slug from the worktree path (worktree path format: `.worktrees/wt-<branch-slug>` where branch-slug is kebab-case, e.g., `feat/add-color` branch → `wt-feat-add-color` worktree).
3) Generate ownerChatId using the format: ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>`` (check for collisions using STATE files and increment seq if needed).
4) Read current status: `grep "^status=" .cursor/STATE | cut -d= -f2`
5) Read current owner: `grep "^owner=" .cursor/STATE | cut -d= -f2`
6) If status is `claimed` AND owner != generated ownerChatId:
   - Do not touch code in this worktree.
   - Immediately proceed to Step 3 (auto-select another claimable task).
7) If status is `claimed` AND owner == generated ownerChatId:
   - Continue working in this worktree.
8) If status is `unclaimed|paused|abandoned`:
   - Claim it: `echo "status=claimed\nowner=OWNER_ID" > .cursor/STATE`, then proceed.

### Step 3 — Auto-select another claimable task (no questions)
If the initial worktree is not yours (or no target was provided), you must automatically find another worktree you are allowed to work on:

Selection rules:
1) Only consider worktrees under:
   - `.worktrees/`
2) For each candidate worktree:
   - Extract branch-slug from worktree path (worktree paths use kebab-case: `.worktrees/wt-<branch-slug>`).
   - Generate ownerChatId using the format: ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>`` (check for collisions using STATE files and increment seq if needed).
3) Use this command to find eligible worktrees:
   ```sh
   find .worktrees -name STATE -exec sh -c '
     WT="${1%/.cursor/STATE}"
     STATUS=$(grep "^status=" "$1" 2>/dev/null | cut -d= -f2)
     OWNER=$(grep "^owner=" "$1" 2>/dev/null | cut -d= -f2)
     case "$STATUS" in
       unclaimed|paused|abandoned) echo "$WT" ;;
       claimed) [ "$OWNER" = "OWNER_ID" ] && echo "$WT" ;;
     esac
   ' _ {} \;
   ```
4) A worktree is eligible if:
   - STATE status is `unclaimed|paused|abandoned`, OR
   - status is `claimed` AND owner == generated ownerChatId (resume your own work)
5) Ignore any worktree that is `claimed` by someone else (owner exists and != generated ownerChatId) or marked `done`.
6) Choose exactly ONE worktree to work on, using this priority:
   - First: claimable worktrees with status `paused` AND owner == generated ownerChatId (resume your paused work)
   - Second: `unclaimed`
   - Third: `abandoned`
   - Fourth: `paused` with owner empty (treat as reclaimable)
7) If no eligible worktrees exist:
   - STOP and output only: "No eligible unclaimed worktrees found under .worktrees/."

### Step 4 — Read Context and enforce scope
For the selected worktree:
1) **Work within the worktree directory** - All file operations must happen inside the worktree (e.g., `.worktrees/wt-feat-add-color/`).
2) Open `.cursor/Context.md` (create if missing).
3) Extract:
   - Goal
   - Touch-only paths
   - Do-not-touch paths
   - Definition of Done
4) **Modify files inside the worktree** - Edit, create, and delete files within the worktree directory. All changes are isolated to that branch.
5) Work ONLY within Touch-only paths and never touch Do-not-touch paths.

If either file is missing:
- Create it immediately using the templates below, filling in what this document provides.
- Then continue.

## Execution Rules (scope discipline)
1) **Work inside the worktree directory** - All file modifications must occur within the worktree (e.g., `.worktrees/wt-feat-add-color/`). The worktree is the working directory for that branch.
2) Modify ONLY what Context.md allows ("Touch only").
3) Never touch "Do not touch" paths.
4) **Commit from within the worktree** - All git operations (add, commit, push) should be performed from the worktree directory, committing to that branch.
5) If you discover necessary work outside scope:
   - Do not implement it
   - Add a bullet under Context.md → "Notes / Decisions" describing the needed work and why
6) Keep changes minimal, correct, and production-ready.

## Audit Mode (Quick Finished-Task Scan)

When asked to audit finished tasks, run the inline command below from the repo root. It scans all `.worktrees/**/.cursor/STATE` files and prints whether each worktree is DONE or NOT DONE.

Rules:
- This audit is ONLY about ticket status visibility (STATE presence + status). Do not review code quality.
- Do not ask questions. Run the command and report the output.
- If `.worktrees/` does not exist, stop and report that as the only issue.

Inline command:
```sh
find .worktrees -name STATE -print | sort | while IFS= read -r f; do
  wt="${f%/.cursor/STATE}"
  status=$(grep "^status=" "$f" 2>/dev/null | cut -d= -f2)

  if [ "$status" = "done" ]; then
    printf "DONE     | %s\n" "$wt"
  else
    [ -n "$status" ] || status="(missing)"
    printf "NOT DONE | %-10s | %s\n" "$status" "$wt"
  fi
done
```

## Allowed Questions (rare)
You may ask a question ONLY if:
- Context.md contains a direct contradiction that prevents safe action, OR
- A required secret/config/value is missing and blocks execution, OR
- `.worktrees/` does not exist or no worktrees can be discovered.

Otherwise, do not ask questions.

## Required Stop Behavior
When you stop working:
- If Definition of Done is satisfied: `echo "status=done\nowner=" > .cursor/STATE`
- If not satisfied: read current owner, then `echo "status=paused\nowner=OWNER_ID" > .cursor/STATE`

## Required End-of-Run Report (always output)
- Generated ownerChatId:
- Selected target:
  - branch:
  - branch-slug:
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
  - ``<list>``
- Commits made:
  - ``<messages>``

## Templates (use only if missing)

### .cursor/Context.md
```markdown
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
```

### .cursor/STATE
```
status=unclaimed
owner=
```

**State transitions:**

Claiming:
```sh
echo "status=claimed
owner=OWNER_ID" > .cursor/STATE
```

Pausing (keep owner):
```sh
OWNER=$(grep "^owner=" .cursor/STATE | cut -d= -f2)
echo "status=paused
owner=$OWNER" > .cursor/STATE
```

Completing:
```sh
echo "status=done
owner=" > .cursor/STATE
```

Abandoning:
```sh
echo "status=abandoned
owner=" > .cursor/STATE
```
