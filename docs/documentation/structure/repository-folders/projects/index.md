---
title: Projects Directory
---

# Projects Directory

The `Projects/` directory contains complete project templates with their structure definitions and optional project-specific templates.

## Overview

Projects are complete, reusable project structures that define file organization, templates, and configurations. Each project can reference shared Core templates and include project-specific customizations.

**Users and developers can create their own project structures** to customize Scaffolder for their specific needs or according to their company's conventions. This flexibility allows teams to maintain consistency across projects while adapting to their unique workflows and standards.

## Directory Structure

```
Projects/
├── Laravel/
│   ├── structure.yaml
│   └── templates/
│       ├── Controller.txt
│       ├── Model.txt
│       └── Service.txt
├── Next.js/
│   ├── structure.yaml
│   └── templates/
│       └── route.txt
├── Express React/
│   ├── core/
│   │   ├── package.json
│   │   └── vite.config.js
│   └── structure.yaml
└── Template - Frontend/
    ├── structure.yaml
    └── templates/
        └── service.txt
```

## Project Structure

Each project contains:

### structure.yaml

The main project definition file that specifies:

- **Core imports** - Shared templates using `$USE_CORE`
- **File structure** - Directory and file organization
- **Template references** - Which templates to use for each file
- **Project configuration** - Project-specific settings

**Example:**
```yaml
$USE_CORE: /Core/vite

src:
  - index.html
  - src/
      - main.ts
      - components/
          - DataTable.tsx: IMPORT_TEMPLATE(Templates/frontend/react/components/DataTable.txt)
```

### core/ Directory (Optional)

Project-specific core files that override shared Core templates:

```
Projects/Express React/
├── core/
│   ├── package.json         # Overrides /Core/vite/package.json
│   └── vite.config.js       # Overrides /Core/vite/vite.config.js
└── structure.yaml
```

The local `core/` directory has the highest priority and always overrides shared Core templates.

### templates/ Directory (Optional)

Project-specific templates that override or complement shared templates:

```
Projects/Laravel/
├── templates/
│   ├── Controller.txt       # Project-specific controller template
│   └── Service.txt          # Project-specific service template
└── structure.yaml
```

## Project Types

Projects are organized by technology stack or purpose:

### Framework Projects

- **Laravel** - Laravel API project structure
- **Next.js** - Next.js full-stack project
- **Express React** - Express backend with React frontend

### Template Projects

- **Template - Frontend** - Base frontend project template

## Creating Custom Projects

You can create your own custom project structures tailored to your needs or company conventions:

1. **Create Project Directory**: Add a new folder in `Projects/` with your project name
2. **Define Structure**: Create a `structure.yaml` file defining your file organization
3. **Add Templates**: Optionally add project-specific templates in a `templates/` subdirectory
4. **Configure Core**: Use `$USE_CORE` to import shared templates or add a local `core/` folder for overrides
5. **Customize**: Adapt the structure to match your team's conventions and standards

This allows you to:
- Maintain consistency across all your projects
- Enforce company-specific coding standards
- Standardize project structures within your organization
- Reuse configurations while allowing project-specific customizations

## Using Projects

Projects are used during code generation:

1. Select a project from `Projects/` directory (or use your custom project)
2. Scaffolder loads `structure.yaml` from the project
3. Core templates are imported (if specified)
4. Project structure is generated
5. Templates are applied to create files

## Core Import Priority

When using `$USE_CORE` in projects:

1. **First core import** (lowest priority)
2. **Subsequent core imports** (in order)
3. **Local `core/` folder** (highest priority - always wins)

## Project Templates vs Shared Templates

Projects can use templates from multiple sources:

- **Shared Templates** (`Templates/` directory) - Reusable across all projects
- **Project Templates** (`Projects/ProjectName/templates/`) - Specific to the project
- **Template references** in `structure.yaml` specify which template to use

## Best Practices

### ✅ DO

- **Create custom projects**: Build project structures that match your company's conventions
- **Use descriptive names**: Make project names clear and specific
- **Document structure**: Add README files for complex projects
- **Leverage Core**: Use `$USE_CORE` for shared configurations
- **Keep projects focused**: One project per tech stack or purpose
- **Customize for teams**: Adapt projects to enforce team-specific standards
- **Version control**: Track all project changes in Git

### ❌ DON'T

- **Don't duplicate**: Use Core templates instead of copying files
- **Don't hardcode paths**: Use relative template references
- **Don't mix concerns**: Keep projects focused on specific stacks
- **Don't create deep nesting**: Keep project structure flat and logical

## Integration with Core

Projects integrate with the Core directory:

- Import shared configurations using `$USE_CORE`
- Override with local `core/` folder when needed
- Combine multiple core templates for complex setups

## Project Structure Definition

The `structure.yaml` file supports:

- **`$USE_CORE`** - Import shared core templates
- **File definitions** - Define files and directories
- **`IMPORT_TEMPLATE()`** - Reference template files
- **`IMPORT_PROJECT()`** - Import from other projects

## Next Steps

- Learn about [Core Directory](/documentation/structure/repository-folders/core/) for shared templates
- See [Templates](/documentation/structure/repository-folders/templates/) for code templates
- Review [$USE_CORE](/documentation/api-reference/core-imports/) for importing cores
- Check [API Reference](/documentation/api-reference/) for structure.yaml syntax

