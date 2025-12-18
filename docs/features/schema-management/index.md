---
title: Schema Management
---

# Schema Management

Enterprise-grade schema version control and management system that enables teams to create, save, load, duplicate, and revert database schemas with full Git integration.

## Overview

The Schema Management feature provides a complete workflow for managing database schemas as version-controlled JSON files. Schemas are stored in your repository's `Schemas/` directory and can be managed entirely through the GUI, eliminating the need for manual Git operations.

## Key Features

### Schema Version Control

- **Save Schemas**: Save schemas to your repository (local files or GitHub)
- **Load Schemas**: Load any schema from your repository
- **Duplicate Schemas**: Create copies of existing schemas with automatic naming
- **Delete Schemas**: Remove schemas with confirmation dialogs
- **Master Schema**: Default schema that serves as the starting point

### Git Integration

- **Automatic Commits**: Schema changes are automatically committed to Git
- **Version History**: Full commit history for all schema changes
- **Revert Capability**: Revert schemas to any previous version (coming soon)
- **Commit Messages**: Auto-generated commit messages based on schema changes (coming soon)

### Smart Workflow

- **Dirty State Tracking**: Visual indicators when schemas have unsaved changes
- **Unsaved Changes Warning**: Prompts before switching schemas with unsaved changes
- **Auto-refresh**: Automatically refreshes schema list after save/delete operations
- **Error Handling**: Clear error messages for failed operations

## How It Works

### Schema Storage

Schemas are stored as JSON files in the `Schemas/` directory of your repository:

```
Schemas/
├── Master Schema.json
├── E-commerce Schema.json
├── User Auth Schema.json
└── ...
```

### Development vs Production

The system automatically detects the environment:

- **Development Mode**: Schemas are saved to `src/files/Schemas/` locally
- **Production Mode**: Schemas are saved to your GitHub repository's `Schemas/` directory

### Schema Lifecycle

1. **Create**: Start with the master schema or create a new empty schema
2. **Edit**: Modify tables, columns, and relationships using SchemaBuilder
3. **Save**: Save changes to repository (local or GitHub)
4. **Load**: Switch between different schemas
5. **Duplicate**: Create variations of existing schemas
6. **Delete**: Remove schemas you no longer need

## Using Schema Management

### Schema Selector

The Schema Selector appears at the top of the SchemaBuilder interface and provides:

- **Dropdown**: Select from available schemas or use the master schema
- **Save Button**: Save current schema (enabled when there are unsaved changes)
- **New Button**: Create a new empty schema
- **Duplicate Button**: Create a copy of the current schema
- **Delete Button**: Remove the current schema (disabled for master schema)

### Saving Schemas

1. Make changes to your schema in SchemaBuilder
2. Click the **Save** button (becomes enabled when changes are detected)
3. If it's a new schema, you'll be prompted for a name
4. The schema is saved to your repository
5. The save button becomes disabled once saved

### Creating New Schemas

1. Click the **New** button
2. Enter a schema name when prompted
3. An empty schema is created and selected
4. Start adding tables and columns

### Duplicating Schemas

1. Select the schema you want to duplicate
2. Click the **Duplicate** button
3. A copy is created with the name format: `Original Schema - Copy`
4. If a copy already exists, it will be numbered: `Original Schema - Copy (2)`

### Deleting Schemas

1. Select the schema you want to delete
2. Click the **Delete** button
3. Confirm the deletion in the dialog
4. The schema is removed from your repository
5. You'll be switched back to the master schema

## Schema States

### Master Schema

The master schema is the default schema that cannot be deleted. It serves as:

- Starting point for new projects
- Fallback when other schemas are deleted
- Reference schema for comparison

### Selected Schema

The currently active schema being edited. Changes are tracked against the original version to detect unsaved changes.

### Dirty State

A schema is considered "dirty" when it has unsaved changes. The system:

- Shows "(unsaved changes)" indicator
- Enables the Save button
- Warns before switching to another schema
- Warns before creating a new schema

## Best Practices

### ✅ DO

- **Save Frequently**: Save your work regularly to preserve changes
- **Use Descriptive Names**: Name schemas clearly (e.g., "E-commerce Schema", "User Auth Schema")
- **Version Control**: All schemas are automatically version controlled in Git
- **Test Before Saving**: Verify your schema changes before saving
- **Use Duplicate for Variations**: Create schema variations using duplicate instead of manual copying

### ❌ DON'T

- **Don't Delete Master Schema**: The master schema cannot and should not be deleted
- **Don't Ignore Warnings**: Pay attention to unsaved changes warnings
- **Don't Use Generic Names**: Avoid names like "Schema 1", "Test", etc.
- **Don't Skip Confirmation**: Always review deletion confirmations carefully

## Error Handling

The system provides clear error messages for:

- **Save Failures**: Network errors, authentication issues, or file system problems
- **Delete Failures**: Permission issues or file not found errors
- **Load Failures**: Invalid schema JSON or missing files

All errors are displayed in the Schema Selector interface with actionable messages.

## Integration with SchemaBuilder

Schema Management is fully integrated with SchemaBuilder:

- **Seamless Workflow**: Switch between schemas without losing your place
- **Automatic Updates**: Schema list updates automatically after operations
- **State Preservation**: Your editing state is preserved when switching schemas
- **Change Detection**: System tracks all changes for dirty state detection

## Future Features

The following features are planned for future releases:

- **Schema History Viewer**: Browse commit history for schema files
- **Schema Version Revert**: Revert schemas to previous versions using Git revert
- **Smart Commit Messages**: Auto-generate commit messages from schema builder actions
- **Dedicated Schema Repository**: Support for separate repositories for schemas

## Schema Formats

The application supports two schema formats:

- **Full Format (`ISchemaInfo[]`)** - Complete, explicit schema representation
- **Compressed Format (`ISchemaInfoSlim`)** - Minimal, payload-optimized representation

**Quick Guide:**
- ✅ **Store locally** (localStorage, files): Use **Full Format**
- ✅ **Send over network** (API, WebSocket): Use **Compressed Format**
- ✅ **Use internally** (Zustand stores, components): Use **Full Format**

The application automatically handles format conversion when needed. See the [Schema Formats Guide](/documentation/api-reference/schema-management/schema-formats/) for detailed information.

## Related Documentation

- [Schema Formats Guide](/documentation/api-reference/schema-management/schema-formats/) - **When to use full vs compressed format**
- [Schema Management API](/documentation/api-reference/schema-management/) - Technical API reference
- [Schemas Directory](/documentation/structure/repository-folders/schemas/) - Learn about schema file organization
- [SchemaBuilder Features](/documentation/structure/repository-folders/schemas/) - Detailed SchemaBuilder capabilities
- [Projects](/documentation/structure/repository-folders/projects/) - Using schemas in project generation

