# Core Files Feature Guide

## Overview
The core files feature allows you to include essential files that should be present in every generated project. These files are automatically merged with the scaffolded files during project generation.

## How It Works

### 1. File Structure
```
Projects/
  Express React/
    ├── core/                    # Core essential files
    │   ├── .gitignore
    │   ├── package.json
    │   ├── README.md
    │   └── config/
    │       ├── app.js
    │       └── database.js
    └── structure.yaml           # Scaffolding definition
```

### 2. Merging Behavior

**Core files are loaded first, then scaffolded files are merged on top.**

#### File Override
If both core and scaffolded files have the same path and name:
- **Scaffolded file wins** (overrides the core file)

Example:
```
core/package.json        → Base configuration
scaffolded/package.json  → Overrides with project-specific settings
```

#### Folder Merging
If both core and scaffolded structures contain the same folder:
- **Folders are merged** (not replaced)
- Files from both sources are combined
- Nested folders follow the same merge rules

Example:
```
core/config/
  ├── app.js           # From core
  └── database.js      # From core

scaffolded/config/
  └── routes.js        # From scaffolded

Result/config/
  ├── app.js           # From core
  ├── database.js      # From core
  └── routes.js        # From scaffolded
```

#### New Items
Files and folders that exist only in scaffolded or only in core:
- **Added to the final structure**

### 3. Use Cases

#### Essential Configuration Files
Place base configuration files in core that every project needs:
- `.gitignore`
- `package.json` (base dependencies)
- `.env.example`
- `README.md` (template)

#### Shared Utilities
Common utilities and helpers:
- `config/` folder with base settings
- `utils/` folder with helper functions
- `constants/` folder

#### Boilerplate Code
Standard setup code that every project should have:
- Server initialization
- Middleware setup
- Error handlers
- Logger configuration

### 4. Best Practices

1. **Keep core minimal**: Only include truly essential files
2. **Use generic names**: Avoid project-specific naming
3. **Document core files**: Explain their purpose in README.md
4. **Allow overrides**: Design core files to be easily customizable
5. **Nested structure**: Organize core files in logical folders

### 5. Example Workflow

1. **Developer adds files to core folder**
```
core/
  ├── .gitignore
  ├── package.json
  └── config/
      └── database.js
```

2. **Scaffolder generates project-specific files**
```
Generated from structure.yaml:
  src/
    ├── components/
    │   └── DataTable.tsx
    └── config/
        └── routes.js
```

3. **Files are merged during build**
```
Final structure:
  ├── .gitignore          # From core
  ├── package.json        # From core (or overridden if scaffolded)
  ├── src/
  │   └── components/
  │       └── DataTable.tsx  # From scaffolder
  └── config/
      ├── database.js     # From core
      └── routes.js       # From scaffolder
```

### 6. Implementation Details

The merge happens in `buildProjectFiles`:
1. Load core files from the `core/` folder
2. Generate scaffolded files from `structure.yaml`
3. Merge core and scaffolded using `mergeCoreFilesWithScaffolded`
4. Return the merged structure

### 7. Tips

- Use core files for cross-cutting concerns
- Override core files when project needs differ
- Nested folders allow partial overrides
- Test the merge by generating a project and checking the output

## Current Core Files

### `.gitignore`
Standard Node.js ignore patterns for common directories and files.

### `package.json`
Base package configuration with essential dependencies:
- express
- cors

### `config/app.js`
Application-level configuration (port, environment, API prefix).

### `config/database.js`
Database connection configuration with environment variable support.

### `README.md`
Template README explaining the core files concept.

