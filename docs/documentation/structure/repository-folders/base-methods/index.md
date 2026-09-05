---
title: Base Methods Directory
---

# Base Methods Directory

The `BaseMethods/` and `BaseMethodsFileBased/` directories contain reusable method definitions for generating repository pattern code.

## Overview

Base methods define common operations (CRUD, queries, advanced operations) that can be generated for any entity. They provide the building blocks for creating complete API endpoints.

## Directory Structure

```
BaseMethods/
└── laravel/
    ├── crud/
    │   └── create.yaml
    └── advanced-operations/
        └── chunk.yaml

BaseMethodsFileBased/
├── crud/
│   ├── create/
│   │   ├── description.txt
│   │   ├── methodName.txt
│   │   ├── route.txt
│   │   ├── controllerMethod.txt
│   │   ├── controllerContent.txt
│   │   ├── repositoryMethod.txt
│   │   ├── repositoryContent.txt
│   │   ├── serviceMethod.txt
│   │   ├── serviceContent.txt
│   │   └── index.ts
│   └── index.ts
├── query-and-search/
│   ├── findMany/
│   ├── search/
│   └── paginate/
├── advanced-operations/
│   ├── chunk/
│   ├── whereIn/
│   └── pluck/
└── index.ts
```

## Two Formats

### YAML Format (`BaseMethods/`)

Newer YAML-based format that defines methods in a single file:

```yaml
methodName: create
route: Route::post('{{tableName.plural.kebabCase}}', [{{tableName.pascalCase}}Controller::class, 'store'])
description: Create a new record
repositoryMethod: '{{methodName}}(array $data): Model'
repositoryContent: return $this->model->{{methodName}}(array $data);
serviceMethod: '{{methodName}}(array $data)'
serviceContent: |
  return $this->repository->{{methodName}}(array $data);
controllerMethod: store(Request $request)
controllerContent: |
  $item = $this->service->{{methodName}}($request->all());
  return response()->json($item, 201);
```

### File-Based Format (`BaseMethodsFileBased/`)

File-based format where each method has multiple template files:

```
create/
├── description.txt          # Method description
├── methodName.txt          # Method name
├── route.txt               # Route definition
├── controllerMethod.txt    # Controller method signature
├── controllerContent.txt   # Controller method body
├── repositoryMethod.txt    # Repository method signature
├── repositoryContent.txt   # Repository method body
├── serviceMethod.txt       # Service method signature
├── serviceContent.txt      # Service method body
└── index.ts               # TypeScript index file
```

## Method Categories

### CRUD Operations

Basic Create, Read, Update, Delete operations:

- **create** - Create new records
- **findById** - Find record by ID
- **index** - List all records
- **update** - Update existing records
- **destroy** - Delete records

### Query and Search

Data retrieval and filtering:

- **findMany** - Find multiple records
- **search** - Full-text search
- **paginate** - Paginated results
- **findByAttributes** - Find by attribute matching
- **count** - Count records
- **exists** - Check existence

### Advanced Operations

Complex query operations:

- **chunk** - Process records in chunks
- **whereIn** - Filter by array of values
- **whereNotIn** - Exclude array of values
- **whereBetween** - Range queries
- **pluck** - Extract specific columns
- **getWithRelations** - Eager load relationships

### Retrieval and Sorting

Data retrieval with ordering:

- **findOrFail** - Find or throw exception
- **orderBy** - Sort results
- **latest** - Get most recent records
- **oldest** - Get oldest records
- **random** - Random selection
- **groupBy** - Group results

### Bulk Operations

Batch processing:

- **batchCreate** - Create multiple records
- **batchUpdate** - Update multiple records
- **updateOrCreate** - Update or create if missing

### Soft Deletes and Restoration

Soft delete functionality:

- **softDelete** - Mark as deleted
- **restore** - Restore deleted records
- **withTrashed** - Include deleted records
- **withoutTrashed** - Exclude deleted records
- **onlyTrashed** - Only deleted records

## Method Structure

Each method provides templates for:

1. **Route** - HTTP route definition
2. **Controller** - Controller method signature and body
3. **Service** - Service layer method
4. **Repository** - Repository method for data access
5. **Description** - Human-readable method description

## Framework Support

Methods are organized by framework:

- **`laravel/`** - Laravel-specific method definitions
- Framework-specific implementations can be added as needed

## Integration with Templates

Base methods work with templates:

- **Base Methods** define the method logic
- **Templates** define the file structure
- Together they generate complete code

## Usage

Methods are automatically available when generating code. Scaffolder:

1. Reads method definitions from `BaseMethods/` or `BaseMethodsFileBased/`
2. Applies them to each entity in your schema
3. Generates complete API endpoints using templates

## Best Practices

### ✅ DO

- **Keep methods generic**: Methods should work for any entity
- **Use placeholders**: Use `{{tableName}}`, `{{methodName}}` etc.
- **Organize by category**: Group related methods together
- **Document methods**: Include clear descriptions
- **Follow patterns**: Maintain consistent structure across methods

### ❌ DON'T

- **Don't hardcode entity names**: Always use placeholders
- **Don't mix frameworks**: Keep framework-specific methods separate
- **Don't duplicate logic**: Reuse common patterns
- **Don't create entity-specific methods**: Use [Domain Methods](/documentation/structure/repository-folders/domain-methods/) instead

## Next Steps

- Learn about [Domain Methods](/documentation/structure/repository-folders/domain-methods/) for entity-specific operations
- See [Enterprise Methods](/documentation/structure/repository-folders/enterprise-methods/) for advanced features
- Review [Templates](/documentation/structure/repository-folders/templates/) for code structure

