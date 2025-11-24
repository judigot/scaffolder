# Documentation Rules

Rules for maintaining consistent, non-duplicated documentation structure and content.

## File Structure Rules

### 1. Folder-Based Pages Only

**Rule**: All documentation pages MUST be in folders with `index.md` files. No standalone `.md` files as pages.

**Structure**:
```
docs/
├── introduction/
│   └── index.md          ✅ Correct
├── features/
│   └── index.md          ✅ Correct
└── documentation/
    └── structure/
        └── index.md      ✅ Correct

❌ WRONG:
docs/
├── introduction.md       ❌ No standalone files
└── features.md           ❌ No standalone files
```

**Rationale**: Folder structure provides clear at-a-glance understanding and allows for future sub-pages.

### 2. URL Path Matches File Path

**Rule**: The URL path must exactly match the folder structure.

**Mapping**:
- URL: `/introduction/` → File: `docs/introduction/index.md`
- URL: `/documentation/structure/` → File: `docs/documentation/structure/index.md`
- URL: `/documentation/api-reference/core-imports/` → File: `docs/documentation/api-reference/core-imports/index.md`

**Rationale**: File-based routing ensures predictability and maintainability.

## Content Organization Rules

### 3. Separation: Structure vs API Reference

**Rule**: Clear separation between structure/organization documentation and API/syntax reference.

**Structure Documentation** (`/documentation/structure/`):
- Focus: **What** directories exist and **how to organize** them
- Content: Directory structure, organization patterns, best practices for file organization
- Example: What the `Core/` directory is, how to organize it, what files go in it

**API Reference** (`/documentation/api-reference/`):
- Focus: **Syntax** and **usage** of templating features
- Content: Syntax examples, merge priority rules, implementation details, technical reference
- Example: How to use `$USE_CORE` syntax, merge rules, examples with results

**Rationale**: Prevents duplication and allows readers to find information quickly based on their need.

### 4. No Content Duplication Between Pages

**Rule**: Each piece of information should exist in exactly one place.

**Examples**:
- ✅ **Correct**: Core Directory page describes organization, $USE_CORE page describes syntax
- ❌ **Wrong**: Both pages explaining merge priority in detail
- ✅ **Correct**: Cross-reference with links instead of duplicating content
- ✅ **Correct**: Brief summary in one place, detailed explanation in another (with link)

**Strategy**:
1. Identify the primary location for each topic
2. Use cross-references: "See [Page Name](/documentation/structure/repository-folders/core/) for details"
3. Keep summaries brief, link to detailed docs

### 5. Structure Documentation Hierarchy

**Rule**: Structure documentation follows the repository folder hierarchy.

**Pattern**:
```
documentation/structure/
├── index.md                          # Overall repository structure
└── repository-folders/
    ├── index.md                      # Overview of repository folders
    ├── core/
    │   └── index.md                  # Core directory details
    ├── templates/
    │   └── index.md                  # Templates directory details
    └── projects/
        └── index.md                  # Projects directory details
```

**Rationale**: Mirrors actual repository structure for intuitive navigation.

## Content Writing Rules

### 6. Frontmatter Required

**Rule**: Every page MUST have frontmatter with a `title` field.

**Format**:
```markdown
---
title: Page Title
---

# Page Title

Content starts here...
```

**Rationale**: Ensures consistent page titles and proper rendering.

### 7. H1 Matches Title

**Rule**: The H1 heading (`# Title`) must match the frontmatter title exactly.

**Example**:
```markdown
---
title: Core Directory
---

# Core Directory
```

**Rationale**: Consistency between title and heading.

### 8. Cross-Reference Pattern

**Rule**: When referencing related content, use descriptive links with context.

**Format**:
```markdown
See the [$USE_CORE syntax](/documentation/api-reference/core-imports/) for importing core templates.
```

**Not**:
```markdown
See $USE_CORE for details.
```

**Rationale**: Clear context about what the link contains.

### 9. Implementation Alignment

**Rule**: Documentation MUST align with actual API implementations in `src/utils/project-builder/`.

**Requirements**:
- **Syntax examples** must match actual implementation behavior
- **Option flags** must reflect available flags in `constants/actionFlags.ts`
- **Command syntax** must match processors in `project-processors/` and `template-processors/`
- **Merge priority rules** must reflect actual merge logic in `utils/mergeCoreFiles.ts`
- **Path resolution** must match implementation in `utils/findFileInStructure.ts`
- **Error handling** must document actual error behaviors from the code

**Verification**:
1. Review implementation files before writing API reference documentation
2. Test documented syntax matches actual behavior
3. Update documentation when implementation changes
4. Reference source files in code comments when documenting complex behavior

**Example**:
- ✅ **Correct**: Document `--scoped` flag because it exists in `actionFlags.ts` and is processed in `importProject.ts`
- ❌ **Wrong**: Document a `--verbose` flag that doesn't exist in the implementation

**Rationale**: Documentation accuracy is critical for user trust and successful adoption. Misaligned documentation causes frustration and incorrect usage.

## Navigation Rules

### 10. Top-Level Navigation

**Rule**: Top nav items link to main sections only.

**Structure**:
- Introduction → `/introduction/`
- Features → `/features/`
- Documentation → `/documentation/`

**Rationale**: Simple, clear navigation for main sections.

### 11. Sidebar Navigation

**Rule**: Sidebar only appears on documentation pages (`/documentation/`).

**Structure**: Sidebar reflects the folder hierarchy:

```
Structure
└── Repository Folders
    └── Core

API Reference
└── Overview
└── $USE_CORE
```

**Rationale**: Provides detailed navigation within documentation section only.

### 12. Sidebar Link Format

**Rule**: Sidebar links must include trailing slashes for folder-based routes.

**Format**:
```typescript
{ text: 'Repository Structure', link: '/documentation/structure/' }
{ text: 'Core', link: '/documentation/structure/repository-folders/core/' }
```

**Rationale**: Ensures proper route matching and active state highlighting.

## Content Focus Rules

### 13. Structure Pages: Organization Focus

**Rule**: Structure documentation pages focus on **organization and structure**, not usage syntax.

**Include**:
- What the directory/folder is
- How to organize files within it
- Directory structure examples
- What types of files belong there
- Organization best practices

**Exclude**:
- Detailed syntax examples
- Merge priority rules (link to API reference)
- Implementation details

**Rationale**: Separation of concerns - structure docs are about organization, not syntax.

### 14. API Reference Pages: Syntax Focus

**Rule**: API reference pages focus on **syntax and usage**, not organization details.

**Include**:
- Complete syntax reference
- Usage examples with results
- Merge priority and rules
- Implementation details
- Technical reference

**Exclude**:
- Detailed directory organization (link to structure docs)
- Duplicate explanations of what directories are

**Rationale**: API reference is for syntax and usage, not organization.

### 15. Business Value Pages: High-Level Focus

**Rule**: Introduction and Features pages focus on **value proposition**, not technical details.

**Include**:
- Business benefits
- Use cases
- Value propositions
- High-level capabilities

**Exclude**:
- Technical implementation details
- Syntax examples
- Detailed how-to guides

**Rationale**: These pages are for understanding value, technical docs are in Documentation section.

## Naming Conventions

### 16. Folder and File Names

**Rule**: Use lowercase, hyphenated names for folders. Use `index.md` for page files.

**Format**:
- Folders: `repository-folders/`, `api-reference/`, `core-imports/`
- Files: Always `index.md` within folders
- Page titles: Can use proper case (e.g., "Core Directory")

**Rationale**: Consistent naming prevents confusion and routing issues.

### 17. Sidebar Item Names

**Rule**: Sidebar items use concise, descriptive names matching folder structure.

**Format**:
- Folder names in sidebar match folder names
- Use proper case for display (e.g., "Repository Folders")
- Use syntax names exactly (e.g., "$USE_CORE")

**Rationale**: Sidebar should mirror file structure for intuitive navigation.

## Linking Rules

### 18. Internal Link Format

**Rule**: Always use absolute paths starting with `/` for internal links.

**Format**:
```markdown
[Link Text](/documentation/structure/)
```

**Not**:
```markdown
[Link Text](../structure/)
[Link Text](./structure/)
```

**Rationale**: Absolute paths work regardless of current page location.

### 19. Cross-Section References

**Rule**: When referencing content in different sections, provide context.

**Format**:
```markdown
Learn about the [Core Directory](/documentation/structure/repository-folders/core/) organization, or see [$USE_CORE syntax](/documentation/api-reference/core-imports/) for usage details.
```

**Rationale**: Helps readers understand what they'll find at the linked page.

## Anti-Duplication Rules

### 20. Single Source of Truth

**Rule**: Each topic has one primary location. Other pages reference it, don't duplicate it.

**Examples**:
- Merge priority: **Only** in API Reference
- Syntax examples: **Only** in API Reference  
- Directory structure: **Only** in Structure docs
- Organization patterns: **Only** in Structure docs

**Rationale**: Reduces maintenance burden and inconsistencies.

### 21. Summary vs Detail Pattern

**Rule**: Pages can have brief summaries, but detailed explanations exist in one place only.

**Format**:
```markdown
## Core Templates

Core templates are imported using `$USE_CORE`. See the [API Reference](/documentation/api-reference/core-imports/) for complete syntax and examples.
```

**Rationale**: Allows context while preventing duplication.

### 22. Content Placement Decision Tree

**Rule**: Use this decision tree to determine where content belongs:

1. **Is it about syntax or API usage?** → API Reference
2. **Is it about directory/folder organization?** → Structure docs
3. **Is it about business value or capabilities?** → Introduction/Features
4. **Does it already exist elsewhere?** → Reference it, don't duplicate

**Rationale**: Clear decision framework prevents duplication.

## Examples of Correct Structure

### ✅ Correct: Structure Page

```markdown
---
title: Core Directory
---

# Core Directory

The `Core/` directory contains shared templates...

## Organization
[Details about how to organize Core directory]

## Best Practices
[Organization best practices]

See [$USE_CORE syntax](/documentation/api-reference/core-imports/) for importing core templates.
```

### ✅ Correct: API Reference Page

```markdown
---
title: Core Imports ($USE_CORE)
---

# Core Imports ($USE_CORE)

The `$USE_CORE` keyword allows you to import...

## Syntax
[Complete syntax reference]

## Examples
[Detailed examples with results]

See [Core Directory](/documentation/structure/repository-folders/core/) for organizing core templates.
```

## Summary

Follow these rules to maintain:
- ✅ **Consistency**: All pages follow same structure
- ✅ **Clarity**: Clear separation of concerns
- ✅ **No duplication**: Each topic has one source of truth
- ✅ **Maintainability**: Easy to find and update content
- ✅ **Intuitive navigation**: Structure matches file system

