# Scaffolder Documentation

Welcome to the Scaffolder documentation. This site contains comprehensive documentation for the Scaffolder application architecture, design decisions, and development guidelines.

## What is Scaffolder?

Scaffolder is a dynamic code generation tool that enables developers to generate code from database schemas and configurations. It uses a flexible, configuration-driven approach where type mappings and database types are loaded from YAML files, allowing teams to customize and extend functionality without code changes.

## Quick Links

### 🚀 Getting Started

**[Introduction](./INTRODUCTION)**

Start here to learn about Scaffolder and get up and running quickly.

### 📚 Architecture & Design

**[Business Value: Dynamic Configuration System](./BUSINESS_VALUE)**

Explains the business value and developer experience benefits of the dynamic YAML configuration system. Learn about:

- Architecture overview and file structure
- Business value propositions
- Developer experience improvements
- Real-world use cases
- Best practices for configuration management

### 🔧 Technical Documentation

**[Transformation Dependencies](./TRANSFORMATION_DEPENDENCIES)**

Technical documentation on how transformations depend on asynchronously loaded configuration files. Covers:

- Dependency rules and requirements
- Implementation details
- Testing guidelines
- Loading sequence
- Best practices for working with transformations

## Key Features

- **Dynamic Configuration**: Load type mappings and database types from YAML files
- **GitHub Integration**: Fetch configurations from `scaffolder-files` repositories
- **Multi-Database Support**: Extensible database type system (PostgreSQL, MySQL, SQLite, MSSQL, etc.)
- **Version Controlled**: All configurations tracked in Git
- **Team Customization**: Each team can maintain their own configuration repository

## Getting Started

1. Set up your `scaffolder-files` GitHub repository
2. Configure your `typeMappings.yaml` and `dbTypes.yaml` files
3. Connect Scaffolder to your repository
4. Start generating code!

For detailed information, see the [Business Value](./BUSINESS_VALUE) documentation.

## Related Documentation

Additional documentation files in the repository:

- `README.md` - Project overview and setup instructions
- `CORE_IMPORTS.md` - Core imports documentation
- `NEW_ESLINT_CONFIG.md` - ESLint configuration guide

