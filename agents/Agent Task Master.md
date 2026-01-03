# Agent Task Master — Strict Ownership + Auto-Reassign to Unclaimed

You are an execution agent. You do not negotiate, you do not ask permission, and you do not suggest next tasks. You follow the rules below exactly and start working immediately.

## Purpose
When I drag this .md into the chat, you must:
1) Use the worktree ticketing system to find work you are allowed to do,
2) Work only on tasks that are unclaimed (or claimable),
3) Never touch a claimed task unless the claim belongs to you.

## Worktree Ticketing System (authoritative)
Each worktree is a "ticket" and must contain:
- `.agent-task-context/Context.md` (detailed goal/scope/done/instructions - see Context.md structure) - **committed**
- `.agent-task-context/.state/TASK_STATUS.<status>` (task status file - one of: TASK_STATUS.unclaimed, TASK_STATUS.claimed, TASK_STATUS.paused, TASK_STATUS.done, TASK_STATUS.abandoned) - **runtime-only, not committed**
- `.agent-task-context/.state/TASK_OWNER.<agent-id>` (owner file - filename contains owner agent ID, optional if unclaimed) - **runtime-only, not committed**
- `.agent-task-context/BRANCH_NAME` (branch name file - contains the Git branch name, e.g., `feat/add-color`, required for machine-switching support) - **committed**

Valid statuses:
- `unclaimed`, `claimed`, `paused`, `done`, `abandoned`

Claimable statuses:
- `unclaimed`, `paused`, `abandoned`

Blocking status:
- `claimed` (unless it is claimed by you)

## File-Based Task Status System

Task status is stored using separate files for faster directory listing operations. This allows agents to quickly check status by listing files rather than parsing text. These files are runtime-only (not committed) and stored in the `.state/` subdirectory.

**Task Status Files:**
- `.agent-task-context/.state/TASK_STATUS.unclaimed` — no one is working on it yet
- `.agent-task-context/.state/TASK_STATUS.claimed` — actively owned by a specific agent/window
- `.agent-task-context/.state/TASK_STATUS.paused` — owned, but temporarily inactive
- `.agent-task-context/.state/TASK_STATUS.done` — ready for PR/merge (or ready to remove if abandoned)
- `.agent-task-context/.state/TASK_STATUS.abandoned` — intentionally left behind; safe to reclaim

**Task Owner File:**
- `.agent-task-context/.state/TASK_OWNER.<agent-id>` — contains the owner agent ID in the filename
- Example: `.agent-task-context/.state/TASK_OWNER.taskmaster__feat-add-color__2024-01-15__1430__01`

**Rules:**
- Only ONE TASK_STATUS.* file should exist at a time
- Only ONE TASK_OWNER.* file should exist at a time (or none if unclaimed)
- The presence of a TASK_STATUS.* file indicates the current status
- The presence of a TASK_OWNER.* file indicates ownership (and the filename contains the agent ID)
- Only Context.md and BRANCH_NAME are committed; .state/ directory is gitignored

**Benefits:**
- Fast directory listing (`ls .agent-task-context/.state/TASK_STATUS.*` shows status immediately)
- No text parsing needed
- Atomic file operations
- Human-readable filenames
- Terminal-friendly

**Task Status Commands (for agents):**

Read status (which TASK_STATUS.* file exists):
```sh
ls .agent-task-context/.state/TASK_STATUS.* 2>/dev/null | sed 's|.*/TASK_STATUS\.||'
```

Read owner (filename of TASK_OWNER.* file):
```sh
ls .agent-task-context/.state/TASK_OWNER.* 2>/dev/null | sed 's|.*/TASK_OWNER\.||'
```

Check if claimed:
```sh
[ -f .agent-task-context/.state/TASK_STATUS.claimed ]
```

Check if unclaimed:
```sh
[ -f .agent-task-context/.state/TASK_STATUS.unclaimed ]
```

Check ownership (replace AGENT_ID with generated ownerAgentId):
```sh
[ -f ".agent-task-context/.state/TASK_OWNER.AGENT_ID" ]
```

Check if worktree is mine (TASK_STATUS.claimed exists AND TASK_OWNER file matches):
```sh
[ -f .agent-task-context/.state/TASK_STATUS.claimed ] && [ -f ".agent-task-context/.state/TASK_OWNER.AGENT_ID" ]
```

Set task status (remove all TASK_STATUS.* files, create new one):
```sh
rm -f .agent-task-context/.state/TASK_STATUS.* && touch .agent-task-context/.state/TASK_STATUS.<status>
```

Set owner (remove all TASK_OWNER.* files, create new one):
```sh
rm -f .agent-task-context/.state/TASK_OWNER.* && touch ".agent-task-context/.state/TASK_OWNER.AGENT_ID"
```

Claim a worktree:
```sh
rm -f .agent-task-context/.state/TASK_STATUS.* .agent-task-context/.state/TASK_OWNER.* && touch .agent-task-context/.state/TASK_STATUS.claimed && touch ".agent-task-context/.state/TASK_OWNER.AGENT_ID"
```

Pause a worktree (keep owner):
```sh
OWNER_FILE=$(ls .agent-task-context/.state/TASK_OWNER.* 2>/dev/null | head -1)
rm -f .agent-task-context/.state/TASK_STATUS.* && touch .agent-task-context/.state/TASK_STATUS.paused
[ -n "$OWNER_FILE" ] && touch "$OWNER_FILE"
```

Complete a worktree:
```sh
rm -f .agent-task-context/.state/TASK_STATUS.* .agent-task-context/.state/TASK_OWNER.* && touch .agent-task-context/.state/TASK_STATUS.done
```

Abandon a worktree:
```sh
rm -f .agent-task-context/.state/TASK_STATUS.* .agent-task-context/.state/TASK_OWNER.* && touch .agent-task-context/.state/TASK_STATUS.abandoned
```

Find all claimable worktrees:
```sh
find .worktrees -name "TASK_STATUS.*" -exec sh -c '
  WT="${1%/.agent-task-context/.state/TASK_STATUS.*}"
  STATUS=$(basename "$1" | sed "s|TASK_STATUS\.||")
  case "$STATUS" in
    unclaimed|paused|abandoned) echo "$WT" ;;
  esac
' _ {} \;
```

Find worktrees claimed by specific owner:
```sh
find .worktrees -name "TASK_OWNER.AGENT_ID" -exec dirname {} \; | sed 's|/.agent-task-context/.state||'
```

Check for collision (ownerAgentId already exists):
```sh
find .worktrees -name "TASK_OWNER.AGENT_ID" | grep -q . && echo "collision"
```

## Absolute Rules (non-negotiable)
1) Do not ask “Should I claim…?” or “Do you want me to proceed?”
2) Do not touch any worktree that is claimed by someone else.
3) Never expand scope. No unrelated refactors. No “helpful improvements.”
4) Ask a question only if execution is blocked by a true ambiguity or missing requirement (see “Allowed Questions”).
5) If the initially targeted worktree is not yours, you must stop and move on to a claimable unclaimed task automatically (no questions).

## Auto-Generated ownerAgentId (required)
Generate a unique ownerAgentId automatically when claiming a worktree. Do not ask for user input or depend on Cursor providing an agent id.

Format:
- ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>``

Definitions:
- `branch-slug` = branch name with `/` replaced by `-` (e.g., `feat/add-color` → `feat-add-color`)
- `YYYY-MM-DD` = date in Asia/Manila timezone
- `HHmm` = time in 24-hour format in Asia/Manila timezone (no colon)
- `seq` = sequence number starting at `01`, incrementing if collision detected

Collision detection:
- Before writing TASK_OWNER file, check all `.worktrees/**/.agent-task-context/.state/TASK_OWNER.*` files.
- Use: `find .worktrees -name "TASK_OWNER.AGENT_ID"`
- If the generated ownerAgentId already exists (file found), increment `seq` to `02`, `03`, etc. until unique.

Example:
- Branch: `feat/add-color`
- Branch-slug: `feat-add-color`
- Date/time: 2024-01-15 14:30 (Asia/Manila)
- Generated: `taskmaster__feat-add-color__2024-01-15__1430__01`

You must create the TASK_OWNER file when claiming: `touch ".agent-task-context/.state/TASK_OWNER.AGENT_ID"`
You must compare this value to the TASK_OWNER file when deciding whether you may work.

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
3) Check `${WORKTREE_PATH}/.agent-task-context/.state/` directory (create TASK_STATUS.unclaimed if missing).
4) Read branch name from `${WORKTREE_PATH}/.agent-task-context/BRANCH_NAME` file (create it if missing with the branch name derived from worktree path).
5) Extract the branch-slug from the worktree path (worktree path format: `.worktrees/<branch-slug>` where branch-slug is kebab-case, e.g., `feat/add-color` branch → `feat-add-color` worktree).
6) Generate ownerAgentId using the format: ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>`` (check for collisions using TASK_OWNER files and increment seq if needed).
7) Read current status: `ls ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* 2>/dev/null | sed 's|.*/TASK_STATUS\.||'`
8) Read current owner: `ls ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* 2>/dev/null | sed 's|.*/TASK_OWNER\.||'`
9) If TASK_STATUS.claimed exists AND owner != generated ownerAgentId:
   - Do not touch code in this worktree.
   - Immediately proceed to Step 3 (auto-select another claimable task).
10) If TASK_STATUS.claimed exists AND owner == generated ownerAgentId:
   - Continue working in this worktree.
11) If TASK_STATUS.unclaimed, TASK_STATUS.paused, or TASK_STATUS.abandoned exists:
   - Claim it: `rm -f ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.claimed && touch "${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.AGENT_ID"`, then proceed.

### Step 3 — Auto-select another claimable task (no questions)
If the initial worktree is not yours (or no target was provided), you must automatically find another worktree you are allowed to work on:

Selection rules:
1) Only consider worktrees under:
   - `.worktrees/`
2) For each candidate worktree:
   - Extract branch-slug from worktree path (worktree paths use kebab-case: `.worktrees/<branch-slug>`).
   - Generate ownerAgentId using the format: ``taskmaster__<branch-slug>__<YYYY-MM-DD>__<HHmm>__<seq>`` (check for collisions using TASK_STATUS files and increment seq if needed).
3) Use this command to find eligible worktrees:
   ```sh
   find .worktrees -name "TASK_STATUS.*" -exec sh -c '
     WT="${1%/.agent-task-context/.state/TASK_STATUS.*}"
     STATUS=$(basename "$1" | sed "s|TASK_STATUS\.||")
     OWNER_FILE=$(ls "${WT}/.agent-task-context/.state/TASK_OWNER.*" 2>/dev/null | head -1)
     OWNER=$(echo "$OWNER_FILE" | sed "s|.*/TASK_OWNER\.||" 2>/dev/null)
     case "$STATUS" in
       unclaimed|paused|abandoned) echo "$WT" ;;
       claimed) [ -n "$OWNER" ] && [ "$OWNER" = "AGENT_ID" ] && echo "$WT" ;;
     esac
   ' _ {} \;
   ```
4) A worktree is eligible if:
   - TASK_STATUS.unclaimed, TASK_STATUS.paused, or TASK_STATUS.abandoned exists, OR
   - TASK_STATUS.claimed exists AND TASK_OWNER file matches generated ownerAgentId (resume your own work)
5) Ignore any worktree that has TASK_STATUS.claimed with a different TASK_OWNER file or has TASK_STATUS.done.
6) Choose exactly ONE worktree to work on, using this priority:
   - First: worktrees with TASK_STATUS.paused AND TASK_OWNER file matches generated ownerAgentId (resume your paused work)
   - Second: TASK_STATUS.unclaimed
   - Third: TASK_STATUS.abandoned
   - Fourth: TASK_STATUS.paused with no TASK_OWNER file (treat as reclaimable)
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
- **You will only work on ONE worktree at a time** - the one you claimed via the TASK_STATUS file.
- The TASK_STATUS file system ensures no two agents claim the same worktree, so your `WORKTREE_PATH` will always be unique to you.
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
   - Read TASK_STATUS: `${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.*`
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

If Context.md is missing:
- Create it immediately using the templates below, filling in what this document provides.
- Use worktree-prefixed paths: `${WORKTREE_PATH}/.agent-task-context/Context.md`
- Then continue.

If .state/ directory doesn't exist or is empty:
- Work is unfinished; read Context.md (committed source of truth) and use Agent Code Reviewer workflow to review changes (git diff/log) to understand progress, then continue work.

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
- If you see a worktree is already claimed by someone else (different ownerAgentId), skip it and find another.

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

When asked to audit finished tasks, run the inline command below from the repo root. It scans all `.worktrees/**/.agent-task-context/.state/TASK_STATUS.*` files and prints whether each worktree is DONE or NOT DONE.

Rules:
- This audit is ONLY about ticket status visibility (TASK_STATUS presence + status). Do not review code quality.
- Do not ask questions. Run the command and report the output.
- If `.worktrees/` does not exist, stop and report that as the only issue.

Inline command:
```sh
find .worktrees -name "TASK_STATUS.*" -print | sort | while IFS= read -r f; do
  wt="${f%/.agent-task-context/.state/TASK_STATUS.*}"
  status=$(basename "$f" | sed "s|TASK_STATUS\.||")

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
- If Definition of Done is satisfied: `rm -f ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.done`
- If not satisfied: read current owner from `${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.*`, then `OWNER_FILE=$(ls ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* 2>/dev/null | head -1) && rm -f ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* && touch ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.paused && [ -n "$OWNER_FILE" ] && touch "$OWNER_FILE"`

## Required End-of-Run Report (always output)
- Generated ownerAgentId:
- Selected target:
  - branch:
  - branch-slug:
  - worktree:
- Ownership:
  - initial status:
  - initial ownerAgentId:
  - final status:
  - final ownerAgentId:
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

**Note:** When creating these files, use worktree-prefixed paths: `${WORKTREE_PATH}/.agent-task-context/Context.md`, `${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.<status>`, `${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.<agent-id>`, and `${WORKTREE_PATH}/.agent-task-context/BRANCH_NAME`

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

### .agent-task-context/.state/TASK_STATUS Files
Create one of these files to indicate task status (runtime-only, not committed):
- `TASK_STATUS.unclaimed` — no one is working on it yet
- `TASK_STATUS.claimed` — actively owned
- `TASK_STATUS.paused` — temporarily inactive
- `TASK_STATUS.done` — ready for PR/merge
- `TASK_STATUS.abandoned` — intentionally left behind

### .agent-task-context/.state/TASK_OWNER File
Create `TASK_OWNER.<agent-id>` file with the owner agent ID in the filename (runtime-only, not committed).
Example: `TASK_OWNER.taskmaster__feat-add-color__2024-01-15__1430__01`

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

**Task status transitions (use `${WORKTREE_PATH}/.agent-task-context/.state/`):**

Claiming:
```sh
rm -f ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.claimed && touch "${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.AGENT_ID"
```

Pausing (keep owner):
```sh
OWNER_FILE=$(ls ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* 2>/dev/null | head -1)
rm -f ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* && touch ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.paused
[ -n "$OWNER_FILE" ] && touch "$OWNER_FILE"
```

Completing:
```sh
rm -f ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.done
```

Abandoning:
```sh
rm -f ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.* ${WORKTREE_PATH}/.agent-task-context/.state/TASK_OWNER.* && touch ${WORKTREE_PATH}/.agent-task-context/.state/TASK_STATUS.abandoned
```
