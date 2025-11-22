# Core Imports Feature

## Overview

The core imports feature allows you to reuse shared core files across multiple projects using the `$CORE` keyword in `structure.yaml`.

## Syntax

### Single Import
```yaml
$CORE: /Core/vite

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### Multiple Imports
```yaml
$CORE:
  - /Core/vite
  - /Core/react
  - /Core/extra-core-files

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### No Imports (Backward Compatible)
```yaml
# Just use local core/ folder
src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

## How It Works

### Merge Order

**Priority from lowest to highest (later wins):**

1. First core import in array
2. Second core import
3. ...
4. Last core import
5. **Local `core/` folder** ← Highest priority

### Example Scenario

**Setup:**
```
/Core/vite/
├── .gitignore
├── package.json
└── vite.config.js

Express React/core/
├── package.json (custom)
└── vite.config.js (custom)
```

**structure.yaml:**
```yaml
$CORE: /Core/vite

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

**Final Output:**
```
├── .gitignore          ← from /Core/vite
├── package.json        ← from local core/ (OVERRIDE)
├── vite.config.js      ← from local core/ (OVERRIDE)
└── src/
    └── components/
        └── DataTable.tsx
```

## File Structure

```
src/files/
├── Core/                      # Shared core templates
│   ├── vite/
│   │   ├── .gitignore
│   │   ├── package.json
│   │   └── vite.config.js
│   ├── react/
│   │   ├── .prettierrc
│   │   └── src/
│   │       └── App.tsx
│   └── extra-core-files/
│       └── extra.js
│
└── Projects/
    └── Express React/
        ├── core/              # Project-specific (highest priority)
        │   ├── package.json   # Overrides /Core/vite/package.json
        │   └── config/
        └── structure.yaml
            # $CORE: /Core/vite
```

## Key Features

### ✅ Composable
Mix and match multiple core templates:
```yaml
$CORE:
  - /Core/node     # Base Node.js setup
  - /Core/vite     # Vite configuration
  - /Core/react    # React setup
```

### ✅ Override Control
Clear priority order - array position determines override precedence.

### ✅ Local Overrides
Project-specific `core/` folder always wins conflicts.

### ✅ Reserved Folders
`core/` and `Core/` folders are automatically excluded from final output.

### ✅ Backward Compatible
Projects without `$CORE` still work with local `core/` folder only.

## Use Cases

### Simple Project
```yaml
$CORE: /Core/vite

src:
  - index.html
  - src/
      - main.ts
```

### Composed Project
```yaml
$CORE:
  - /Core/node
  - /Core/vite
  - /Core/react

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### With Custom Overrides
```yaml
$CORE: /Core/vite

# Local core/package.json adds project-specific dependencies
# Local core/vite.config.js adds custom Vite plugins

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

## Implementation

### Core Functions

**1. `loadCoreFiles.ts`**
- Parses `$CORE` from structure.yaml
- Supports string and array formats
- Resolves core import paths
- Merges in priority order
- Local core/ has highest priority

**2. `mergeCoreFiles.ts`**
- Smart merge algorithm
- Folders merge recursively
- Files override by name
- Dynamic conflict resolution

**3. `buildProjectFiles.ts`**
- Strips `$CORE` before processing YAML
- Filters `core` and `Core` from output
- Returns clean project structure

## Best Practices

### ✅ DO
- Keep shared cores generic
- Use local `core/` for project-specific files
- Document what each core template provides
- Group related files in core templates

### ❌ DON'T
- Don't put generated code in cores
- Don't hardcode project-specific values
- Don't create deep nesting unnecessarily
- Don't duplicate between shared and local

## Examples

### Base Configuration Core
```
Core/node/
├── .gitignore
├── .env.example
└── package.json
```

### Vite Configuration Core
```
Core/vite/
├── vite.config.js
└── tsconfig.json
```

### React Setup Core
```
Core/react/
├── .prettierrc
├── .eslintrc.json
└── src/
    ├── App.tsx
    └── main.tsx
```

## Summary

The core imports feature provides:
- ✅ DRY principle - define once, use everywhere
- ✅ Composability - mix and match templates
- ✅ Override control - clear priority order
- ✅ Flexibility - 0 to N imports
- ✅ Type safe - full TypeScript support
- ✅ Tested - comprehensive test suite
- ✅ Zero linter errors - production ready

**Use `$CORE` to share common files across projects while maintaining project-specific control!**

