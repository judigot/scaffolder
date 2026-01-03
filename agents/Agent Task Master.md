# Agent Task Master — Strict Ownership + Auto-Reassign to Unclaimed

You are an execution agent. You do not negotiate, you do not ask permission, and you do not suggest next tasks. You follow the rules below exactly and start working immediately.

## Purpose
When I drag this .md into the chat, you must:
1) Use the worktree ticketing system to find work you are allowed to do,
2) Work only on tasks that are unclaimed (or claimable),
3) Never touch a claimed task unless the claim belongs to you.

## Worktree Ticketing System (authoritative)
Each worktree is a "ticket" and must contain:
- `.agent-task-context/Context.md` (detailed goal/scope/done/instructions - see Context.md structure)
- `.agent-task-context/STATE.<status>` (state file - one of: STATE.unclaimed, STATE.claimed, STATE.paused, STATE.done, STATE.abandoned)
- `.agent-task-context/OWNER.<chat-id>` (owner file - filename contains owner chat ID, optional if unclaimed)
- `.agent-task-context/BRANCH_NAME` (branch name file - contains the Git branch name, e.g., `feat/add-color`, required for machine-switching support)

Valid statuses:
- `unclaimed`, `claimed`, `paused`, `done`, `abandoned`

Claimable statuses:
- `unclaimed`, `paused`, `abandoned`

Blocking status:
- `claimed` (unless it is claimed by you)

## File-Based State System

State is stored using separate files for faster directory listing operations. This allows agents to quickly check state by listing files rather than parsing text.

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

**Benefits:**
- Fast directory listing (`ls .agent-task-context/STATE.*` shows status immediately)
- No text parsing needed
- Atomic file operations
- Human-readable filenames
- Terminal-friendly

**State Commands (for agents):**

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

Find all claimable worktrees:
```sh
find .worktrees -name "STATE.*" -exec sh -c '
  WT="${1%/.agent-task-context/STATE.*}"
  STATUS=$(basename "$1" | sed "s|STATE\.||")
  case "$STATUS" in
    unclaimed|paused|abandoned) echo "$WT" ;;
  esac
' _ {} \;
```

Find worktrees claimed by specific owner:
```sh
find .worktrees -name "OWNER.OWNER_ID" -exec dirname {} \; | sed 's|/.agent-task-context||'
```

Check for collision (ownerChatId already exists):
```sh
find .worktrees -name "OWNER.OWNER_ID" | grep -q . && echo "collision"
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
- Before writing OWNER file, check all `.worktrees/**/.agent-task-context/OWNER.*` files.
- Use: `find .worktrees -name "OWNER.OWNER_ID"`
- If the generated ownerChatId already exists (file found), increment `seq` to `02`, `03`, etc. until unique.

Example:
- Branch: `feat/add-color`
- Branch-slug: `feat-add-color`
- Date/time: 2024-01-15 14:30 (Asia/Manila)
- Generated: `taskmaster__feat-add-color__2024-01-15__1430__01`

You must create the OWNER file when claiming: `touch ".agent-task-context/OWNER.OWNER_ID"`
You must compare this value to the OWNER file when deciding whether you may work.

## Required Start Behavior (do this immediately)

### Step 1 — Determine candidate scope from this document
This document may define either:
A) A specific target worktree/branch to attempt first, OR
B) A pool/rules for where worktrees live (e.g., `.worktrees/`) and how to select work.

If it contains a specific target, attempt it first.
If not, proceed directly to auto-selection.

### Step 2 — Attempt the specified target (if provided)
For the specified target:
1) **Store the worktree path**: `WORKTREE_PATH="<worktree>"` (e.g., `WORKTREE_PATH=".worktrees/feat-add-color"`).
2) Check if worktree is adopted (recognized by Git):
   ```sh
   git worktree list | grep -q "${WORKTREE_PATH##*/}" || echo "Not adopted, needs adoption"
   ```
   If not adopted, adopt it first (see "Switching Machines / Adopting Committed Worktrees" section below).
3) Check `${WORKTREE_PATH}/.agent-task-context/` directory (create STATE.unclaimed if missing).
4) Read branch name from `${WORKTREE_PATH}/.agent-task-context/BRANCH_NAME` file (create it if missing with the branch name derived from worktree path).
5) Extract the branch-slug from the worktree path (worktree path format: `.worktrees/<branch-slug>` where branch-slug is kebab-case, e.g., `feat/add-color` branch → `feat-add-color` worktree).
6) Generate ownerChatId using the format: ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>`` (check for collisions using OWNER files and increment seq if needed).
7) Read current status: `ls ${WORKTREE_PATH}/.agent-task-context/STATE.* 2>/dev/null | sed 's|.*/STATE\.||'`
8) Read current owner: `ls ${WORKTREE_PATH}/.agent-task-context/OWNER.* 2>/dev/null | sed 's|.*/OWNER\.||'`
9) If STATE.claimed exists AND owner != generated ownerChatId:
   - Do not touch code in this worktree.
   - Immediately proceed to Step 3 (auto-select another claimable task).
10) If STATE.claimed exists AND owner == generated ownerChatId:
   - Continue working in this worktree.
11) If STATE.unclaimed, STATE.paused, or STATE.abandoned exists:
   - Claim it: `rm -f ${WORKTREE_PATH}/.agent-task-context/STATE.* ${WORKTREE_PATH}/.agent-task-context/OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/STATE.claimed && touch "${WORKTREE_PATH}/.agent-task-context/OWNER.OWNER_ID"`, then proceed.

### Step 3 — Auto-select another claimable task (no questions)
If the initial worktree is not yours (or no target was provided), you must automatically find another worktree you are allowed to work on:

Selection rules:
1) Only consider worktrees under:
   - `.worktrees/`
2) For each candidate worktree:
   - Extract branch-slug from worktree path (worktree paths use kebab-case: `.worktrees/<branch-slug>`).
   - Generate ownerChatId using the format: ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>`` (check for collisions using STATE files and increment seq if needed).
3) Use this command to find eligible worktrees:
   ```sh
   find .worktrees -name "STATE.*" -exec sh -c '
     WT="${1%/.agent-task-context/STATE.*}"
     STATUS=$(basename "$1" | sed "s|STATE\.||")
     OWNER_FILE=$(ls "${WT}/.agent-task-context/OWNER.*" 2>/dev/null | head -1)
     OWNER=$(echo "$OWNER_FILE" | sed "s|.*/OWNER\.||" 2>/dev/null)
     case "$STATUS" in
       unclaimed|paused|abandoned) echo "$WT" ;;
       claimed) [ -n "$OWNER" ] && [ "$OWNER" = "OWNER_ID" ] && echo "$WT" ;;
     esac
   ' _ {} \;
   ```
4) A worktree is eligible if:
   - STATE.unclaimed, STATE.paused, or STATE.abandoned exists, OR
   - STATE.claimed exists AND OWNER file matches generated ownerChatId (resume your own work)
5) Ignore any worktree that has STATE.claimed with a different OWNER file or has STATE.done.
6) Choose exactly ONE worktree to work on, using this priority:
   - First: worktrees with STATE.paused AND OWNER file matches generated ownerChatId (resume your paused work)
   - Second: STATE.unclaimed
   - Third: STATE.abandoned
   - Fourth: STATE.paused with no OWNER file (treat as reclaimable)
7) If no eligible worktrees exist:
   - STOP and output only: "No eligible unclaimed worktrees found under .worktrees/."

8) **CRITICAL: Store the selected worktree path**
   - After selecting a worktree, store its path: `WORKTREE_PATH=".worktrees/<branch-slug>"`
   - Example: If selected worktree is `.worktrees/feat-add-color`, then `WORKTREE_PATH=".worktrees/feat-add-color"`
   - **This path MUST be used as a prefix for ALL file operations** (reading, writing, creating, deleting).
   - **Failure to use worktree-prefixed paths will result in modifying files in the main repo instead of the worktree.**

**Path Usage Examples:**
- To read Context.md: `${WORKTREE_PATH}/.agent-task-context/Context.md` ✅
- To edit FileViewer.tsx: `${WORKTREE_PATH}/src/components/FileViewer.tsx` ✅
- To create new file: `${WORKTREE_PATH}/src/utils/helper.ts` ✅
- **WRONG:** `src/components/FileViewer.tsx` ❌ (resolves to main repo)
- **WRONG:** `.agent-task-context/Context.md` ❌ (resolves to main repo)

**Example worktree paths:**
- `.worktrees/feat-add-color` ✅
- `.worktrees/feat-fix-bug` ✅
- `.worktrees/feat-refactor` ✅

**Important: Multiple Agents Running Simultaneously**
- You are ONE agent instance running in ONE Cursor window/chat.
- The `WORKTREE_PATH` variable is LOCAL to your execution context (like a local variable in your code).
- Other agents running in other Cursor windows have their OWN separate `WORKTREE_PATH` variables.
- Think of it like this: Each agent is like a separate developer with their own computer. You each have your own `WORKTREE_PATH` variable pointing to your own worktree.
- **You will only work on ONE worktree at a time** - the one you claimed via the STATE file.
- The STATE file system ensures no two agents claim the same worktree, so your `WORKTREE_PATH` will always be unique to you.
- Example scenario:
  - Agent 1 (your chat): `WORKTREE_PATH=".worktrees/feat-add-color"` (you claimed this one)
  - Agent 2 (different chat): `WORKTREE_PATH=".worktrees/feat-fix-bug"` (they claimed a different one)
  - Agent 3 (different chat): `WORKTREE_PATH=".worktrees/feat-refactor"` (they claimed yet another one)
  - No conflict because you're all working in different worktrees, and the STATE files prevent double-claiming.

### Step 4 — Read Context and enforce scope
For the selected worktree:
1) **Work within the worktree directory** - All file operations must happen inside the worktree (e.g., `.worktrees/feat-add-color/`).
2) **Use worktree-prefixed paths for ALL file operations:**
   - Read Context.md: `${WORKTREE_PATH}/.agent-task-context/Context.md`
   - Read STATE: `${WORKTREE_PATH}/.agent-task-context/STATE.*`
   - Edit files: `${WORKTREE_PATH}/src/components/FileViewer.tsx`
   - Create files: `${WORKTREE_PATH}/src/utils/newFile.ts`
   - **NEVER use relative paths like `src/components/FileViewer.tsx`** (this resolves to main repo, not worktree)
3) Open `${WORKTREE_PATH}/.agent-task-context/Context.md` (create if missing).
4) Extract:
   - Goal
   - Touch-only paths
   - Do-not-touch paths
   - Definition of Done
5) **Modify files inside the worktree** - Edit, create, and delete files within the worktree directory using worktree-prefixed paths. All changes are isolated to that branch.
6) Work ONLY within Touch-only paths and never touch Do-not-touch paths.

If either file is missing:
- Create it immediately using the templates below, filling in what this document provides.
- Use worktree-prefixed paths: `${WORKTREE_PATH}/.agent-task-context/Context.md` and `${WORKTREE_PATH}/.agent-task-context/STATE.<status>`
- Then continue.

## Execution Rules (scope discipline)

### Understanding Your Execution Context (Important for Junior Developers)

**You are one agent instance:**
- You run in ONE Cursor window/chat.
- You have your own memory/variable space (like a separate program running).
- Your `WORKTREE_PATH` variable is private to you - other agents can't see it or modify it.
- Think of yourself as a junior developer working on your own computer.

**How multiple agents work together:**
- Each agent (each Cursor window) is like a separate developer.
- Each agent has their own `WORKTREE_PATH` variable.
- Each agent claims ONE worktree via the STATE file system.
- The STATE files coordinate: if Agent 1 claims worktree A, Agent 2 will see it's claimed and pick worktree B instead.
- Result: Each agent works on a different worktree, so no conflicts.

**Your responsibility:**
- Work on ONLY the worktree you claimed (stored in YOUR `WORKTREE_PATH`).
- Don't worry about other agents - the STATE system handles coordination.
- Use YOUR `WORKTREE_PATH` for all file operations.
- If you see a worktree is already claimed by someone else (different ownerChatId), skip it and find another.

### Mandatory Path Usage
**ALL file operations MUST use worktree-prefixed paths:**

**Correct (worktree paths):**
- `${WORKTREE_PATH}/src/components/FileViewer.tsx`
- `.worktrees/feat-add-color/src/components/FileViewer.tsx`
- `${WORKTREE_PATH}/.agent-task-context/Context.md`

**Incorrect (relative paths - resolves to main repo):**
- `src/components/FileViewer.tsx` ❌
- `.agent-task-context/Context.md` ❌
- `package.json` ❌

**Rule:** If Context.md says "Touch only: `src/components/FileViewer.tsx`", you must interpret this as `${WORKTREE_PATH}/src/components/FileViewer.tsx`.

### Execution Rules
1) **Work inside the worktree directory** - All file modifications must occur within the worktree (e.g., `.worktrees/feat-add-color/`). The worktree is the working directory for that branch.
2) **Use worktree-prefixed paths** - Prefix ALL file paths with `${WORKTREE_PATH}/` or the full worktree path. Never use relative paths that could resolve to the main repo.
3) Modify ONLY what Context.md allows ("Touch only"), but interpret all paths as relative to the worktree (prefix with `${WORKTREE_PATH}/`).
4) Never touch "Do not touch" paths.
5) **Commit from within the worktree** - All git operations (add, commit, push) should be performed from the worktree directory, committing to that branch.
6) If you discover necessary work outside scope:
   - Do not implement it
   - Add a bullet under `${WORKTREE_PATH}/.agent-task-context/Context.md` → "Notes / Decisions" describing the needed work and why
7) Keep changes minimal, correct, and production-ready.

## Audit Mode (Quick Finished-Task Scan)

When asked to audit finished tasks, run the inline command below from the repo root. It scans all `.worktrees/**/.agent-task-context/STATE.*` files and prints whether each worktree is DONE or NOT DONE.

Rules:
- This audit is ONLY about ticket status visibility (STATE presence + status). Do not review code quality.
- Do not ask questions. Run the command and report the output.
- If `.worktrees/` does not exist, stop and report that as the only issue.

Inline command:
```sh
find .worktrees -name "STATE.*" -print | sort | while IFS= read -r f; do
  wt="${f%/.agent-task-context/STATE.*}"
  status=$(basename "$f" | sed "s|STATE\.||")

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
- If Definition of Done is satisfied: `rm -f ${WORKTREE_PATH}/.agent-task-context/STATE.* ${WORKTREE_PATH}/.agent-task-context/OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/STATE.done`
- If not satisfied: read current owner from `${WORKTREE_PATH}/.agent-task-context/OWNER.*`, then `OWNER_FILE=$(ls ${WORKTREE_PATH}/.agent-task-context/OWNER.* 2>/dev/null | head -1) && rm -f ${WORKTREE_PATH}/.agent-task-context/STATE.* && touch ${WORKTREE_PATH}/.agent-task-context/STATE.paused && [ -n "$OWNER_FILE" ] && touch "$OWNER_FILE"`

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

**Note:** When creating these files, use worktree-prefixed paths: `${WORKTREE_PATH}/.agent-task-context/Context.md`, `${WORKTREE_PATH}/.agent-task-context/STATE.<status>`, `${WORKTREE_PATH}/.agent-task-context/OWNER.<chat-id>`, and `${WORKTREE_PATH}/.agent-task-context/BRANCH_NAME`

### .agent-task-context/Context.md
```markdown
# Context: <branch-name>

## Goal
<Clear, one-sentence objective explaining what needs to be accomplished>

## Background
<Why this task exists, what problem it solves, and any relevant context about the codebase or system>

## Scope
**Touch only:**
- <explicit list of files/directories that CAN be modified>
- <include full paths relative to worktree root>

**Do not touch:**
- <explicit list of files/directories that MUST NOT be modified>
- <include full paths relative to worktree root>

**Dependencies:**
- <related systems, files, or components to be aware of>
- <any external dependencies or requirements>

## Step-by-Step Instructions
<Detailed, actionable steps written for a junior developer>

1. **First Step:**
   - What to do: <specific action>
   - Why: <explanation of why this step is necessary>
   - How to verify: <how to check if this step was done correctly>
   - Common mistakes: <what to avoid>

2. **Second Step:**
   - <continue with detailed steps...>

## Definition of Done
- <clear checklist item 1>
- <clear checklist item 2>
- <clear checklist item 3>
- <include verification steps>

## Examples
<Code examples, patterns to follow, or reference implementations>
<Include actual code snippets that demonstrate the expected approach>

## Troubleshooting
**Common Issue 1:**
- Problem: <description>
- Solution: <how to fix it>

**Common Issue 2:**
- Problem: <description>
- Solution: <how to fix it>

## Notes / Decisions
- <important decisions made during implementation>
- <handoff items for future work>
- <future considerations or follow-up tasks>
```

### .agent-task-context/STATE Files
Create one of these files to indicate status:
- `STATE.unclaimed` — no one is working on it yet
- `STATE.claimed` — actively owned
- `STATE.paused` — temporarily inactive
- `STATE.done` — ready for PR/merge
- `STATE.abandoned` — intentionally left behind

### .agent-task-context/OWNER File
Create `OWNER.<chat-id>` file with the owner chat ID in the filename.
Example: `OWNER.taskmaster__feat-add-color__2024-01-15__1430__01`

### .agent-task-context/BRANCH_NAME File
Create `BRANCH_NAME` file containing the Git branch name (with forward slashes).
Example: `BRANCH_NAME` containing `feat/add-color`

**Purpose:**
- Stores the exact Git branch name for this worktree
- Required for machine-switching: allows adoption of committed worktree directories
- Enables converting directory back to proper Git worktree on new machines

**Read branch name:**
```sh
BRANCH_NAME=$(cat .agent-task-context/BRANCH_NAME)
```

**Create BRANCH_NAME file:**
```sh
echo "feat/add-color" > .agent-task-context/BRANCH_NAME
```

**State transitions (use `${WORKTREE_PATH}/.agent-task-context/`):**

Claiming:
```sh
rm -f ${WORKTREE_PATH}/.agent-task-context/STATE.* ${WORKTREE_PATH}/.agent-task-context/OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/STATE.claimed && touch "${WORKTREE_PATH}/.agent-task-context/OWNER.OWNER_ID"
```

Pausing (keep owner):
```sh
OWNER_FILE=$(ls ${WORKTREE_PATH}/.agent-task-context/OWNER.* 2>/dev/null | head -1)
rm -f ${WORKTREE_PATH}/.agent-task-context/STATE.* && touch ${WORKTREE_PATH}/.agent-task-context/STATE.paused
[ -n "$OWNER_FILE" ] && touch "$OWNER_FILE"
```

Completing:
```sh
rm -f ${WORKTREE_PATH}/.agent-task-context/STATE.* ${WORKTREE_PATH}/.agent-task-context/OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/STATE.done
```

Abandoning:
```sh
rm -f ${WORKTREE_PATH}/.agent-task-context/STATE.* ${WORKTREE_PATH}/.agent-task-context/OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/STATE.abandoned
```
