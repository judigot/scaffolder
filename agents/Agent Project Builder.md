# Agent Project Builder - Context Guide

This document provides essential context about the project-builder system for AI agents working on this codebase.

## Overview

The project-builder is a code generation system that scaffolds project files from YAML structure definitions. It processes YAML files that define file structures, templates, and generation rules to create complete project directories.

## Core Architecture

### Main Entry Point
- **`buildProjectFiles.ts`**: Main function that orchestrates the entire build process
  - Takes a project YAML path, user files, schema info, and form data
  - Returns generated file structure with metadata about files using user env vars and formatting failures
  - Handles circular import detection and placeholder dependency validation

### Key Components

#### 1. Project Processors (`project-processors/`)
- **`processYamlStructure.ts`**: Recursively processes YAML structure, handling all project actions
- **`processMultipleFiles.ts`**: Generates multiple files from schema tables (FILE_LOOP action)
  - Supports `--ignore` flag with `USE_CONSTANT()` for filtering tables
  - Supports `--include-table` and `--exclude-table` for table filtering
  - Supports `--template` for specifying template files
- **`processLoopFolders.ts`**: Generates files by iterating over folders matching glob patterns
- **`importProject.ts`**: Handles importing other project structures
- **`processDynamicFolders.ts`**: Creates dynamic folder structures based on conditions

#### 2. Template Processors (`template-processors/`)
- **`processIterateCommand.ts`**: Handles LOOP commands and iteration logic
  - Supports `--ignore` flag with `USE_CONSTANT()` for filtering in LOOP commands
  - Supports `--filter`, `--separator`, `--include-files`, `--exclude-files` flags
- **`loadConstant.ts`**: Loads constant values from YAML files
  - `loadConstant()`: Loads from Constants folder (legacy)
  - `loadConstantFromPath()`: Loads from any file path (relative or absolute) - **NEW**
- **`processCommand.ts`**: Processes template commands like `USE_CONSTANT`, `USE_FORM_DATA`, `USE_USER_ENV`
- **`replacePlaceholders.ts`**: Replaces placeholders like `{{tableName}}` with actual values

#### 3. Utilities (`utils/`)
- **`parseCommand.ts`**: Parses command strings and extracts flags/options
  - Supports flags like `--template`, `--ignore`, `--data-source`, `--include-table`, etc.
- **`findFileInStructure.ts`**: Finds files in the file structure by path
- **`processRelativePath.ts`**: Resolves relative paths to absolute paths based on project file location
- **`loadTemplateContent.ts`**: Loads template file content
- **`loadDataSourceFile.ts`**: Loads data source YAML files

#### 4. Structure Utilities
- **`updateFilesInStructure.ts`**: Updates multiple files in a structure in a single pass
  - Takes a structure and a Map of file paths to new content
  - Returns a new immutable structure with updated files
  - Efficient for selective rebuilds when only specific files need updating (e.g., files using `USE_USER_ENV`)
  - Used for optimizing rebuilds when metadata changes

#### 5. Helpers (`helpers/`)
- **`sanitizeFileName.ts`**: Enterprise-grade filename and folder name sanitization
  - Removes invalid characters, control characters, and reserved Windows filenames
  - Ensures cross-platform compatibility (Windows, Linux, macOS)
  - Applied to all generated filenames and folder names throughout the system
  - See "Enterprise-Grade Filename and Folder Name Sanitization" in Recent Changes for details

## Project Actions

### FILE_LOOP
Generates multiple files by iterating over schema tables.

**Syntax:**
```yaml
FILE_LOOP(filename --template=path --ignore=value --data-source=path)
```

**Flags:**
- `--template`: Path to template file (supports relative paths)
- `--ignore`: Comma-separated list of table names to skip, or `USE_CONSTANT(path)` to load from file
- `--include-table`: Only include specific table
- `--exclude-table`: Exclude specific table
- `--data-source`: Path to data source YAML files
- `--format`: Enable/disable file formatting (default: true)

**Example:**
```yaml
db:
  FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNameSnakeCasePlural}}_table.sql 
    --ignore USE_CONSTANT(./constants/ignoredTables.yaml) 
    --template ./templates/migration.sql.txt 
    --data-source=/Constants/typeMappings.yaml,/Constants/dbTypes.yaml):
```

### LOOP_FOLDERS
Generates files by iterating over folders matching a glob pattern.

**Syntax:**
```yaml
LOOP_FOLDERS(filename --data-source=pattern --template=path)
```

### IMPORT_PROJECT
Imports another project structure.

**Syntax:**
```yaml
IMPORT_PROJECT(path/to/structure.yaml)
```

## Template Commands

### USE_CONSTANT
Accesses constant values from YAML files. Supports two formats:

1. **In templates** (with brackets): `[[USE_CONSTANT(constantName)]]`
2. **In command options** (without brackets): `USE_CONSTANT(./path/to/file.yaml)`

**Path Support:**
- **Relative paths**: `./constants/ignoredTables.yaml` (resolved relative to project YAML file)
- **Absolute paths**: `/Projects/App/constants/ignoredTables.yaml`
- **Constants folder** (legacy): Just the constant name (e.g., `tableName`) loads from `/Constants/tableName.yaml`

**File Format:**
YAML files can contain:
- Array of values: `- value1\n- value2`
- Named object with array: `constantName: [value1, value2]`

### USE_FORM_DATA
Accesses form data values: `[[USE_FORM_DATA(key)]]`

### USE_USER_ENV
Accesses user environment variables: `[[USE_USER_ENV(VAR_NAME)]]`

### USE_DATA
Accesses data from external YAML files: `[[USE_DATA(path.to.value)]]`

### USE_TEMPLATE
Includes another template: `[[USE_TEMPLATE(./path/to/template.txt)]]`

## Placeholders

Placeholders use double curly braces: `{{placeholderName}}`

**Common Placeholders:**
- `{{tableName}}`: Table name in original case
- `{{tableNameSnakeCase}}`: Table name in snake_case
- `{{tableNameSnakeCasePlural}}`: Plural table name in snake_case
- `{{tableNameCamelCase}}`: Table name in camelCase
- `{{columnName}}`: Column name
- `{{index(1, 3)}}`: Sequential index (1-based, padded to 3 digits)
- `{{timestamp('YYYY_MM_DD')}}`: Formatted timestamp

## Ignore Functionality

The `--ignore` flag allows filtering out tables or folders during generation.

### Usage in FILE_LOOP

```yaml
FILE_LOOP(filename.sql --ignore USE_CONSTANT(./constants/ignoredTables.yaml) --template=./template.txt):
```

### Usage in LOOP Commands

```yaml
someKey: LOOP(columns --ignore="id,created_at,updated_at"):
```

### Supported Formats

1. **Direct table names**: `--ignore="table1,table2"`
2. **USE_CONSTANT with file path**: `--ignore="USE_CONSTANT(./constants/ignoredTables.yaml)"`
3. **USE_CONSTANT with absolute path**: `--ignore="USE_CONSTANT(/Projects/App/constants/ignored.yaml)"`
4. **USE_CONSTANT from Constants folder** (legacy): `--ignore="USE_CONSTANT(constantName)"`

### Implementation Details

- **`loadConstantFromPath()`**: New function that loads constants from any file path
  - Supports relative paths (resolved using `processRelativePath()`)
  - Supports absolute paths
  - Returns array of string values from YAML file
- **`processMultipleFiles.ts`**: Filters schema tables based on ignore list
- **`processIterateCommand.ts`**: Filters items in LOOP commands based on ignore list
- Both support `USE_CONSTANT(...)` syntax (without brackets) for command options

## File Structure

The system works with an in-memory file structure (`IStructure`) that represents:
- **Files**: `{ type: 'file', name: string, content: string }`
- **Folders**: `{ type: 'folder', name: string, children: IStructure }`

Files are loaded from this structure, processed, and new files are generated.

## Build Context Pattern

The system uses `IBuildContext` to pass shared state:
- `userFiles`: The file structure
- `schemaInfo`: Database schema information
- `schemaInfoParsed`: Parsed schema with relationships
- `projectYamlPath`: Path to the project YAML file
- `formData`: User form data
- `userMetadata`: Additional metadata
- `table`: Current table context (when iterating)
- `options`: Command options/flags

## Path Resolution

- **Relative paths** (starting with `./` or `../`): Resolved relative to the project YAML file's directory
- **Absolute paths** (starting with `/`): Used as-is
- **Template paths**: Can be relative or absolute, resolved using `processRelativePath()`

## Testing

Test files are located in `src/tests/utils/project-builder/`:
- Test file naming: `*.test.ts`
- Use `describe()` and `it()` from vitest
- Mock file structures using `IStructure` type
- Mock schema info using `ISchemaInfo` interface (must include all required fields)

## Common Patterns

### Adding a New Flag

1. Add flag parsing in `parseCommand.ts`
2. Add flag handling in the relevant processor
3. Update `IActionFlags` interface if needed
4. Add tests

### Loading Files from Paths

Use `findFileInStructure()` with resolved path:
```typescript
const resolvedPath = processRelativePath(relativePath, projectYamlPath);
const file = findFileInStructure(resolvedPath, userFiles);
```

### Processing USE_CONSTANT

Check for both formats:
```typescript
const USE_CONSTANT_OPTION_REGEX = /USE_CONSTANT\(([^)]+)\)/;
let match = USE_CONSTANT_OPTION_REGEX.exec(value); // Without brackets
if (!match) {
  match = USE_CONSTANT_REGEX.exec(value); // With brackets
}
```

## Key Files to Understand

1. **`buildProjectFiles.ts`**: Entry point, understand the flow
2. **`processYamlStructure.ts`**: How YAML is processed
3. **`processMultipleFiles.ts`**: How FILE_LOOP works
4. **`loadConstant.ts`**: How constants are loaded (including new path support)
5. **`parseCommand.ts`**: How command options are parsed
6. **`interfaces/interfaces.ts`**: Type definitions

## Recent Changes

### Graceful Handling of Missing User Metadata
- Updated `fetchUserMetadata()` in `src/hooks/useUser.ts` to return `null` instead of throwing errors when API fails
- Updated `App.tsx` to allow project building without requiring `decryptedMetadata !== null`
- Project builder now works without Auth0 Management API credentials
- `USE_USER_ENV` placeholders are replaced with empty strings when metadata is unavailable
- Files using `USE_USER_ENV` are tracked in `filesUsingUserEnv` array for user awareness
- Added error handling to `/api/user-metadata` endpoint to return proper JSON error responses

### Ignore Flag with USE_CONSTANT Path Support
- Added `loadConstantFromPath()` function to load constants from any file path
- Updated `processMultipleFiles.ts` to support `--ignore` flag with `USE_CONSTANT(path)`
- Updated `processIterateCommand.ts` to support `--ignore` flag with `USE_CONSTANT(path)`
- Added support for both relative and absolute paths
- Added `USE_CONSTANT_OPTION_REGEX` to match `USE_CONSTANT(...)` without brackets (for command options)

### Selective File Updates
- Added `updateFilesInStructure()` utility function for efficiently updating multiple files in a structure
- Enables selective rebuilds when only specific files need updating (e.g., when user metadata changes)
- Returns immutable structure with updated files in a single pass
- Exported from `buildProjectFiles.ts` for use in project store and other modules
- Can be used to optimize rebuilds by only updating files that use `USE_USER_ENV` when metadata changes

### Project Generation Endpoints Unification
- Both `/scaffold` and `/create-local-files` endpoints now use the same project builder system
- Created shared `IProjectGenerationRequest` interface in `src/interfaces/IProjectGenerationRequest.ts`
- Both endpoints accept identical request bodies: `schemaInfo`, `SQLSchema`, `formData`, and `userMetadata`
- **`/scaffold` endpoint**: Generates files using project builder AND executes database operations (creates/resets database with SQL schema) AND validates backend URL
- **`/create-local-files` endpoint**: Generates files using project builder only (no database operations)
- Both endpoints generate identical file structures using the same `buildProjectFiles()` function
- Use `/scaffold` when you need database setup and backend validation
- Use `/create-local-files` when you only need file generation

### Enterprise-Grade Filename and Folder Name Sanitization
- **Implementation**: `src/utils/project-builder/helpers/sanitizeFileName.ts`
- **Purpose**: Protects against filesystem errors and security vulnerabilities from user-generated filenames
- **Coverage**: Applied to all generated filenames AND folder names across the entire project builder system
- **Security Features**:
  - Removes control characters (0x00-0x1F, 0x80-0x9F) to prevent injection attacks
  - Removes invalid filesystem characters (`<`, `>`, `"`, `|`, `?`, `*`, `/`, `\`)
  - Replaces colons (`:`) with hyphens (`-`) for Windows compatibility (common in ISO 8601 timestamps)
  - Handles Windows reserved filenames (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) by prefixing with underscore
  - Removes trailing/leading periods and spaces (invalid on Windows)
  - Enforces 255-character filename limit (preserving extension)
  - Defaults empty filenames to `file`
- **Where Applied**:
  - `FILE_LOOP` commands: Filenames sanitized in `processMultipleFiles.ts`
  - `CREATE_FILE` commands: Filenames sanitized in `processYamlStructure.ts`
  - `LOOP_FOLDERS` commands: Filenames sanitized in `processLoopFolders.ts`
  - Regular folder names: Sanitized in `processYamlStructure.ts` (conditional folders)
  - `FOLDER_LOOP` commands: Folder names sanitized in `processDynamicFolders.ts`
- **Testing**: Comprehensive test suite in `src/tests/utils/project-builder/helpers/sanitizeFileName.test.ts` with 31 test cases covering all edge cases
- **User Documentation**: See `src/utils/project-builder/docs/PLACEHOLDER_FUNCTIONS.md` for user-facing documentation
- **Note**: This is a production-grade security feature that ensures cross-platform compatibility and prevents filesystem errors from malicious or malformed user input

