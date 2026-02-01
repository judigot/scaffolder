# Error Reporting Plan

## Overview

Implement dual error reporting: banners for web UI visibility and error files for CLI/package scriptability. Both methods work together to provide comprehensive error feedback.

## Current State

Errors are surfaced as files in the generated file tree:

```
project/
├── src/
├── file-not-found.log
└── circular-import-error.log
```

**Pros:**
- Visible in file viewer
- Grep-able for CLI usage
- Can be checked in CI pipelines

**Cons:**
- Easy to miss in large file trees
- No severity levels
- No actionable suggestions
- Poor UX for web users

## Target State

### Web UI: Banners

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  WARNING: 2 templates have unresolved placeholders       │
│     • src/models/User.ts: {{unknownField}}                  │
│     • src/routes/api.ts: {{missingConfig}}                  │
│                                                    [Dismiss] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ❌ ERROR: Circular import detected                          │
│     shared/header.template → shared/footer.template →       │
│     shared/header.template                                  │
│                                                    [Details] │
└─────────────────────────────────────────────────────────────┘
```

### CLI/Package: Error Files

```
project/
├── src/
├── .scaffolder/
│   ├── errors.log
│   ├── warnings.log
│   └── info.log
```

Or inline with clear naming:

```
project/
├── src/
├── _ERRORS_.md
└── _WARNINGS_.md
```

## Severity Levels

| Level | Icon | Use Case | Blocks Generation? |
|-------|------|----------|-------------------|
| `error` | ❌ | Circular imports, missing required files | Yes |
| `warning` | ⚠️ | Unresolved placeholders, deprecated syntax | No |
| `info` | ℹ️ | Suggestions, optimization hints | No |

## Banner Component API

```typescript
interface IScaffolderMessage {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  details?: string[];
  file?: string;
  line?: number;
  suggestion?: string;
  dismissible: boolean;
}

// Usage in component
const { messages, dismissMessage } = useScaffolderMessages();

return (
  <>
    {messages.map((msg) => (
      <ScaffolderBanner
        key={msg.id}
        severity={msg.severity}
        title={msg.title}
        details={msg.details}
        onDismiss={msg.dismissible ? () => dismissMessage(msg.id) : undefined}
      />
    ))}
    <FileViewer files={generatedFiles} />
  </>
);
```

## Error File Format

### Markdown Format (Preferred)

```markdown
# Scaffolder Errors

## Circular Import Detected

**File:** shared/header.template
**Line:** 12

Import chain:
1. shared/header.template
2. shared/footer.template
3. shared/header.template (circular!)

**Suggestion:** Remove the import of header.template from footer.template.

---

## Missing Required File

**File:** src/models/{{tableName}}.ts
**Placeholder:** {{unknownField}}

The placeholder `unknownField` is not defined in the current context.

**Available placeholders:**
- tableName
- columnName
- foreignTable
```

### JSON Format (For Programmatic Access)

```json
{
  "errors": [
    {
      "code": "CIRCULAR_IMPORT",
      "file": "shared/header.template",
      "line": 12,
      "message": "Circular import detected",
      "chain": ["shared/header.template", "shared/footer.template", "shared/header.template"],
      "suggestion": "Remove the import of header.template from footer.template"
    }
  ],
  "warnings": [],
  "info": []
}
```

## Implementation Steps

### Phase 1: Define Message Types

- [ ] Create `IScaffolderMessage` interface
- [ ] Define error codes enum
- [ ] Create message factory functions

### Phase 2: Update Build Pipeline

- [ ] Collect messages during generation (not just files)
- [ ] Return messages alongside generated files
- [ ] Support both banner data and file output

```typescript
interface IBuildResult {
  files: IStructure;
  messages: IScaffolderMessage[];
  hasErrors: boolean;
  hasWarnings: boolean;
}
```

### Phase 3: Create Banner Component

- [ ] Create `ScaffolderBanner` component
- [ ] Style for error/warning/info variants
- [ ] Add dismiss functionality
- [ ] Add expand/collapse for details

### Phase 4: Update File Viewer Integration

- [ ] Display banners above file tree
- [ ] Link banner to relevant file (click to navigate)
- [ ] Highlight files with errors in tree

### Phase 5: CLI/Package Output

- [ ] Generate `_ERRORS_.md` when errors exist
- [ ] Generate `_WARNINGS_.md` when warnings exist
- [ ] Support `--json` flag for JSON output
- [ ] Exit with non-zero code on errors

## Files to Modify

### Core
- `src/utils/project-builder/buildProjectFiles.ts`
- Create `src/utils/project-builder/messages.ts`

### Components
- Create `src/components/UI/ScaffolderBanner.tsx`
- Update `src/components/FileViewer.tsx`

### Stores
- Create `src/stores/useScaffolderMessagesStore.ts` or add to existing store

## Error Codes

| Code | Severity | Description |
|------|----------|-------------|
| `CIRCULAR_IMPORT` | error | Template imports itself |
| `CIRCULAR_PLACEHOLDER` | error | Placeholder references itself |
| `FILE_NOT_FOUND` | error | Imported file doesn't exist |
| `UNRESOLVED_PLACEHOLDER` | warning | Placeholder not in context |
| `DEPRECATED_SYNTAX` | warning | Using legacy template syntax |
| `EMPTY_LOOP` | info | Loop has no items |
| `UNUSED_VARIABLE` | info | Context variable not used |

## UX Considerations

### Banner Placement
- Above file tree, always visible
- Sticky at top when scrolling
- Grouped by severity (errors first)

### Dismissibility
- Errors: Not dismissible (must be fixed)
- Warnings: Dismissible, but reappear on regeneration
- Info: Dismissible, remember preference

### Progressive Disclosure
- Show title by default
- Expand for details
- Link to documentation for complex errors

## Success Criteria

- [ ] Banners display in web UI for all message types
- [ ] Error files generated for CLI usage
- [ ] Messages include actionable suggestions
- [ ] Clicking banner navigates to relevant file
- [ ] Non-zero exit code for CLI when errors exist
- [ ] All existing error cases covered
