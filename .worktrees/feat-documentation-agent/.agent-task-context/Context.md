# Context: feat/documentation-agent

## Goal

Create a comprehensive documentation agent and pre-commit hook system to maintain feature documentation, file mappings, and git workflow standards for AI agent development.

## Background

The project has grown to 435+ source files with 274+ commits/month. AI agents need efficient ways to discover feature implementations, understand file dependencies, and maintain documentation. Current "Recent Changes" sections in agent files are buried in 400+ line documents and are expensive to parse (15,000+ tokens per feature discovery).

This task implements:

1. Feature documentation agent (creates/updates feature docs)
2. Pre-commit hook system (enforces documentation standards)
3. Feature registry structure (docs/features/)
4. Git workflow enhancements (commit templates, aliases)

## Scope

**Touch only:**

- `agents/feature-documenter.md` (new agent)
- `docs/features/` (new directory structure)
- `docs/features/README.md` (feature index)
- `docs/features/TEMPLATE.md` (feature doc template)
- `docs/workflows/` (new directory for workflow docs)
- `docs/workflows/feature-documentation-workflow.md`
- `docs/workflows/git-commit-conventions.md`
- `.husky/pre-commit` (pre-commit hook)
- `.git-templates/` (optional: commit templates)
- `.gitconfig-aliases` (optional: git aliases for agents)

**Do not touch:**

- `src/` (no code changes)
- Existing agent files (will reference new docs, but separate PR)
- `fix/lint-errors` branch files (other chat session)

**Dependencies:**

- Global agent format (~/ai/agents/README.md)
- Multitasker workflow (~/ai/agents/multitasker.md)
- Task-master patterns (~/ai/agents/task-master.md)

## Step-by-Step Instructions

### 1. Create Feature Documentation Agent

Create `agents/feature-documenter.md` following the global agent format:

- Add YAML frontmatter with name, description, examples
- Define agent purpose: documenting features with file maps
- Include file discovery strategy (Glob, Grep)
- Provide template structure
- Add integration point documentation guidelines

### 2. Create Feature Registry Structure

```
docs/
├── features/
│   ├── README.md              # Feature index with quick links
│   ├── TEMPLATE.md            # Template for new feature docs
│   └── (feature docs added in future)
├── workflows/
│   ├── feature-documentation-workflow.md
│   └── git-commit-conventions.md
└── architecture/
    └── (future: system architecture docs)
```

### 3. Create Feature Documentation Template

In `docs/features/TEMPLATE.md`:

- Feature metadata (ID, status, dates, git commits)
- Quick summary
- Complete file map (components, routes, utils, stores, tests)
- Data flow diagram
- Integration points
- Modification guide
- Testing strategy
- Related features
- Git references

### 4. Create Pre-Commit Hook

In `.husky/pre-commit`:

- Check if feature files were modified
- Detect if commit message includes Feature ID
- Remind to update feature docs
- Show which files were modified
- Provide helpful guidance (not blocking, just reminders)

### 5. Create Workflow Documentation

**feature-documentation-workflow.md**:

- When to create feature docs
- How to update existing docs
- File discovery process
- Template usage guide
- Integration with git workflow

**git-commit-conventions.md**:

- Enhanced commit message format with Feature IDs
- Git aliases for AI agents
- Commit message examples
- PR template updates

### 6. Create Git Aliases (Optional)

In `.gitconfig-aliases`:

- feature-commits: Find commits by feature keyword
- feature-files: List all files touched by feature
- file-story: Show file evolution
- area-experts: Find who worked on area
- feature-timeline: Show chronological feature evolution

## Definition of Done

- [ ] `agents/feature-documenter.md` created with complete agent definition
- [ ] `docs/features/` directory structure created
- [ ] `docs/features/README.md` created (feature index)
- [ ] `docs/features/TEMPLATE.md` created (comprehensive template)
- [ ] `docs/workflows/feature-documentation-workflow.md` created
- [ ] `docs/workflows/git-commit-conventions.md` created
- [ ] `.husky/pre-commit` hook created (helpful reminders)
- [ ] Git aliases documented in `.gitconfig-aliases` (optional)
- [ ] All files committed to worktree
- [ ] Branch pushed to remote
- [ ] Documentation tested (can create a sample feature doc from template)

## Examples

### Feature Documenter Agent Pattern

```markdown
---
name: feature-documenter
description: Use this agent when you need to document a new feature...
model: inherit
color: blue
tools: ['Read', 'Write', 'Glob', 'Grep']
---

You are a documentation agent that creates comprehensive feature documentation.

[Agent instructions...]
```

### Pre-Commit Hook Pattern

```bash
#!/bin/sh
FEATURE_FILES=$(git diff --cached --name-only | grep -E "src/(components|utils|routes|stores)")

if [ -n "$FEATURE_FILES" ]; then
  echo "⚠️  Feature files modified. Consider updating feature docs."
  echo "$FEATURE_FILES"
fi
```

### Feature Doc Structure

See `docs/features/TEMPLATE.md` for complete structure with:

- File map with component hierarchy
- Data flow diagrams
- Integration points
- Git references
- Modification guides

## Troubleshooting

**Issue: Pre-commit hook not executable**

- Solution: `chmod +x .husky/pre-commit`

**Issue: Feature template too complex**

- Solution: Start with minimal sections, add more as needed
- Can create simplified template variant

**Issue: Git aliases not working**

- Solution: Run `git config --global include.path ~/.gitconfig-aliases`
- Or add to project .git/config

## Notes / Decisions

- Pre-commit hook is non-blocking (reminders only, not enforcement)
- Feature IDs use format: F001, F002, etc.
- Template is comprehensive but sections can be omitted if not applicable
- Git aliases are optional but highly recommended for agent efficiency
- Documentation agent can be invoked manually or via workflow
- Feature docs are living documents (update with code changes)
