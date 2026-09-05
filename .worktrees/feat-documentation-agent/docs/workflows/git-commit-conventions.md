# Git Commit Conventions

**Purpose**: Standardized commit messages that integrate with feature documentation system and enable efficient AI agent workflows.

---

## Table of Contents

1. [Enhanced Commit Format](#enhanced-commit-format)
2. [Feature ID Integration](#feature-id-integration)
3. [Commit Message Examples](#commit-message-examples)
4. [Git Aliases for AI Agents](#git-aliases-for-ai-agents)
5. [PR Templates](#pr-templates)
6. [Workflow Integration](#workflow-integration)

---

## Enhanced Commit Format

### Basic Format (Conventional Commits)

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Enhanced Format (With Feature ID)

```
<type>(<scope>): <description>

Feature: F00X
Files Modified:
- path/to/file1.ts
- path/to/file2.tsx

[optional additional context]

[optional footer]
```

### Components

**Type** (required):

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting (no code change)
- `refactor`: Code restructure (no feature/fix)
- `perf`: Performance improvement
- `test`: Add/update tests
- `chore`: Maintenance, deps, config

**Scope** (optional but recommended):

- Feature area: `auth`, `export`, `chat`, `schema`
- Component name: `button`, `service`, `store`
- System area: `api`, `db`, `ui`

**Description** (required):

- Imperative mood: "add feature" not "added feature"
- Lowercase start
- No period at end
- Max 50 characters

**Feature ID** (required for feature work):

- Format: `Feature: F00X`
- On separate line in body
- Links commit to feature documentation

**Files Modified** (optional but helpful):

- List key files changed
- Helps agents understand impact
- Max 5-10 files (use "and X more" if needed)

---

## Feature ID Integration

### When to Include Feature ID

✅ **Always include when**:

- Adding files to existing feature
- Modifying feature behavior
- Fixing bugs in documented features
- Refactoring feature code
- Updating feature documentation

❌ **Skip when**:

- Minor bug fixes (typos, formatting)
- Dependency updates
- Configuration changes
- Documentation for non-features
- Experimental/spike code

### How Feature IDs Help AI Agents

**Finding feature history**:

```bash
# All commits for a feature
git log --grep="Feature: F007" --oneline

# Recent changes
git log --grep="Feature: F007" --oneline -10

# Changed files
git log --grep="Feature: F007" --name-only --pretty=format: | sort -u
```

**Understanding changes**:

```bash
# What changed in last commit?
git show HEAD --grep="Feature: F007"

# Timeline of feature
git log --grep="Feature: F007" --pretty=format:"%h - %ar - %s"
```

---

## Commit Message Examples

### Example 1: New Feature Implementation

```
feat(export): add GitHub repository export

Feature: F007
Files Modified:
- src/components/ExportButton.tsx
- src/services/githubService.ts
- src/app/routes/github.ts
- src/stores/useExportStore.ts

Enables users to export generated projects directly to GitHub.
Creates repository, uploads files, and generates initial commit.

Closes #45
```

**Why this is good**:

- ✅ Clear type and scope
- ✅ Feature ID present
- ✅ Key files listed
- ✅ Additional context provided
- ✅ Issue reference included

### Example 2: Bug Fix

```
fix(export): handle rate limit errors from GitHub API

Feature: F007
Files Modified:
- src/services/githubService.ts
- src/tests/githubService.test.ts

Added exponential backoff retry logic when GitHub returns 429.
Max 3 retries with 2s, 4s, 8s delays.
```

**Why this is good**:

- ✅ Describes what was fixed
- ✅ Links to feature
- ✅ Explains solution
- ✅ Includes test file

### Example 3: Feature Documentation

```
docs(export): document GitHub export feature

Feature: F007
Files Modified:
- docs/features/implemented/F007-github-export.md
- docs/features/README.md

Complete file map, data flow, integration points, and modification guide.
Follows template structure with 7 components, 2 services, 3 routes documented.
```

**Why this is good**:

- ✅ Uses `docs` type
- ✅ Feature ID for cross-reference
- ✅ Summary of documentation scope
- ✅ Metrics included (7 components, etc.)

### Example 4: Refactoring

```
refactor(export): extract GitHub auth logic to separate service

Feature: F007
Files Modified:
- src/services/githubService.ts
- src/services/githubAuthService.ts (new)
- src/tests/githubAuthService.test.ts (new)

Moved authentication logic from githubService to new githubAuthService
for better separation of concerns. No behavior changes.
```

**Why this is good**:

- ✅ Clearly states no behavior change
- ✅ Explains reason (separation of concerns)
- ✅ Marks new files
- ✅ Feature ID preserved

### Example 5: Multiple Features

```
feat(chat): integrate export feature with chat UI

Feature: F001, F007
Files Modified:
- src/components/chat/ChatApp.tsx
- src/components/chat/ExportMenu.tsx (new)
- src/stores/useChatStore.ts

Added export menu to chat UI that uses GitHub export service.
Users can now export conversation context directly to repo.

Integration between Chat System (F001) and GitHub Export (F007).
```

**Why this is good**:

- ✅ Multiple feature IDs when integrating
- ✅ Clear integration description
- ✅ New files marked
- ✅ Cross-feature context

### Example 6: Deprecation

```
refactor(auth): deprecate old auth service

Feature: F003
Files Modified:
- src/services/authService.ts (deprecated)
- src/services/authServiceV2.ts
- docs/features/implemented/F003-authentication.md

Marked authService as deprecated in favor of authServiceV2.
Migration guide added to feature docs.
Existing code still works but logs deprecation warnings.

Breaking change in v2.0 (planned Q2 2026).
```

**Why this is good**:

- ✅ Clear deprecation notice
- ✅ Points to replacement
- ✅ Migration guide referenced
- ✅ Timeline provided

---

## Git Aliases for AI Agents

Create `.gitconfig-aliases` with agent-friendly commands:

```ini
[alias]
  # Feature-related commands
  feature-commits = "!f() { git log --grep=\"Feature: $1\" --oneline; }; f"
  feature-files = "!f() { git log --grep=\"Feature: $1\" --name-only --pretty=format: | sort -u; }; f"
  feature-timeline = "!f() { git log --grep=\"Feature: $1\" --pretty=format:'%h - %ar - %s'; }; f"
  feature-stats = "!f() { git log --grep=\"Feature: $1\" --stat; }; f"
  feature-diff = "!f() { git log --grep=\"Feature: $1\" -p; }; f"

  # File-related commands
  file-story = log --follow --stat --
  file-history = log --follow -p --
  file-authors = "!f() { git log --follow --format='%an' -- \"$1\" | sort | uniq -c | sort -rn; }; f"

  # Area/expertise commands
  area-experts = "!f() { git log --format='%an' -- \"$1\" | sort | uniq -c | sort -rn; }; f"
  area-activity = "!f() { git log --oneline -- \"$1\" | wc -l; }; f"

  # Recent changes
  recent = log --oneline -20
  recent-files = diff --name-only HEAD~10..HEAD
  recent-stats = diff --stat HEAD~10..HEAD

  # Review helpers
  review-feature = "!f() { git log --grep=\"Feature: $1\" --stat -p; }; f"
  changed-features = "!f() { git diff --name-only \"$1\" | xargs -I {} sh -c 'grep -l {} docs/features/implemented/*.md 2>/dev/null || true' | sed 's|.*/||' | sed 's|.md||'; }; f"
```

### Usage Examples

```bash
# Find all commits for Feature F007
git feature-commits F007

# List all files touched by Feature F007
git feature-files F007

# Show timeline for Feature F007
git feature-timeline F007

# See detailed stats for Feature F007
git feature-stats F007

# View full diff for Feature F007
git feature-diff F007

# See file history
git file-story src/services/githubService.ts

# Find who worked on a file
git file-authors src/services/githubService.ts

# Find experts in an area
git area-experts src/components/

# See recent changes
git recent

# Which features were affected by recent commits?
git changed-features HEAD~5..HEAD
```

### Installation

**Global** (all repos):

```bash
git config --global include.path ~/.gitconfig-aliases
```

**Project-only** (this repo):

```bash
git config --local include.path ./.gitconfig-aliases
```

---

## PR Templates

### Feature PR Template

```markdown
## Feature: [Name]

**Feature ID**: F00X  
**Type**: New Feature | Enhancement | Bug Fix | Refactor  
**Status**: Ready for Review | WIP | Blocked

**Documentation**: `docs/features/implemented/F00X-feature-name.md`

---

### Summary

[Brief description of what this PR does and why]

### Changes

- **Added**: [What was added]
- **Modified**: [What was changed]
- **Removed**: [What was deleted]
- **Deprecated**: [What is now deprecated]

### Files Modified

**Components** (X files):

- `src/components/Feature/Main.tsx` - [change description]
- `src/components/Feature/Sub.tsx` - [change description]

**Services** (Y files):

- `src/services/featureService.ts` - [change description]

**Tests** (Z files):

- `src/tests/feature.test.ts` - [change description]

**Documentation** (1 file):

- `docs/features/implemented/F00X-feature-name.md` - [complete documentation]

### Integration Points

- **Feature A** (F00Y): [How it integrates]
- **Feature B** (F00Z): [How it integrates]

### Testing

- [ ] Unit tests added/updated (XX tests)
- [ ] Integration tests added/updated (YY tests)
- [ ] Manual testing completed
- [ ] Tested on: Chrome, Firefox, Safari
- [ ] Tested responsive: Mobile, Tablet, Desktop

### Documentation

- [x] Feature doc created/updated
- [x] Feature index updated (docs/features/README.md)
- [x] Git references added to feature doc
- [x] Modification guide included
- [x] Integration points documented

### Breaking Changes

- [ ] Yes (see migration guide below)
- [x] No

### Migration Guide

[If breaking changes, provide migration steps]

### Screenshots/Videos

[If UI changes, provide visual evidence]

### Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Documentation updated
- [x] No console.log statements
- [x] Tests passing locally
- [x] Feature ID in commit messages

---

### Related

- Closes #XX
- Fixes #YY
- Related to #ZZ
- Depends on #AA
```

### Documentation-Only PR Template

```markdown
## Documentation Update

**Feature ID**: F00X  
**Type**: New Documentation | Update | Fix | Reorganization

**Files Modified**:

- `docs/features/implemented/F00X-feature-name.md`
- `docs/features/README.md`

---

### Summary

[What documentation was created/updated and why]

### Changes

- **Created**: [New docs]
- **Updated**: [Existing docs]
- **Fixed**: [Inaccuracies corrected]

### Scope

**Features Documented**: F00X, F00Y, F00Z  
**Total Files Mapped**: XX files  
**Sections Completed**: [List major sections]

### Verification

- [x] All file paths verified (files exist)
- [x] Line numbers accurate (checked with grep)
- [x] Code snippets match actual code
- [x] Integration points tested
- [x] Related features cross-referenced
- [x] Git references accurate

### Quality

- [x] Quick summary <100 tokens
- [x] Complete file map (no "..." placeholders)
- [x] Data flow diagram included
- [x] Modification guide actionable
- [x] Template sections removed if N/A

---

### Checklist

- [x] Feature index updated
- [x] Cross-references added
- [x] Git history referenced
- [x] Follows template structure
- [x] Token-efficient formatting
```

---

## Workflow Integration

### Development Flow

```
1. Implement feature
   ↓
2. Write tests
   ↓
3. Commit code (with Feature ID)
   ↓
4. Document feature (same PR)
   ↓
5. Update feature index
   ↓
6. Commit docs (with Feature ID)
   ↓
7. Open PR (use template)
   ↓
8. Review (code + docs)
   ↓
9. Merge
```

### Commit Sequence

**Recommended**: Multiple commits in one PR

```bash
# Commit 1: Core implementation
git add src/components/ src/services/
git commit -m "feat(export): implement GitHub export service

Feature: F007
Files Modified:
- src/services/githubService.ts
- src/components/ExportButton.tsx

Core export functionality with rate limit handling."

# Commit 2: Tests
git add src/tests/
git commit -m "test(export): add GitHub export tests

Feature: F007
Files Modified:
- src/tests/githubService.test.ts
- src/tests/ExportButton.test.tsx

18 test cases covering success, errors, and rate limits."

# Commit 3: Documentation
git add docs/features/
git commit -m "docs(export): document GitHub export feature

Feature: F007
Files Modified:
- docs/features/implemented/F007-github-export.md
- docs/features/README.md

Complete file map, data flow, and modification guide."
```

**Alternative**: Single commit (smaller features)

```bash
git add src/ docs/
git commit -m "feat(export): add GitHub export with docs

Feature: F007
Files Modified:
- src/services/githubService.ts
- src/components/ExportButton.tsx
- src/tests/githubService.test.ts
- docs/features/implemented/F007-github-export.md

Implements GitHub export feature with complete documentation."
```

### Pre-Commit Hook Integration

Hook checks for Feature ID when appropriate:

```bash
#!/bin/sh
FEATURE_FILES=$(git diff --cached --name-only | grep -E "src/(components|utils|routes|stores)")

if [ -n "$FEATURE_FILES" ]; then
  COMMIT_MSG_FILE=".git/COMMIT_EDITMSG"
  COMMIT_MSG=$(cat "$COMMIT_MSG_FILE" 2>/dev/null || echo "")
  FEATURE_ID=$(echo "$COMMIT_MSG" | grep -oP 'Feature: \K\w+')

  if [ -z "$FEATURE_ID" ]; then
    echo ""
    echo "⚠️  Feature files modified but no Feature ID found"
    echo ""
    echo "Modified files:"
    echo "$FEATURE_FILES"
    echo ""
    echo "Consider adding:"
    echo "  Feature: F00X"
    echo ""
    echo "Or if this is not feature work:"
    echo "  - Small bug fix: Use 'fix' type"
    echo "  - Refactor: Use 'refactor' type"
    echo "  - Style: Use 'style' type"
    echo ""
  fi
fi
```

---

## Best Practices

### DO ✅

- **Include Feature ID** for all feature-related commits
- **List key files** in commit body (helps agents)
- **Write clear descriptions** (imperative mood, <50 chars)
- **Cross-reference issues** (Closes #XX, Fixes #YY)
- **Document breaking changes** in commit footer
- **Use conventional commit types** consistently
- **Keep commits atomic** (one logical change per commit)

### DON'T ❌

- **Skip Feature ID** on feature work (loses traceability)
- **Use vague messages** ("fix stuff", "update code")
- **Mix unrelated changes** (feature + refactor in one commit)
- **Forget to update docs** (keep docs in sync with code)
- **Use past tense** ("Added feature" should be "Add feature")
- **Over-commit** (WIP commits clutter history)
- **Under-commit** (giant commits hard to review)

---

## Examples from Real Commits

### Good Commits from Project

```
2d75b56 - feat: implement filesystem-based worktree chat system
f9d7145 - fix: force agent to checkout main before creating new branches
01a3a24 - feat: unify select components, add design tokens, persist UI state
b1368b1 - refactor: use Banner component and improve mobile-first design
```

**What makes these good**:

- Clear type prefix
- Concise but descriptive
- Present tense
- Imperative mood

### Could Be Better

**Before**:

```
Fixed bug
```

**After**:

```
fix(export): handle null repository URL

Feature: F007
Files Modified:
- src/services/githubService.ts

Added null check before repository URL validation.
Prevents crash when GitHub API returns empty response.
```

---

## For AI Agents

### Using Git Aliases

**Find commits for current feature**:

```typescript
// In agent code
const featureId = 'F007';
const commits = await bash(`git feature-commits ${featureId}`);
const files = await bash(`git feature-files ${featureId}`);
const timeline = await bash(`git feature-timeline ${featureId}`);
```

**Efficient discovery**:

```typescript
// Instead of reading entire codebase:
const featureFiles = await bash(`git feature-files F007`);
// Returns: All files ever touched by this feature

// Then read only those files
for (const file of featureFiles) {
  await read(file);
}
```

### Commit Message Parsing

**Extract Feature ID**:

```typescript
const commitMessage = await bash(`git log -1 --pretty=%B`);
const featureId = commitMessage.match(/Feature: (F\d+)/)?.[1];

if (featureId) {
  // Link to feature documentation
  const doc = `docs/features/implemented/${featureId}-*.md`;
}
```

---

## Questions?

- See: `docs/workflows/feature-documentation-workflow.md`
- See: `docs/features/README.md`
- Ask: In project chat/issues

---

**Meta**: This workflow is part of F000 (documentation system).
