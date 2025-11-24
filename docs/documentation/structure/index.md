---
title: Repository Structure
---

# Repository Structure

Learn about the structure of your `scaffolder-files` repository and how to organize your templates and projects.

## Repository Overview

Your `scaffolder-files` repository is a GitHub repository that contains all your templates, configurations, and project structures. Scaffolder loads files from this repository to generate code.

## Directory Structure

```
scaffolder-files/
├── Constants/
│   ├── typeMappings.yaml    # Database type mappings
│   └── dbTypes.yaml          # Supported database types
├── Core/                     # Shared core templates
│   ├── vite/
│   ├── react/
│   └── node/
├── Templates/                # Code templates
│   ├── API/                  # API endpoint templates
│   ├── Models/               # Model templates
│   └── Controllers/          # Controller templates
└── Projects/                 # Complete project templates
    ├── Express React/
    │   ├── core/             # Project-specific overrides
    │   └── structure.yaml    # Project structure definition
    └── Laravel API/
        ├── core/
        └── structure.yaml
```

## Constants Directory

The `Constants/` directory contains configuration files that define how Scaffolder processes your schemas.

### typeMappings.yaml

Maps database types to application types for each database system:

```yaml
postgresql:
  varchar: string
  text: string
  integer: number
  bigint: number
  boolean: boolean
  timestamp: Date
  uuid: string

mysql:
  varchar: string
  int: number
  tinyint: boolean
  datetime: Date
```

### dbTypes.yaml

Lists all supported database types:

```yaml
- postgresql
- mysql
- sqlite
- mssql
```

## Core Directory

The `Core/` directory contains shared templates that can be reused across multiple projects using the `$USE_CORE` syntax.

### Example Core Structure

```
Core/
├── vite/
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
├── react/
│   ├── .prettierrc
│   └── src/
│       └── App.tsx
└── node/
    └── package.json
```

Core templates are imported into projects using `$USE_CORE` in `structure.yaml`. See the [API Reference](/documentation/api-reference/) for details.

## Templates Directory

The `Templates/` directory contains reusable code templates for generating specific parts of your application.

### Template Organization

```
Templates/
├── API/
│   ├── route.txt            # Route template
│   ├── controller.txt       # Controller template
│   └── middleware.txt       # Middleware template
├── Models/
│   └── model.txt            # Model template
└── Controllers/
    └── controller.txt       # Controller template
```

Templates use placeholder syntax to inject schema information:

- `{{tableName}}` - Table name
- `{{entityName}}` - Entity name
- `{{fields}}` - All fields
- `{{primaryKey}}` - Primary key field

## Projects Directory

The `Projects/` directory contains complete project templates with their structure definitions.

### Project Structure

Each project in `Projects/` has:

```
Projects/
└── Project Name/
    ├── core/                 # Project-specific core files (optional)
    │   ├── package.json
    │   └── config/
    └── structure.yaml        # Project structure definition
```

### structure.yaml

The `structure.yaml` file defines the file and folder structure for a project:

```yaml
$USE_CORE: /Core/vite

src:
  - index.html
  - src/
      - main.ts
      - components/
          - DataTable.tsx
```

### Project Core Directory

Each project can have a local `core/` directory that overrides shared Core templates:

```
Projects/Express React/
├── core/
│   ├── package.json         # Overrides /Core/vite/package.json
│   └── vite.config.js       # Overrides /Core/vite/vite.config.js
└── structure.yaml
```

The local `core/` directory has the highest priority and always overrides shared Core templates.

## File Naming Conventions

### Template Files

Template files typically use `.txt` extension:

- `route.txt`
- `controller.txt`
- `model.txt`

### Configuration Files

Configuration files use standard formats:

- `structure.yaml` - Project structure definition
- `typeMappings.yaml` - Type mapping configuration
- `dbTypes.yaml` - Database types list

## Best Practices

### ✅ DO

- **Organize by purpose**: Group related templates together
- **Use descriptive names**: Make project and template names clear
- **Keep Core generic**: Core templates should be reusable
- **Document structure**: Add README files to explain complex structures
- **Version control**: Use Git to track all changes

### ❌ DON'T

- **Don't duplicate**: Use Core templates instead of copying files
- **Don't hardcode values**: Use placeholders in templates
- **Don't nest too deeply**: Keep structure flat and logical
- **Don't mix concerns**: Separate API templates from model templates

## Repository Setup

### Initial Setup

1. Create a GitHub repository named `scaffolder-files`
2. Clone the repository locally
3. Create the directory structure:
   ```
   mkdir -p Constants Core Templates Projects
   ```
4. Add initial configuration files
5. Commit and push to GitHub

### Connecting to Scaffolder

1. Open Scaffolder in your browser
2. Enter your GitHub repository URL: `https://github.com/username/scaffolder-files`
3. Scaffolder will load your templates and configurations
4. Start generating code from your database schemas

## Example Repository

A complete example repository structure:

```
scaffolder-files/
├── Constants/
│   ├── typeMappings.yaml
│   └── dbTypes.yaml
├── Core/
│   ├── vite/
│   │   ├── .gitignore
│   │   ├── package.json
│   │   └── vite.config.js
│   └── react/
│       ├── .prettierrc
│       └── src/
│           └── App.tsx
├── Templates/
│   ├── API/
│   │   └── route.txt
│   └── Models/
│       └── model.txt
└── Projects/
    └── Express React/
        ├── core/
        │   └── package.json
        └── structure.yaml
```

## Next Steps

- Learn about the [Templating API](/documentation/api-reference/) for advanced features
- See [API Reference](/documentation/api-reference/) for syntax details

