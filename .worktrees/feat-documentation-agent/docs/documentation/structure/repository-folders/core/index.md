---
title: Core Directory
---

# Core Directory

The `Core/` directory contains shared file templates that can be reused across multiple projects in your `scaffolder-files` repository.

## Overview

The Core directory is a central location for reusable templates. Instead of duplicating common configuration files, build tools, or setup code across projects, you define them once in the Core directory and reference them using the `$USE_CORE` syntax.

## Directory Structure

```
scaffolder-files/
└── Core/
    ├── vite/
    │   ├── .gitignore
    │   ├── package.json
    │   └── vite.config.js
    ├── react/
    │   ├── .prettierrc
    │   └── src/
    │       └── App.tsx
    ├── node/
    │   └── package.json
    └── typescript/
        └── tsconfig.json
```

## Organization

Each subdirectory in `Core/` represents a reusable template that can be imported into projects:

```
Core/
└── template-name/    # Descriptive name for the template
    ├── file1.txt
    ├── file2.json
    └── subfolder/
        └── file3.js
```

### Naming Conventions

Use clear, descriptive names for core templates:

- `vite` - Vite build tool configuration
- `react` - React framework setup
- `node` - Node.js base configuration
- `typescript` - TypeScript configuration
- `express` - Express.js server setup

## What Goes in Core

### Configuration Files

Share common configuration files across projects:

```
Core/vite/
├── .gitignore
├── .prettierrc
├── .eslintrc.json
└── vite.config.js
```

### Build Tool Setups

Standardize build tool configurations:

```
Core/webpack/
├── webpack.config.js
└── package.json
```

### Framework Templates

Create framework-specific base templates:

```
Core/react/
├── .prettierrc
├── .eslintrc.json
└── src/
    └── App.tsx
```

### Language Configurations

Share language-specific settings:

```
Core/typescript/
└── tsconfig.json
```

## Reserved Directory

The `Core/` directory is automatically excluded from the final generated output. It only serves as a source for importing files into projects. Files are merged into project structures during generation, but the `Core/` directory itself is never included in the output.

## Best Practices

### ✅ DO

- **Keep templates generic**: Core templates should be reusable across multiple projects
- **Use descriptive names**: Name core templates clearly (e.g., `vite`, `react`, `node`)
- **Group related files**: Keep related configuration files together in the same core template
- **Document templates**: Add README files explaining what each core template provides
- **Version control**: Track all core template changes in Git

### ❌ DON'T

- **Don't hardcode project-specific values**: Use placeholders for project-specific values
- **Don't put generated code**: Core templates should contain templates, not generated output
- **Don't create deep nesting**: Keep core structure flat and logical
- **Don't duplicate**: Use core templates instead of copying files between projects

## Example Core Templates

### Vite Configuration Core

```
Core/vite/
├── .gitignore
├── package.json
└── vite.config.js
```

Base Vite configuration for frontend projects.

### React Setup Core

```
Core/react/
├── .prettierrc
├── .eslintrc.json
└── src/
    └── App.tsx
```

React-specific configuration and base components.

### Node.js Base Core

```
Core/node/
├── .gitignore
├── .env.example
└── package.json
```

Base Node.js project setup with common dependencies.

## Using Core Templates

Core templates are imported into projects using the `$USE_CORE` syntax in `structure.yaml`. See the [$USE_CORE API Reference](/documentation/api-reference/core-imports/) for complete syntax and usage details.

## Next Steps

- Learn about [$USE_CORE syntax](/documentation/api-reference/core-imports/) for importing core templates
- See [Repository Structure](/documentation/structure/) for the complete repository organization
