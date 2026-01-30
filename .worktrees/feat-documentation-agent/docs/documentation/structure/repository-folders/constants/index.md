---
title: Constants Directory
---

# Constants Directory

The `Constants/` directory contains configuration files that define how Scaffolder processes database schemas and generates code.

## Overview

Constants provide essential configuration for type mappings, database support, and code generation behavior. These files control how Scaffolder translates database types into application types.

## Directory Structure

```
Constants/
├── typeMappings.yaml      # Database type to application type mappings
├── dbTypes.yaml           # Supported database systems
├── fillableExemptions.yaml # Fields to exclude from fillable arrays
└── hiddenColumns.yaml     # Columns to hide from API responses
```

## Configuration Files

### typeMappings.yaml

Maps database types to application types for each supported database system.

**Structure:**
```yaml
string:
  info:
    group: 'Common Types'
  mysql: 'VARCHAR (32)'
  postgresql: 'TEXT'
  typescript: 'string'
  postgresql-introspected:
    - 'text'
    - 'character varying'
    - 'varchar'
  mysql-introspected:
    - 'text'
    - 'varchar'
    - 'char'
```

**Purpose:**
- Defines how database column types map to application types
- Supports multiple database systems (PostgreSQL, MySQL, SQLite, MSSQL)
- Includes introspected type variations for schema reading
- Maps to TypeScript types for frontend generation

### dbTypes.yaml

Lists all supported database systems that Scaffolder can work with.

**Purpose:**
- Defines supported database systems
- Used for validation and configuration
- Enables database-specific code generation

### fillableExemptions.yaml

Defines fields that should be excluded from fillable/mass-assignment arrays.

**Purpose:**
- Prevents sensitive fields from mass assignment
- Security best practice (e.g., exclude `id`, `created_at`)
- Framework-specific (e.g., Laravel fillable arrays)

### hiddenColumns.yaml

Specifies columns that should be hidden from API responses.

**Purpose:**
- Excludes sensitive data from API responses
- Maintains data privacy
- Framework-specific (e.g., Laravel hidden attributes)

## Usage

Constants are automatically loaded by Scaffolder:

1. Scaffolder reads configuration files from `Constants/`
2. Applies type mappings during schema processing
3. Uses configurations during code generation
4. Ensures consistent type handling across all generated code

## Integration with Schemas

Constants work with schema definitions:

- **Schemas** define the database structure
- **Constants** define how to process that structure
- Together they generate type-safe, consistent code

## Type Mapping Flow

1. Database schema is read
2. Column types are identified
3. `typeMappings.yaml` maps database types to application types
4. Code is generated using mapped types
5. TypeScript types are created for frontend code

## Best Practices

### ✅ DO

- **Keep mappings up to date**: Update when database systems change
- **Support all introspected types**: Include variations from schema introspection
- **Document custom mappings**: Add comments for non-standard mappings
- **Version control**: Track all constant changes in Git

### ❌ DON'T

- **Don't hardcode values**: Use constants instead of inline values
- **Don't duplicate mappings**: Keep single source of truth
- **Don't ignore security**: Use fillableExemptions and hiddenColumns for security
- **Don't mix concerns**: Keep type mappings separate from templates

## Database System Support

Supported database systems (defined in `dbTypes.yaml`):

- PostgreSQL
- MySQL
- SQLite
- MSSQL

Each system can have its own type mappings in `typeMappings.yaml`.

## Next Steps

- Learn about [Schemas](/documentation/structure/repository-folders/schemas/) for database structure
- See [Templates](/documentation/structure/repository-folders/templates/) for code generation
- Review [API Reference](/documentation/api-reference/) for syntax details

