---
title: Features
---

# Features

Scaffolder enables teams to generate production-ready APIs from database schemas using reusable, version-controlled templates.

## API Templating

### Database Schema to API Generation

Transform your database schema into complete, production-ready APIs:

- **RESTful API Generation**: Generate REST endpoints for all entities
- **CRUD Operations**: Automatically create, read, update, and delete endpoints
- **Type-Safe APIs**: Generate TypeScript interfaces and type definitions
- **Database Integration**: Connect your generated APIs directly to your database
- **Middleware Support**: Include authentication, validation, and error handling

### Template Customization

Customize API templates to match your team's standards:

- **Endpoint Patterns**: Define how endpoints are structured (REST, GraphQL, etc.)
- **Response Formats**: Configure API response structures
- **Error Handling**: Set up consistent error handling patterns
- **Authentication**: Include authentication middleware and patterns
- **Validation**: Add input validation logic to all endpoints

### Multi-Database Support

Generate APIs that work with your database:

- **PostgreSQL**: Full support for PostgreSQL types and features
- **MySQL**: MySQL-specific type mappings and optimizations
- **SQLite**: Lightweight database support for development
- **MSSQL**: Microsoft SQL Server integration
- **Custom Types**: Define custom database types and mappings

## Template System

### Reusable API Templates

Build API templates once, use them across all projects:

- **Template Repository**: Store API templates in version-controlled repositories
- **Template Library**: Share templates across teams and projects
- **Template Evolution**: Improve templates over time with team feedback
- **Pattern Consistency**: Ensure all APIs follow the same patterns

### Configuration-Driven Generation

Configure how APIs are generated:

- **Type Mappings**: Define how database types map to API types
- **Naming Conventions**: Set up naming patterns for routes, controllers, models
- **Code Style**: Enforce consistent code formatting and structure
- **Framework Support**: Templates for Express, Fastify, NestJS, and more

## Schema Management

Enterprise-grade schema version control and management:

- **Multiple Schemas**: Create, save, and manage multiple database schemas
- **Version Control**: All schemas are automatically version controlled in Git
- **Schema Operations**: Save, load, duplicate, and delete schemas through the GUI
- **Dirty State Tracking**: Visual indicators for unsaved changes
- **Git Integration**: Automatic commits with smart commit messages (coming soon)
- **Schema History**: View and revert to previous schema versions (coming soon)

See [Schema Management](/features/schema-management/) for complete documentation.

## GitHub Integration

Store and manage your API templates in GitHub:

- **Repository-Based**: All templates live in your `scaffolder-files` repository
- **Version Control**: Track template changes with Git
- **Team Collaboration**: Multiple developers can contribute to templates
- **Pull Request Reviews**: Review template changes before using them
- **Branching**: Test new templates without affecting production

## Key Benefits

### Consistent API Structure

All generated APIs follow the same patterns and conventions, ensuring consistency across your entire application.

### Rapid Development

Generate complete API backends in minutes instead of days or weeks. Focus on business logic instead of boilerplate code.

### Type Safety

Automatically generate TypeScript types that match your database schema, ensuring type safety throughout your application.

### Maintainable Code

Generated code follows your team's established patterns, making it easy to understand and maintain.

### Zero Ongoing Costs

Once templates are created, generating APIs is completely free. No recurring fees or API costs.

## Workflow

1. **Define Your Schema**: Upload or paste your database schema
2. **Select Templates**: Choose API templates from your repository
3. **Configure Mappings**: Customize type mappings and naming conventions
4. **Generate APIs**: Scaffolder generates complete API code
5. **Customize**: Add business logic to the generated code
6. **Deploy**: Your APIs are ready for production

