---
title: Schemas Directory
---

# Schemas Directory

The `Schemas/` directory contains database schema definitions stored as JSON objects used by Scaffolder.

## Overview

The Schemas directory stores schema information that defines your database structure as JSON objects. Schemas are created and modified using the SchemaBuilder component in Scaffolder. This information is used to generate code and ensure consistency across generated files.

## Directory Structure

```
Schemas/
└── masterSchema.json
```

## Schema Files

### masterSchema.json

The master schema file contains JSON objects that define your database schema. It provides:

- Table definitions
- Column types
- Relationship definitions
- Database structure representation
- Seed data (YAML format)

## Creating and Modifying Schemas

Schemas are created and modified using the SchemaBuilder component:

- **Create Tables**: Add new database tables with custom names
- **Add Columns**: Define columns with data types, constraints, and relationships
- **Define Relationships**: Set up one-to-one, one-to-many, and many-to-many relationships
- **Modify Existing Schemas**: Edit table names, column properties, and relationships
- **Seed Data**: Add sample data in YAML format for testing

### Future Features

- **Import Schemas**: Import existing database schemas (coming soon)

## Purpose

Schemas serve multiple purposes:

1. **Code Generation** - Informs Scaffolder about database structure
2. **Validation** - Ensures generated code matches database schema
3. **Documentation** - Serves as documentation of database structure
4. **Consistency** - Maintains consistent structure across generated files

## Integration with Constants

Schemas work with configuration files in `Constants/`:

- **`typeMappings.yaml`** - Maps database types to application types
- **`dbTypes.yaml`** - Lists supported database systems
- **Schemas** - Define the actual database structure

## Schema Format

Schemas are JSON objects with the following structure:

```json
{
  "tableName": [
    {
      "name": "columnName",
      "type": "columnType",
      "nullable": true,
      "primaryKey": false
    }
  ]
}
```

## Usage

Schemas are used during code generation:

1. **Create or Load Schema**: Use SchemaBuilder to create a new schema or modify an existing one
2. **Schema Processing**: Scaffolder processes schema JSON objects
3. **Type Mapping**: Applies type mappings from Constants
4. **Code Generation**: Generates code using templates
5. **Validation**: Ensures consistency across all generated files

### Current Workflow

1. Open SchemaBuilder in Scaffolder
2. Create tables and define columns
3. Set up relationships between tables
4. Add seed data (optional)
5. Use the schema for code generation

## Best Practices

### ✅ DO

- **Use SchemaBuilder**: Create and modify schemas through the SchemaBuilder interface
- **Keep schemas up to date**: Update schemas when database changes
- **Use valid JSON**: Ensure schemas are valid JSON objects
- **Document relationships**: Make entity relationships clear in schemas
- **Version control**: Track schema changes in Git
- **Follow structure**: Maintain consistent JSON structure across schemas
- **Add seed data**: Include sample data for testing and development

### ❌ DON'T

- **Don't manually edit**: Use SchemaBuilder interface instead of manually editing JSON
- **Don't hardcode values**: Use schema definitions instead
- **Don't duplicate information**: Keep single source of truth
- **Don't use TypeScript**: Schemas should be JSON objects, not TypeScript
- **Don't mix concerns**: Keep schema definitions separate from templates

## SchemaBuilder Features

The SchemaBuilder component provides:

- **Visual Table Management**: Create, rename, and delete tables
- **Column Editor**: Add columns with inline editing capabilities
- **Relationship Builder**: Define relationships between tables visually
- **Data Type Selector**: Choose from configured data types
- **Seed Data Editor**: Add sample data in YAML format
- **Table Categories**: Organize tables (Main, Standalone, Pivot)
- **Search and Filter**: Find tables and columns quickly

## Next Steps

- Learn about [Constants](/documentation/structure/repository-folders/constants/) for type mappings
- See [Templates](/documentation/structure/repository-folders/templates/) for code generation
- Review [Projects](/documentation/structure/repository-folders/projects/) for using schemas in projects

