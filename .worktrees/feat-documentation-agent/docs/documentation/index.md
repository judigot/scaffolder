---
title: Documentation
---

# Documentation

Learn how to use Scaffolder to generate APIs from database schemas using reusable templates.

## Documentation Sections

### Repository Structure

Learn about organizing your `scaffolder-files` repository, directory structure, and project organization.

[View Repository Structure →](/documentation/structure/)

### API Reference

Complete API reference for Scaffolder's templating syntax and configuration options.

[View API Reference →](/documentation/api-reference/)

## Getting Started

### Quick Start

1. **Create a Template Repository**: Set up a GitHub repository called `scaffolder-files`
2. **Add API Templates**: Store your API templates in the repository
3. **Connect to Scaffolder**: Link your repository in Scaffolder
4. **Generate APIs**: Upload your schema and generate APIs instantly

### Template Repository Structure

Your `scaffolder-files` repository should follow this structure:

```
scaffolder-files/
├── Constants/
│   ├── typeMappings.yaml    # Database type mappings
│   └── dbTypes.yaml          # Supported database types
├── Templates/
│   ├── API/                  # API endpoint templates
│   ├── Models/               # Model templates
│   └── Controllers/          # Controller templates
└── Projects/                 # Complete project templates
```

## API Template Guide

### Creating API Templates

API templates define how Scaffolder generates endpoints from your database schema. Templates use a simple templating syntax to generate code.

#### Basic Template Structure

Templates are organized by entity type and operation:

- **GET endpoints**: Retrieve data
- **POST endpoints**: Create new records
- **PUT/PATCH endpoints**: Update existing records
- **DELETE endpoints**: Remove records

#### Template Variables

Use variables in templates to reference schema information:

- `{{entityName}}`: The name of the entity
- `{{fields}}`: All fields in the entity
- `{{primaryKey}}`: The primary key field
- `{{tableName}}`: The database table name

### Type Mappings

Configure how database types map to your API types in `typeMappings.yaml`:

```yaml
postgresql:
  string: string
  integer: number
  boolean: boolean
  timestamp: Date
```

### Database Types

Define supported database types in `dbTypes.yaml`:

```yaml
- postgresql
- mysql
- sqlite
- mssql
```

## API Generation

### From Schema to API

Scaffolder follows this process:

1. **Parse Schema**: Analyzes your SQL schema
2. **Extract Entities**: Identifies tables and relationships
3. **Apply Templates**: Uses your templates to generate code
4. **Type Mapping**: Applies type mappings from configuration
5. **Generate Code**: Creates complete API code

### Generated API Structure

Scaffolder generates:

- **Models**: Type definitions matching your schema
- **Controllers**: Request handlers for each endpoint
- **Routes**: API route definitions
- **Middleware**: Authentication and validation setup
- **Type Guards**: Runtime type checking utilities

## Template Examples

### REST API Template

Generate RESTful APIs with standard HTTP methods:

- `GET /api/entities` - List all entities
- `GET /api/entities/:id` - Get single entity
- `POST /api/entities` - Create new entity
- `PUT /api/entities/:id` - Update entity
- `DELETE /api/entities/:id` - Delete entity

### Custom Endpoints

Create custom endpoints beyond CRUD:

- Search endpoints
- Filter endpoints
- Relationship endpoints
- Bulk operations

## Configuration

### Type Mapping Configuration

Customize how database types are converted:

```yaml
postgresql:
  varchar: string
  text: string
  integer: number
  bigint: number
  boolean: boolean
  timestamp: Date
  uuid: string
```

### Naming Conventions

Configure naming patterns:

- Route naming: camelCase, kebab-case, snake_case
- Controller naming: PascalCase
- Model naming: PascalCase

## Best Practices

### Template Design

- **Keep Templates Simple**: Templates should be easy to understand and modify
- **Follow Patterns**: Use consistent patterns across all templates
- **Document Templates**: Add comments explaining template logic
- **Test Templates**: Validate templates generate correct code

### Repository Management

- **Version Control**: Use Git to track template changes
- **Review Changes**: Use pull requests to review template updates
- **Tag Releases**: Tag stable template versions
- **Document Updates**: Document breaking changes in templates

### Team Collaboration

- **Central Repository**: Use one repository per team or organization
- **Code Review**: Require reviews for template changes
- **Template Library**: Share useful templates across teams
- **Documentation**: Document template usage and examples

