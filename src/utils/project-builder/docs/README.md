# Project Builder Documentation

This directory contains documentation for the project builder system, including project actions, template commands, usage guides, and business information.

## Available Documentation

### Technical Documentation

#### Project Actions

- **[LOOP_FOLDERS.md](./LOOP_FOLDERS.md)** - Generate multiple files by iterating over folders matching a glob pattern
- **[CORE_FILES_GUIDE.md](../CORE_FILES_GUIDE.md)** - Guide for using core files in projects

#### Architecture

- **[CONTEXT_PATTERN.md](./CONTEXT_PATTERN.md)** - Build context object pattern for managing shared state

#### Performance

- **[PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md)** - Performance optimizations and early return strategies

#### Template Commands

- **[USE_DATA.md](./USE_DATA.md)** - Access data from external YAML files in templates
- **[USE_USER_ENV.md](./USE_USER_ENV.md)** - Access user environment variables from Auth0 metadata
- **[USE_ROWS.md](./USE_ROWS.md)** - Generate database row data (seed + mock) in SQL, CSV, or JSON formats
- **[PLACEHOLDER_FUNCTIONS.md](./PLACEHOLDER_FUNCTIONS.md)** - Built-in placeholder functions (`index()` and `timestamp()`) for dynamic filename generation

### Business Documentation

- **[BUSINESS_VALUE.md](./BUSINESS_VALUE.md)** - Comprehensive business value proposition, ROI analysis, and market positioning
- **[SELLING_POINTS.md](./SELLING_POINTS.md)** - Marketing messages, competitive advantages, and target audience positioning

## Quick Reference

### Project Actions

| Action | Description | Example |
|--------|-------------|---------|
| `CREATE_FILE` | Create a single file from a template | `CREATE_FILE(app.ts --template=./templates/app.txt)` |
| `CREATE_BASE_METHOD_FILE` | Create base method files | `CREATE_BASE_METHOD_FILE(useHook.ts --template=/BaseMethods/.../hook.txt)` |
| `FILE_LOOP` | Generate multiple files by iterating over schema tables | `FILE_LOOP({{index(1, 4)}}_{{tableName}}.sql --template=./templates/migration.sql.txt)` |
| `FOLDER_LOOP` | Create dynamic folder structures | `FOLDER_LOOP({{tableName}}): ...` |
| `LOOP_FOLDERS` | Generate files by iterating over folders | `LOOP_FOLDERS(file.html --data-source=/Data/**/info.yaml --template=./templates/template.txt)` |
| `IMPORT_PROJECT` | Import another project structure | `IMPORT_PROJECT(Projects/Other/structure.yaml)` |

### Template Commands

| Command | Description | Example |
|---------|-------------|---------|
| `USE_DATA` | Access data from YAML files | `[[USE_DATA(basic-info.name)]]` |
| `USE_FORM_DATA` | Access form data | `[[USE_FORM_DATA(projectName)]]` |
| `USE_USER_ENV` | Access user environment variables | `[[USE_USER_ENV(API_KEY)]]` |
| `USE_TEMPLATE` | Include another template | `[[USE_TEMPLATE(./partials/header.txt)]]` |
| `USE_CONSTANT` | Access schema constants | `[[USE_CONSTANT(tableName)]]` |
| `USE_ROWS` | Generate database row data (seed + mock) | `[[USE_ROWS(format=json, pretty=true)]]` |
| `LOOP` | Iterate over data | `[[LOOP(columns)]]` |
| `index()` | Generate sequential index numbers | `{{index(1, 3)}}` |
| `timestamp()` | Generate formatted date/time strings | `{{timestamp('YYYY-MM-DD')}}` |

## Getting Started

1. **Create a Project Structure**: Define your project in a `structure.yaml` file
2. **Use Project Actions**: Choose the appropriate action for your use case
3. **Create Templates**: Write template files with placeholders and commands
4. **Generate Files**: The system processes your structure and generates files

## Common Workflows

### Generate Files from Schema Tables

Use `FILE_LOOP` to generate multiple files from database schema tables:

```yaml
migrations:
  FILE_LOOP({{index(1, 4)}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml):
```

This generates ordered migration files like:
- `0001_create_users_table.sql`
- `0002_create_posts_table.sql`
- `0003_create_comments_table.sql`

### Generate Files from Data

Use `LOOP_FOLDERS` to generate multiple files from data files:

```yaml
LOOP_FOLDERS({{name}}.html --data-source=/Data/**/info.yaml --template=./templates/page.txt)
```

### Access Data in Templates

Use `USE_DATA` to access properties from the data context:

```
Name: [[USE_DATA(basic-info.name)]]
Email: [[USE_DATA(basic-info.email)]]
```

### Combine Actions

Mix different actions in your structure:

```yaml
- CREATE_FILE(app.ts --template=./templates/app.txt)
- LOOP_FOLDERS({{name}}.html --data-source=/Data/**/info.yaml --template=./templates/page.txt)
- IMPORT_PROJECT(Projects/Shared/structure.yaml):
    components:
      - CREATE_FILE(Button.tsx --template=./templates/button.txt)
```

## Additional Resources

- See individual documentation files for detailed usage
- Check the test files in `project-processors/` for examples
- Review existing project structures in `src/files/Projects/` for real-world examples

