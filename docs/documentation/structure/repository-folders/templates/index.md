---
title: Templates Directory
---

# Templates Directory

The `Templates/` directory contains reusable code templates organized by framework and layer (backend/frontend).

## Overview

Templates are text files that define code patterns for generating application code. They use placeholder syntax to inject schema information during code generation.

## Directory Structure

```
Templates/
├── backend/
│   ├── laravel/
│   │   ├── api.txt
│   │   ├── Controller.txt
│   │   ├── Model.txt
│   │   ├── Repository.txt
│   │   └── Service.txt
│   └── nextjs/
│       ├── app/
│       │   └── {{table}}/
│       │       ├── route.txt
│       │       ├── GET.txt
│       │       └── POST.txt
│       └── Controllers/
│           └── EntityController.txt
├── frontend/
│   ├── nextjs/
│   │   ├── hooks/
│   │   │   ├── {{table}}/
│   │   │   │   ├── useCreateEntity.txt
│   │   │   │   └── useUpdateEntity.txt
│   │   │   └── shared/
│   │   │       ├── useCreate.txt
│   │   │       └── useUpdate.txt
│   │   └── vendor/
│   │       └── axiosInstance.txt
│   └── react/
│       └── components/
│           ├── DataTable.txt
│           └── EntityComponent.txt
├── advanced-conditions.txt
├── boolean-condition.txt
├── features.txt
├── sql-schema.txt
└── template.txt
```

## Organization

### Backend Templates

Backend templates are organized by framework:

- **`backend/laravel/`** - Laravel-specific templates (Controllers, Models, Repositories, Services)
- **`backend/nextjs/`** - Next.js API route templates

### Frontend Templates

Frontend templates are organized by framework:

- **`frontend/nextjs/`** - Next.js React hooks and components
- **`frontend/react/`** - React component templates

### Shared Templates

Root-level templates provide common patterns:

- **`advanced-conditions.txt`** - Complex conditional logic templates
- **`boolean-condition.txt`** - Boolean condition handling
- **`features.txt`** - Feature flag templates
- **`sql-schema.txt`** - SQL schema generation templates
- **`template.txt`** - Base template patterns

## Template Syntax

Templates use placeholder syntax to inject dynamic content:

### Common Placeholders

- `{{tableName}}` - Table name (e.g., `users`)
- `{{tableName.plural}}` - Plural table name (e.g., `users`)
- `{{tableName.singular}}` - Singular table name (e.g., `user`)
- `{{tableName.pascalCase}}` - PascalCase table name (e.g., `User`)
- `{{tableName.kebabCase}}` - Kebab-case table name (e.g., `user-profile`)
- `{{entityName}}` - Entity name derived from table
- `{{fields}}` - All fields from schema
- `{{primaryKey}}` - Primary key field
- `{{methodName}}` - Method name (in method templates)

### Example Template

```txt
export class {{tableName.pascalCase}}Controller {
  public function index() {
    return $this->service->findAll();
  }

  public function store(Request $request) {
    $item = $this->service->create($request->all());
    return response()->json($item, 201);
  }
}
```

## Template Categories

### Framework-Specific Templates

Templates are organized by framework to support different tech stacks:

- **Laravel**: Full MVC pattern with Controllers, Models, Repositories, Services
- **Next.js**: API routes and React hooks
- **React**: Component templates

### Layer-Specific Templates

Templates are separated by application layer:

- **Backend**: API endpoints, business logic, data access
- **Frontend**: UI components, hooks, services

## Usage in Projects

Templates are referenced in project `structure.yaml` files:

```yaml
src:
  - app/
      - Controllers/
          - {{tableName.pascalCase}}Controller.php: IMPORT_TEMPLATE(Templates/backend/laravel/Controller.txt)
```

## Best Practices

### ✅ DO

- **Organize by framework**: Keep framework-specific templates in separate directories
- **Use descriptive names**: Make template purpose clear from filename
- **Keep templates generic**: Use placeholders instead of hardcoded values
- **Group related templates**: Keep related templates in the same directory
- **Document complex templates**: Add comments in templates for clarity

### ❌ DON'T

- **Don't hardcode values**: Always use placeholders for dynamic content
- **Don't mix frameworks**: Keep Laravel templates separate from Next.js templates
- **Don't duplicate**: Reuse templates across projects instead of copying
- **Don't nest too deeply**: Keep directory structure flat and logical

## Template File Format

Templates are plain text files (`.txt` extension) that contain:

1. **Code structure** - The skeleton of the generated code
2. **Placeholders** - Dynamic values injected during generation
3. **Comments** - Optional documentation within templates

## Integration with Base Methods

Templates work alongside base methods:

- **BaseMethods** define method signatures and logic
- **Templates** define file structure and code organization
- Together they generate complete application code

## Next Steps

- Learn about [Base Methods](/documentation/structure/repository-folders/base-methods/) for method definitions
- See [Projects](/documentation/structure/repository-folders/projects/) for using templates in projects
- Review [API Reference](/documentation/api-reference/) for template import syntax

