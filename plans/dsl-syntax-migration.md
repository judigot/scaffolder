# DSL Syntax Migration Plan

## Overview

Migrate all template syntax to a consistent HTML-like DSL using `<@@TAG@@>` format. This provides visual distinction from HTML/JSX while maintaining familiarity for developers.

## Current State (Multiple Syntaxes)

```
[[LOOP(tables) --template="{{tableName}}" --separator="\n"]]
[[LOOP_DATA_SOURCES(path --template="..." --separator="...")]]
[[USE_DATA(property.nested)]]
@ITERATE(tables) { ... }
<@@LOOP@@ data="tables">...</@@LOOP@@>
```

## Target State (Unified Syntax)

### Block Directives

```html
<@@LOOP@@ data="tables" separator="\n">
  {{tableName}}
</@@LOOP@@>

<@@LOOP@@ data="columnsInfo" separator=",\n">
  "{{column.name}}" {{column.type}}
</@@LOOP@@>

<@@LOOP@@ data="DataSources/People/**/info.yaml">
  {{data.name}} - {{data.email}}
</@@LOOP@@>
```

### Conditionals

```html
<@@IF@@ condition="is_primary_key EQUALS 'true'">
  BIGSERIAL PRIMARY KEY
</@@IF@@>

<@@IF@@ condition="has_foreign_key EQUALS 'true'">
  CONSTRAINT "FK_{{tableName}}_{{column.name}}"
  FOREIGN KEY ("{{column.name}}")
  REFERENCES "{{column.foreign_table}}" ("{{column.foreign_column}}")
</@@IF@@>
```

### Placeholders

```html
{{tableName}}
{{column.name}}
{{data.employee.department}}
```

### Other Directives

```html
<@@FORMAT@@ language="sql">
  ...content...
</@@FORMAT@@>

<@@IMPORT@@ path="shared/header.template" />

<@@USE_CORE@@ path="framework/base" />
```

## Syntax Design Principles

1. **Visually Distinct**: `<@@TAG@@>` cannot be confused with HTML/JSX
2. **Self-Closing Support**: `<@@IMPORT@@ path="..." />`
3. **Attribute-Based Config**: `data="tables" separator="\n"`
4. **Familiar Structure**: Opening/closing tags like HTML
5. **Nestable**: Clear parent/child relationships

## Migration Steps

### Phase 1: Audit

- [ ] List all files using legacy syntax
- [ ] Identify all syntax variations in use
- [ ] Document edge cases

### Phase 2: Update Parser

- [ ] Ensure `<@@TAG@@>` parser handles all cases
- [ ] Add deprecation warnings for legacy syntax (optional)
- [ ] Update error messages to reference new syntax

### Phase 3: Migrate Templates

- [ ] Convert `[[LOOP...]]` to `<@@LOOP@@>`
- [ ] Convert `@ITERATE` to `<@@LOOP@@>`
- [ ] Convert `[[USE_DATA(...)]]` to `{{data.property}}`
- [ ] Update all project templates in `/src/utils/project-builder/`

### Phase 4: Update Tests

- [ ] Update template syntax tests
- [ ] Verify golden tests pass
- [ ] Add tests for new syntax edge cases

### Phase 5: Documentation

- [ ] Update NQL.md with new syntax
- [ ] Update any README references
- [ ] Add migration guide for user templates

## Files to Modify

### Core Parser
- `src/utils/project-builder/template-processors/processIterateCommand.ts`
- `src/utils/project-builder/template-processors/processHtmlFormat.ts`
- `src/utils/project-builder/template-processors/fileBased.ts`

### Templates
- All files in `src/utils/project-builder/frameworks/`
- Project structure YAML files

### Tests
- `src/tests/utils/project-builder/template-processors/*.test.ts`
- `src/tests/golden-projects/*.test.ts`

## Safety Net

1. **Golden Tests**: End-to-end verification of generated projects
2. **Template Syntax Tests**: Unit tests for parser
3. **TypeScript Compilation**: Generated code must compile
4. **CI Pipeline**: All tests run on every change

## Success Criteria

- [ ] All legacy syntax removed from codebase
- [ ] All tests passing
- [ ] Golden tests generate valid projects
- [ ] No `[[LOOP`, `@ITERATE`, etc. in any template files
