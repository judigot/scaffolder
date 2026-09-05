---
title: Domain Methods Directory
---

# Domain Methods Directory

The `DomainMethods/` directory contains domain-specific method templates for handling entity relationships and business logic.

## Overview

Domain methods provide entity-specific operations that go beyond generic CRUD. They handle relationships, business rules, and domain-specific queries that are unique to your application's domain.

## Directory Structure

```
DomainMethods/
├── hasOne/
│   └── laravel/
│       └── route.txt
├── hasMany/
│   └── laravel/
│       └── route.txt
├── getAllWithRelated/
│   └── laravel/
│       └── route.txt
└── laravel/
    ├── controller.txt
    ├── interface.txt
    ├── model.txt
    ├── repository.txt
    └── service.txt
```

## Purpose

Domain methods differ from base methods:

- **Base Methods**: Generic operations that work for any entity (CRUD, queries)
- **Domain Methods**: Entity-specific operations tied to business logic and relationships

## Common Domain Methods

### Relationship Methods

Methods for handling entity relationships:

- **`hasOne/`** - One-to-one relationship methods
- **`hasMany/`** - One-to-many relationship methods
- **`getAllWithRelated/`** - Fetch entities with related data

### Framework-Specific Templates

Framework-specific domain method templates:

- **`laravel/`** - Laravel domain method templates (controller, repository, service, model, interface)

## Relationship Handling

Domain methods handle entity relationships:

### HasOne Relationship

```txt
Route::get('{{tableName.plural}}/{id}/{{value.singular}}', [{{tableName.singular.pascalCase}}Controller::class, 'get{{value.singular.pascalCase}}'])
```

### HasMany Relationship

```txt
Route::get('{{tableName.plural}}/{id}/{{value.plural}}', [{{tableName.singular.pascalCase}}Controller::class, 'get{{value.plural.pascalCase}}'])
```

## Usage

Domain methods are used when you need:

- **Relationship queries** - Fetch related entities
- **Business logic** - Domain-specific operations
- **Custom operations** - Operations unique to specific entities

## Integration with Base Methods

Domain methods complement base methods:

- **Base Methods** provide generic CRUD and queries
- **Domain Methods** add entity-specific operations
- Together they provide complete API functionality

## Framework Support

Currently supports:

- **Laravel** - Full MVC pattern with relationship handling

## Best Practices

### ✅ DO

- **Use for relationships**: Create domain methods for entity relationships
- **Keep domain-specific**: Only create methods unique to your domain
- **Follow naming conventions**: Use clear, descriptive method names
- **Document relationships**: Make relationship structure clear

### ❌ DON'T

- **Don't duplicate base methods**: Use base methods for generic operations
- **Don't create generic methods**: Use base methods instead
- **Don't hardcode entity names**: Use placeholders for flexibility
- **Don't mix concerns**: Keep relationship logic separate from CRUD

## When to Use Domain Methods

Use domain methods when:

- ✅ You need to handle entity relationships
- ✅ You have business logic specific to certain entities
- ✅ You need custom queries that don't fit base method patterns
- ✅ You're implementing domain-driven design patterns

Use base methods when:

- ✅ You need generic CRUD operations
- ✅ You need standard query operations
- ✅ The operation applies to all entities

## Next Steps

- Learn about [Base Methods](/documentation/structure/repository-folders/base-methods/) for generic operations
- See [Enterprise Methods](/documentation/structure/repository-folders/enterprise-methods/) for advanced features
- Review [Templates](/documentation/structure/repository-folders/templates/) for code structure

