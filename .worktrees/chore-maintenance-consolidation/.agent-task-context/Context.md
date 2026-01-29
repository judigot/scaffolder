# Context: chore/maintenance-consolidation

## Goal

Perform non-conflicting maintenance tasks (git cleanup, dependency audit, documentation consolidation) while other agents work on lint fixes and documentation infrastructure.

## Background

User is in maintenance mode after rapid feature development. Three agents are coordinating:

- fix/lint-errors: Fixing lint errors in ~30 src files
- feat/documentation-agent: Creating documentation infrastructure
- chore/maintenance-consolidation (this): Cleanup and consolidation tasks

## Scope

**Touch only:**

- `.git/` (cleanup operations)
- `docs/archive/` (after created by doc agent)
- `package.json` (audit only, no changes)
- `bun.lock` (audit only, no changes)
- Remote branch cleanup (with user approval)

**Do not touch:**

- `src/` (lint agent working)
- `agents/` (doc agent working)
- `.husky/` (doc agent working)
- Any files being modified by other agents

**Dependencies:**

- Coordinating with documentation agent via ~/conversation.txt
- Waiting for docs/archive/ structure from doc agent
- Must not conflict with lint agent's src/ files

## Step-by-Step Instructions

### Phase 1: Git Cleanup (IMMEDIATE - SAFE)

1. List stale remote branches
2. Get user approval before deletion
3. Run `git worktree prune`
4. Check repo size and bloat

### Phase 2: Dependencies Audit (SAFE - READ ONLY)

1. Run `bun outdated`
2. Check for security vulnerabilities
3. Create report (no upgrades yet)
4. Flag critical issues

### Phase 3: Documentation Consolidation (WAIT FOR SIGNAL)

1. Wait for doc agent to create docs/archive/ structure
2. Move old plans/ content to docs/archive/old-plans/
3. Categorize features/ into implemented vs planned
4. Update cross-references

## Definition of Done

- Stale remote branches identified (user approval obtained)
- Git worktrees pruned
- Dependency audit report created
- Documentation consolidated into new structure
- No conflicts with other agents' work
- All changes committed and pushed

## Examples

Git cleanup:

```sh
git branch -r --merged main | grep -v main | grep -v HEAD
git worktree prune
```

Dependency audit:

```sh
bun outdated > dependency-audit.txt
```

## Troubleshooting

**Issue: Worktree prune fails**

- Check if worktrees are still in use
- Verify .git/worktrees/ directory

**Issue: Doc consolidation conflicts**

- Stop and coordinate with doc agent
- Check ~/conversation.txt for updates

## Notes / Decisions

- Created from main branch
- Coordinating via ~/conversation.txt
- File-based communication protocol
- Merge order: lint → docs → maintenance
