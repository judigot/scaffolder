---
title: $USE_CORE
---

# $USE_CORE

The `$USE_CORE` keyword allows you to import shared core files from the `Core/` directory into your projects using `structure.yaml`.

## Overview

The `$USE_CORE` feature enables you to define reusable file templates once in the `Core/` directory and import them into multiple projects, promoting DRY (Don't Repeat Yourself) principles while maintaining flexibility for project-specific customizations.

## Syntax

### Single Core Import

Import a single core template:

```yaml
$USE_CORE: /Core/vite

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### Multiple Core Imports

Import multiple core templates in priority order:

```yaml
$USE_CORE:
  - /Core/node
  - /Core/vite
  - /Core/react

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### No Core Imports

Projects can work without core imports, using only local `core/` folder:

```yaml
src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

## Merge Priority

Files are merged in priority order (later imports override earlier ones):

1. **First core import** in array (lowest priority)
2. **Second core import**
3. **...**
4. **Last core import**
5. **Local `core/` folder** ← **Highest priority** (always wins)

Files with the same name are overridden by later imports or the local project `core/` folder.

## Examples

### Example 1: Simple Single Import

**Core Template:**
```
/Core/vite/
├── .gitignore
├── package.json
└── vite.config.js
```

**Project structure.yaml:**
```yaml
$USE_CORE: /Core/vite

src:
  - index.html
  - src/
      - main.ts
```

**Result:**
```
├── .gitignore          ← from /Core/vite
├── package.json        ← from /Core/vite
├── vite.config.js      ← from /Core/vite
└── src/
    ├── index.html
    └── main.ts
```

### Example 2: Multiple Imports with Local Override

**Core Templates:**
```
/Core/node/
├── package.json        # Base Node.js dependencies

/Core/vite/
├── vite.config.js      # Vite configuration
└── package.json        # Vite dependencies
```

**Project structure:**
```
Projects/Express React/
├── core/
│   └── package.json    # Project-specific dependencies (OVERRIDES)
└── structure.yaml
```

**structure.yaml:**
```yaml
$USE_CORE:
  - /Core/node     # Base Node.js setup
  - /Core/vite     # Vite configuration

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

**Final Output:**
```
├── package.json        ← from local core/ (OVERRIDES /Core/node and /Core/vite)
├── vite.config.js      ← from /Core/vite
└── src/
    └── components/
        └── DataTable.tsx
```

### Example 3: Composable Templates

Create complex setups by composing multiple core templates:

```yaml
$USE_CORE:
  - /Core/node     # Base Node.js setup
  - /Core/vite     # Vite configuration
  - /Core/react    # React setup
  - /Core/typescript # TypeScript configuration

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

## Key Features

### ✅ Composable

Mix and match multiple core templates to create custom setups:

```yaml
$USE_CORE:
  - /Core/node
  - /Core/vite
  - /Core/react
```

### ✅ Override Control

Clear priority order - array position determines override precedence. Earlier imports have lower priority.

### ✅ Local Overrides

Project-specific `core/` folder always wins conflicts. Use it for project-specific customizations.

### ✅ Reserved Folders

`core/` and `Core/` folders are automatically excluded from final output. They only provide source files during generation.

### ✅ Backward Compatible

Projects without `$USE_CORE` still work with local `core/` folder only.

## Use Cases

### Sharing Configuration Files

Share common configuration files like `.gitignore`, `.prettierrc`, or `tsconfig.json` across multiple projects.

### Reusable Setup Templates

Create base setup templates for common frameworks (Vite, React, Express, etc.) and compose them as needed.

### Project-Specific Customization

Use local `core/` folder to override shared templates with project-specific configurations while maintaining a shared base.

## Implementation Details

### Core File Loading

The `$USE_CORE` directive is processed during project file generation:

1. System parses `$USE_CORE` from `structure.yaml`
2. Resolves core import paths (supports string or array)
3. Loads files from each core template in priority order
4. Merges files using priority rules
5. Applies local `core/` folder overrides (highest priority)
6. Strips `$USE_CORE` and `core/`/`Core/` folders from final output

### File Merging Logic

- **Folders**: Merge recursively, combining contents
- **Files**: Override by filename (last import wins)
- **Local `core/`**: Always takes precedence over shared cores

## Best Practices

### ✅ DO

- **Keep shared cores generic**: Core templates should contain reusable, generic configurations
- **Use local `core/` for project-specific files**: Override only when necessary
- **Document what each core provides**: Make it clear what each core template includes
- **Group related files**: Keep related configuration files together in core templates

### ❌ DON'T

- **Don't put generated code in cores**: Cores should contain templates, not generated output
- **Don't hardcode project-specific values**: Use placeholders for project-specific values
- **Don't create deep nesting unnecessarily**: Keep core structure flat and logical
- **Don't duplicate between shared and local**: Use override mechanism instead

## Summary

The `$USE_CORE` feature provides:

- ✅ **DRY principle** - Define once, use everywhere
- ✅ **Composability** - Mix and match templates
- ✅ **Override control** - Clear priority order
- ✅ **Flexibility** - 0 to N imports supported
- ✅ **Backward compatible** - Works without core imports

Use `$USE_CORE` to share common files across projects while maintaining project-specific control through local overrides.

## Related Documentation

- See [Core Directory](/documentation/structure/repository-folders/core/) for organizing core templates
- See [Repository Structure](/documentation/structure/) for complete repository organization
