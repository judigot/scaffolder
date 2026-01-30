# Feature Documentation Workflow

**Purpose**: Guide for creating and maintaining feature documentation that saves AI agents 90% tokens during feature discovery.

---

## Table of Contents

1. [When to Create Feature Docs](#when-to-create-feature-docs)
2. [Creating New Feature Documentation](#creating-new-feature-documentation)
3. [Updating Existing Documentation](#updating-existing-documentation)
4. [File Discovery Process](#file-discovery-process)
5. [Template Usage Guide](#template-usage-guide)
6. [Integration with Git Workflow](#integration-with-git-workflow)
7. [Quality Checklist](#quality-checklist)
8. [Common Patterns](#common-patterns)

---

## When to Create Feature Docs

### ✅ Always Document

**New Features**:

- Implemented and merged to main
- 3+ files involved
- Will be modified in future

**Refactored Features**:

- Architecture changed significantly
- Files moved/renamed
- Integration points modified

**Extracted Features**:

- Previously undocumented but actively used
- Referenced by other features
- Complex enough to need explanation

### ❌ Skip Documentation

**Tiny Changes**:

- Single-file modifications
- Simple bug fixes
- Style/formatting only

**Experimental Code**:

- Prototype/spike code
- Not yet merged
- May be deleted

**Internal Utilities**:

- Single-purpose helpers
- No external dependencies
- Self-explanatory

---

## Creating New Feature Documentation

### Step 1: Assign Feature ID

```bash
# Check docs/features/README.md for last ID
cat docs/features/README.md | grep "| F"

# Next ID: F00X (increment from last)
```

**Format**: `F001`, `F002`, `F003` (zero-padded, sequential)

### Step 2: Invoke feature-documenter Agent

**Manual Method**:

```
User: "Document the new export to GitHub feature"
Agent: [Uses feature-documenter agent]
```

**Automated Method** (if using pre-commit hook):

```bash
# Hook detects new feature files
# Prompts to run: git commit with Feature ID
git commit -m "feat(export): add GitHub export

Feature: F007
Docs: TBD - will document before merge"
```

### Step 3: Copy Template

```bash
cp docs/features/TEMPLATE.md \
   docs/features/implemented/F00X-feature-name.md
```

**Naming Convention**:

- Use kebab-case: `F007-github-export.md`
- Be descriptive: `F007-export-to-github.md` ✅
- Avoid vague: `F007-feature.md` ❌

### Step 4: Discover All Files

**Use feature-documenter agent's discovery strategy**:

```bash
# 1. Find core files (grep for feature keywords)
grep -r "GitHubExport" src/ --include="*.ts" --include="*.tsx" -l

# 2. Map component hierarchy
find src/components -name "*Export*"
find src/components -name "*GitHub*"

# 3. Find routes
find src/app/routes -name "*export*" -name "*github*"

# 4. Find stores
find src/stores -name "*export*"

# 5. Find services
find src/app/services -name "*export*" -name "*github*"

# 6. Find tests
find src/tests -name "*export*.test.ts"

# 7. Trace imports (read each file, find dependencies)
```

**Tools**:

- `grep`: Find files by content
- `find`: Find files by name
- `Read`: Check imports/exports
- `Glob`: Pattern matching

### Step 5: Complete Template Sections

**Required Sections** (cannot skip):

1. ✅ Quick Summary (50-100 tokens)
2. ✅ Git History References (initial commit, key changes)
3. ✅ Complete File Map (every single file)
4. ✅ Data Flow Diagram (visual representation)
5. ✅ Key Integration Points (with exact line numbers)
6. ✅ Modification Guide (actionable steps)
7. ✅ Related Features (cross-references)

**Optional Sections** (can remove if N/A):

- Known Issues (if none, say "None currently")
- Future Enhancements (if none planned, remove section)
- Additional References (if no external docs, remove)

### Step 6: Verify Accuracy

**Check every section**:

```bash
# Verify files exist
ls src/components/Feature/MainComponent.tsx

# Verify line numbers
grep -n "function processFeature" src/services/featureService.ts

# Verify imports
grep "import.*useFeatureStore" src/components/ -r

# Verify tests exist
ls src/tests/feature.test.ts
```

**Use Read tool** to verify code snippets match actual code.

### Step 7: Update Feature Index

Edit `docs/features/README.md`:

```markdown
| F007 | [GitHub Export](./implemented/F007-github-export.md) | ✅ Production | ExportButton.tsx, githubService.ts, +5 files | 2026-01-29 |
```

### Step 8: Commit with Feature Code

**Same PR, separate commits**:

```bash
# Commit 1: Feature implementation
git add src/
git commit -m "feat(export): add GitHub export functionality"

# Commit 2: Feature documentation
git add docs/features/implemented/F007-github-export.md
git add docs/features/README.md
git commit -m "docs(export): document GitHub export feature

Feature: F007
Files documented: 7 components, 2 services, 3 routes"
```

---

## Updating Existing Documentation

### When to Update

✅ **Always update when**:

- Adding new files to feature
- Changing data flow
- Modifying integration points
- Deprecating functionality
- Fixing bugs that change behavior
- Refactoring architecture

❌ **Don't update for**:

- Minor bug fixes (unless they change behavior)
- Code style changes
- Renaming variables
- Adding comments

### Update Process

**Step 1: Read Current Doc**

```bash
cat docs/features/implemented/F007-github-export.md
```

**Step 2: Identify Changed Sections**

- File Map: New files added?
- Data Flow: Flow changed?
- Integration Points: New integrations?
- Git References: Add new commit

**Step 3: Update Only Changed Sections**

**Example: Adding new file**

```markdown
## File Map

### Services (was 2 files, now 3)
```

src/app/services/
├── githubService.ts (existing)
├── githubAuthService.ts (existing)
└── githubWebhookService.ts (NEW - 150 lines)
├── Purpose: Handle GitHub webhooks
├── Endpoints: POST /webhooks/github
└── Uses: githubService, queueService

```

```

**Step 4: Update Git References**

```markdown
**Key Commits**:

- `abc1234` - Initial implementation
- `def5678` - Bug fix: rate limit handling
- `ghi9012` - Enhancement: webhook support (NEW)
```

**Step 5: Update "Last Modified" Timestamp**

```markdown
**Last Modified**: 2026-01-30 (commit `ghi9012`)
```

**Step 6: Commit Update with Code**

```bash
git add src/app/services/githubWebhookService.ts
git add docs/features/implemented/F007-github-export.md
git commit -m "feat(export): add GitHub webhook support

Feature: F007
Docs Updated: Added githubWebhookService.ts to file map"
```

---

## File Discovery Process

### Strategy Overview

**Goal**: Find 100% of files involved in a feature (no exceptions)

**Methods**:

1. **Keyword Search** (grep) - Find files by content
2. **Pattern Matching** (find/glob) - Find files by name
3. **Import Tracing** (read files) - Find dependencies
4. **Git History** (git log) - Find touched files
5. **Manual Verification** - Double-check with reads

### Method 1: Keyword Search (Grep)

**Find files containing feature keywords**:

```bash
# Search for component name
grep -r "ExportButton" src/ --include="*.tsx" -l

# Search for service name
grep -r "githubService" src/ --include="*.ts" -l

# Search for type/interface
grep -r "IExportRequest" src/ -l

# Search for store name
grep -r "useExportStore" src/ -l
```

**Tips**:

- Use `-l` for filenames only (not content)
- Use `--include` to filter file types
- Search for imports: `grep "import.*ExportButton"`

### Method 2: Pattern Matching (Find/Glob)

**Find files by naming convention**:

```bash
# Find components
find src/components -name "*Export*"
find src/components -name "*GitHub*"

# Find routes
find src/app/routes -name "*export*"

# Find stores
find src/stores -name "*Export*"

# Find tests
find src/tests -name "*export*.test.ts"

# Find services
find src/app/services -name "*github*" -o -name "*export*"
```

**Pattern Examples**:

- `*Export*` - matches ExportButton, ExportService, etc.
- `export*` - matches exportUtils, exportHelpers
- `*export.ts` - matches github-export.ts, file-export.ts

### Method 3: Import Tracing (Read Files)

**Trace dependencies by reading imports**:

1. **Read core file**:

   ```typescript
   // src/components/ExportButton.tsx
   import { useExportStore } from '@/stores/useExportStore';
   import { githubService } from '@/services/githubService';
   import { ExportDialog } from './ExportDialog';
   ```

2. **Add imported files to list**:
   - `src/stores/useExportStore.ts`
   - `src/services/githubService.ts`
   - `src/components/ExportButton/ExportDialog.tsx`

3. **Repeat for each imported file** (recursive)

4. **Stop when**: No new imports related to feature

**Tools**: Use `Read` tool to examine imports in each file

### Method 4: Git History (Git Log)

**Find all files ever touched by feature**:

```bash
# Find commits mentioning feature
git log --grep="export" --grep="github" --all --oneline

# Find files from those commits
git log --grep="F007" --name-only --pretty=format: | sort -u

# Find files in specific commit
git show abc1234 --name-only

# Find files in PR
git diff main...feature-branch --name-only
```

### Method 5: Manual Verification

**Double-check completeness**:

1. **Check each category** (components, routes, stores, services, tests)
2. **Read actual files** (use Read tool)
3. **Verify imports/exports**
4. **Look for edge cases** (utilities, types, constants)

**Checklist**:

- [ ] All components found?
- [ ] All routes found?
- [ ] All services found?
- [ ] All stores found?
- [ ] All tests found?
- [ ] All types/interfaces found?
- [ ] All utilities found?

---

## Template Usage Guide

### Template Sections Explained

#### 1. Quick Summary (Required)

**Purpose**: First thing agents read - must be concise

**Guidelines**:

- 50-100 tokens max
- One paragraph
- What + Why + Problem solved
- No technical jargon

**Good Example**:

```markdown
Enables users to export their generated projects directly to a new GitHub repository.
Handles repository creation, file uploads, commit creation, and PR generation automatically.
Solves the problem of manually copying generated files to GitHub.
```

**Bad Example**:

```markdown
This feature does GitHub stuff. It's pretty complex and has lots of files.
```

#### 2. Git History References (Required)

**Purpose**: Trace feature evolution, find related commits

**What to include**:

- Initial implementation commit
- 3-5 key commits (features, fixes, refactors)
- Related PRs
- Git commands for agents

**Example**:

```markdown
**Initial Implementation**:

- Commit: `2d75b56`
- Date: 2026-01-28
- PR: #34
- Stats: 11 files, 2,341 lines

**Key Commits**:

- `2d75b56` - Initial: Worktree service implementation
- `c46badf` - Enhancement: Local file fetching
- `1c538f7` - Tests: Automated test coverage
```

#### 3. Complete File Map (Required)

**Purpose**: Show every file with hierarchy and purpose

**Structure**:

```markdown
### Category Name
```

path/to/files/
├── File1.tsx (lines)
│ ├── Purpose: What it does
│ ├── Uses: Dependencies
│ └── Exports: Public API
└── File2.tsx (lines)
└── Purpose: What it does

```

```

**Guidelines**:

- Use tree structure (├── └──)
- Include line counts
- Show file hierarchy
- Explain purpose of each file
- List key imports/exports

#### 4. Data Flow Diagram (Required)

**Purpose**: Visual representation of how data moves

**Format**: Text-based flowchart using arrows

**Example**:

```markdown
User clicks Export button
↓
[ExportButton.tsx] - handleExport()
↓
[useExportStore] - startExport()
↓
API Call - POST /api/github/export
↓
[githubService.ts] - createRepository()
↓
GitHub API - create repo
↓
Response - repository URL
↓
[useExportStore] - setRepositoryUrl()
↓
[ExportButton.tsx] - show success message
```

#### 5. Key Integration Points (Required)

**Purpose**: Exact locations where features connect

**Format**:

````markdown
### 1. Integration Point Name

**Location**: `src/path/file.ts` (lines XX-YY)

```typescript
// Actual code from the file
export function integrationFunction() {
  // Real implementation
}
```
````

**Purpose**: Why this integration exists
**Data Flow**: Input → Process → Output
**Dependencies**: What it depends on

````

**Guidelines**:
- Use exact file paths
- Include line numbers (verified with grep)
- Show actual code (not pseudo-code)
- Explain why integration exists

#### 6. Modification Guide (Required)

**Purpose**: Step-by-step instructions for common changes

**Format**:
```markdown
### Add New [Thing]

**Goal**: [What you want to achieve]

**Steps**:
1. **Update [file1]** (`path/file1.ts`, line XX):
   ```typescript
   // Code change here
````

2. **Update [file2]** (`path/file2.ts`, line YY):

   ```typescript
   // Code change here
   ```

3. **Add tests** in `path/test.ts`

4. **Update this doc**: Add new file to map

````

**Common Patterns**:
- Add new field
- Change API behavior
- Add new component
- Deprecate functionality

#### 7. Related Features (Required)

**Purpose**: Cross-reference other features

**Format**:
```markdown
| Feature ID | Name | Relationship | Impact |
|------------|------|--------------|---------|
| #F001 | [Schema Builder] | Depends on | High |
| #F002 | [File Viewer] | Integrates | Medium |
````

### Removing Unnecessary Sections

**These sections are optional** (remove if N/A):

- Known Issues (if none, write "None currently" or remove)
- Future Enhancements (if none planned, remove)
- Additional References (if no external docs, remove)
- Metrics & Analytics (if not tracked, remove)

**Never remove**:

- Quick Summary
- Git References
- File Map
- Data Flow
- Integration Points
- Modification Guide

---

## Integration with Git Workflow

### Commit Message Format

**With Feature ID**:

```
feat(area): description

Feature: F007
Files Modified:
- src/components/ExportButton.tsx
- src/services/githubService.ts

Docs Updated:
- docs/features/implemented/F007-github-export.md
```

**Structure**:

1. Conventional commit format (`feat:`, `fix:`, `docs:`)
2. Feature ID on separate line
3. List modified files
4. Note doc updates

### PR Description Template

```markdown
## Feature: [Name]

**Feature ID**: F007
**Documentation**: `docs/features/implemented/F007-github-export.md`

## Changes

- [Change 1]
- [Change 2]

## Files Modified

- `src/components/` (2 files)
- `src/services/` (1 file)
- `docs/features/` (1 file)

## Testing

- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Documentation

- [x] Feature doc created/updated
- [x] Feature index updated
- [x] Git references added
```

### Pre-Commit Hook

The pre-commit hook reminds you to document:

```bash
#!/bin/sh
FEATURE_FILES=$(git diff --cached --name-only | grep -E "src/(components|utils|routes|stores)")

if [ -n "$FEATURE_FILES" ]; then
  COMMIT_MSG=$(cat .git/COMMIT_EDITMSG 2>/dev/null || echo "")
  FEATURE_ID=$(echo "$COMMIT_MSG" | grep -oP 'Feature: \K\w+')

  if [ -z "$FEATURE_ID" ]; then
    echo "⚠️  Feature files modified but no Feature ID in commit message"
    echo "Modified files:"
    echo "$FEATURE_FILES"
    echo ""
    echo "Consider:"
    echo "  1. Add 'Feature: F00X' to commit message"
    echo "  2. Update docs/features/implemented/F00X-name.md"
  fi
fi
```

---

## Quality Checklist

Before considering feature doc complete:

### Completeness

- [ ] All files discovered and documented
- [ ] Imports/exports traced completely
- [ ] Tests documented with coverage info
- [ ] No "...and other files" placeholders

### Accuracy

- [ ] File paths verified (files actually exist)
- [ ] Line numbers accurate (checked with grep)
- [ ] Code snippets match actual code (verified with reads)
- [ ] Integration points tested

### Clarity

- [ ] Data flow diagram matches actual flow
- [ ] Modification guide is actionable
- [ ] Quick summary is concise (<100 tokens)
- [ ] Technical terms explained

### Consistency

- [ ] Follows template structure
- [ ] Naming convention correct (F00X-feature-name.md)
- [ ] Index updated
- [ ] Cross-references added

### Maintenance

- [ ] Git references added
- [ ] "Last Modified" date updated
- [ ] Related features linked
- [ ] Deprecation notices added (if applicable)

---

## Common Patterns

### Pattern 1: Multi-Component Feature

**Example**: Chat System (UI + Backend + State)

**File Organization**:

```
Components: 5 files
Routes: 2 files
Services: 3 files
Stores: 1 file
Tests: 6 files
Total: 17 files
```

**Documentation Strategy**:

1. Group by category (components, routes, etc.)
2. Show component hierarchy
3. Document data flow from UI → API → DB
4. Cross-reference between sections

### Pattern 2: Service-Only Feature

**Example**: Email Service

**File Organization**:

```
Services: 1 file
Utils: 2 files
Types: 1 file
Tests: 2 files
Total: 6 files
```

**Documentation Strategy**:

1. Focus on service API
2. Show integration points (who uses it)
3. Document external dependencies (SendGrid, etc.)
4. Provide usage examples

### Pattern 3: UI-Only Feature

**Example**: Loading Spinner

**File Organization**:

```
Components: 1 file
Types: 1 file
Tests: 1 file
Total: 3 files
```

**Documentation Strategy**:

1. Keep it simple (may not need full template)
2. Show props/API
3. Provide usage examples
4. Link to design system

---

## Tips for Efficiency

### For AI Agents

**Batch operations**:

```bash
# Run all discovery commands at once
grep -r "FeatureName" src/ -l & \
find src/components -name "*Feature*" & \
git log --grep="F007" --name-only & \
wait
```

**Use template as checklist**:

- Copy template
- Fill sections in order
- Mark completed sections

**Parallelize reads**:

- Read multiple files simultaneously (if tool supports)
- Batch file existence checks

### For Developers

**Keyboard shortcuts**:

```bash
# Alias for common tasks
alias newdoc='cp docs/features/TEMPLATE.md docs/features/implemented/F00X-name.md'
alias updatedoc='vim docs/features/implemented/F00X-name.md'
```

**Script for index update**:

```bash
# add-to-index.sh
FEATURE_ID=$1
FEATURE_NAME=$2
echo "| $FEATURE_ID | [$FEATURE_NAME](./implemented/$FEATURE_ID-$FEATURE_NAME.md) | ✅ Production | [files] | $(date +%Y-%m-%d) |" >> docs/features/README.md
```

---

## Troubleshooting

### Problem: Can't find all files

**Solution**:

1. Try multiple search methods (grep + find + git)
2. Read imports in known files
3. Check tests for file references
4. Ask in team chat if stuck

### Problem: Don't know feature boundaries

**Solution**:

1. Check git history for related commits
2. Look at imports/exports
3. Ask feature implementer
4. Start with core files, expand outward

### Problem: Template too long

**Solution**:

1. Remove optional sections (Future Enhancements, etc.)
2. Collapse simple sections
3. Link to external docs instead of embedding
4. But: Never skip required sections

### Problem: Documentation gets outdated

**Solution**:

1. Set up pre-commit hook (reminders)
2. Include doc updates in PR checklist
3. Schedule quarterly doc review
4. Assign doc maintainer per feature

---

## Examples

See `docs/features/implemented/` for real examples:

- `F006-worktree-chat.md` - Multi-component feature
- `F003-view-exclusion.md` - Service-focused feature
- `F001-ai-chat-schema.md` - Full-stack feature

---

## Questions?

- Check: `agents/feature-documenter.md` (AI agent instructions)
- Check: `docs/features/TEMPLATE.md` (template reference)
- Check: `docs/features/README.md` (feature index)
- Ask: In project chat/issues

---

**Meta**: This workflow itself is documented as F000 - the documentation system.
