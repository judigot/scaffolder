---
title: IMPORT_PROJECT
---

# IMPORT_PROJECT

The `IMPORT_PROJECT` keyword allows you to import and reuse project structures from other project directories in your `structure.yaml` files.

## Overview

The `IMPORT_PROJECT` feature enables you to compose complex project structures by importing and combining multiple project definitions. This promotes code reuse and allows you to build projects incrementally by combining smaller, reusable project structures.

## Syntax

### Basic Import

Import a project structure from another `structure.yaml` file:

```yaml
src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### Import with Child Structure

Import a project and add additional structure:

```yaml
src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
    components:
      - DataTable.tsx
      - UserProfile.tsx
```

### Import in Array

Import multiple projects in an array:

```yaml
src:
  - IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml)
  - IMPORT_PROJECT(Projects/Backend API/structure.yaml)
```

## Options

### Scoped Import

Process the imported project with table-specific context:

```yaml
src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml --scoped):
```

When using `--scoped`, the imported project structure is processed for each table in your schema, allowing table-specific file generation.

### Include Table Filter

Import project structure only for specific tables:

```yaml
src:
  IMPORT_PROJECT(Projects/Admin Panel/structure.yaml --include-table users):
```

The `--include-table` option filters the import to only process for the specified table.

### Exclude Table Filter

Import project structure for all tables except specified ones:

```yaml
src:
  IMPORT_PROJECT(Projects/Public API/structure.yaml --exclude-table admin_users):
```

The `--exclude-table` option excludes the specified table from processing.

## How It Works

1. **Path Resolution**: Scaffolder locates the specified project structure file
2. **YAML Parsing**: The imported `structure.yaml` file is parsed
3. **Structure Processing**: The imported structure is processed with the current context
4. **Merge**: The imported structure is merged into the current project structure

## Examples

### Example 1: Simple Import

**Imported Project** (`Projects/Template - Frontend/structure.yaml`):
```yaml
hooks:
  shared:
    - useCreate.ts
    - useUpdate.ts
services:
  - api.ts
```

**Main Project** (`Projects/Express React/structure.yaml`):
```yaml
$USE_CORE: /Core/vite

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
  components:
    - DataTable.tsx
```

**Resulting Structure**:
```
src/
├── hooks/
│   └── shared/
│       ├── useCreate.ts
│       └── useUpdate.ts
├── services/
│   └── api.ts
└── components/
    └── DataTable.tsx
```

### Example 2: Composing Projects

Build a full-stack project by combining frontend and backend structures:

```yaml
$USE_CORE:
  - /Core/node
  - /Core/typescript

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
  
backend:
  IMPORT_PROJECT(Projects/Laravel/structure.yaml):
```

### Example 3: Scoped Import

Generate table-specific files using an imported template:

```yaml
src:
  hooks:
    IMPORT_PROJECT(Projects/Base Hooks/structure.yaml --scoped):
```

This generates hooks for each table in your schema.

### Example 4: Conditional Import

Import different structures based on conditions:

```yaml
src:
  - IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml)
  - IMPORT_PROJECT(Projects/Admin Panel/structure.yaml --include-table admin_users)
```

## Path Format

Project paths are relative to the `Projects/` directory:

```yaml
# Correct
IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml)
IMPORT_PROJECT(Projects/Laravel/structure.yaml)

# Incorrect
IMPORT_PROJECT(/Projects/Template - Frontend/structure.yaml)  # Leading slash
IMPORT_PROJECT(Template - Frontend/structure.yaml)            # Missing Projects/ prefix
```

## Integration with $USE_CORE

`IMPORT_PROJECT` works seamlessly with `$USE_CORE`:

```yaml
$USE_CORE: /Core/vite

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

The imported project structure will inherit the core imports defined in the main project.

## Key Features

### ✅ Composability

Build complex projects by combining multiple project structures:

```yaml
src:
  IMPORT_PROJECT(Projects/Frontend/structure.yaml):
  backend:
    IMPORT_PROJECT(Projects/Backend/structure.yaml):
```

### ✅ Reusability

Define common project structures once and reuse them across multiple projects.

### ✅ Flexibility

Add custom structure alongside imported projects:

```yaml
src:
  IMPORT_PROJECT(Projects/Base/structure.yaml):
    custom:
      - customFile.ts
```

### ✅ Scoped Processing

Use `--scoped` to generate table-specific files from imported structures.

### ✅ Table Filtering

Use `--include-table` and `--exclude-table` to control which tables are processed.

## Best Practices

### ✅ DO

- **Use descriptive project names**: Make imported project purposes clear
- **Compose incrementally**: Build projects by combining smaller, focused structures
- **Document imports**: Comment why specific projects are imported
- **Organize projects**: Group related project structures together
- **Reuse common structures**: Create base templates for common patterns

### ❌ DON'T

- **Don't create circular imports**: Avoid importing projects that import each other
- **Don't deeply nest**: Keep import chains reasonable (2-3 levels)
- **Don't duplicate**: Use imports instead of copying structures
- **Don't hardcode paths**: Use relative paths from `Projects/` directory

## Circular Import Detection

Scaffolder automatically detects and prevents circular imports between projects. If a circular dependency is detected, generation will fail with an error message.

**Example of circular import:**
```yaml
# Project A imports Project B
IMPORT_PROJECT(Projects/Project B/structure.yaml):

# Project B imports Project A (circular!)
IMPORT_PROJECT(Projects/Project A/structure.yaml):
```

## Summary

The `IMPORT_PROJECT` feature provides:

- ✅ **Composability** - Combine multiple project structures
- ✅ **Reusability** - Define once, use everywhere
- ✅ **Flexibility** - Add custom structure alongside imports
- ✅ **Scoped processing** - Table-specific file generation
- ✅ **Table filtering** - Control which tables are processed

Use `IMPORT_PROJECT` to build complex projects by composing reusable project structures while maintaining flexibility for project-specific customizations.

