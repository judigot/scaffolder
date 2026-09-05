---
name: project-builder
description: Use this agent when you need to understand or modify the project-builder engine (parsing, commands, generation pipeline), not when authoring templates or structure.yaml files. Examples:

<example>
Context: User needs to add a new template command
user: "I want to add a USE_TIMESTAMP command to the template processor"
assistant: "I'll use the project-builder agent to guide you through adding a new template command following the established patterns."
<commentary>
This triggers because the user needs to extend template processing.
</commentary>
</example>

<example>
Context: User wants to understand FILE_LOOP behavior
user: "How does FILE_LOOP work with the --ignore flag?"
assistant: "I'll use the project-builder agent to explain FILE_LOOP processing, including the ignore functionality and USE_CONSTANT path support."
<commentary>
This triggers because the user needs to understand code generation patterns.
</commentary>
</example>

model: inherit
color: orange
tools: ["Read", "Write", "Bash", "Grep"]
---

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
- **`filterViewTables.ts`**: Centralized helper for filtering view tables from schema info
  - Uses `schemaInfoParsed.getViewTables()` for consistent view detection
  - Returns filtered array with only base tables (excludes views)
  - Used throughout project-builder for view table exclusion

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

**View Table Exclusion:** View tables (tables with `viewQuery` property) are automatically excluded by default. Views are read-only and don't need code generation (migrations, controllers, models, etc.).

**Example:**

```yaml
db:
  FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableName.plural.snakeCase}}_table.sql
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

**View Table Exclusion:** View tables are automatically excluded when iterating over schema tables (when `--data-source` is not used).

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
- `{{tableName.snakeCase}}`: Table name in snake_case
- `{{tableName.plural.snakeCase}}`: Plural table name in snake_case
- `{{tableName.camelCase}}`: Table name in camelCase
- `{{columnName}}`: Column name
- `{{index(1, 3)}}`: Sequential index (1-based, padded to 3 digits)
- `{{timestamp('YYYY_MM_DD')}}`: Formatted timestamp (automatically unique when generating multiple files)

## View Table Exclusion

**View tables are automatically excluded by default** in all loop operations (`FILE_LOOP`, `FOLDER_LOOP`, `LOOP(tables)`, `LOOP(tablesReversed)`). Views are read-only database objects identified by the `viewQuery` property and don't need code generation (migrations, controllers, models, etc.). This exclusion cannot be disabled as views are fundamentally different from base tables.

## Ignore Functionality

The `--ignore` flag allows filtering out tables or folders during generation. **Note:** View tables are already excluded by default, so you don't need to add them to the ignore list.

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
7. **`utils/filterViewTables.ts`**: Centralized helper for filtering view tables (uses `getSchemaInfo().getViewTables()`)
8. **`getSchemaInfo.ts`** (in `src/utils/`): Schema utility with `getViewTables()` method for view table detection

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

### View Table Exclusion by Default

- **Implementation**: Automatic exclusion of view tables in all loop operations
- **Scope**: Applied to `FILE_LOOP`, `FOLDER_LOOP`, `LOOP(tables)`, and `LOOP(tablesReversed)` commands
- **Detection**: Uses centralized `getViewTables()` function from `getSchemaInfo.ts` via `filterViewTables()` helper
- **Rationale**: Views are read-only database objects that don't need code generation (migrations use `CREATE VIEW`, not `CREATE TABLE`; no CRUD operations needed)
- **Centralized Implementation**:
  - **`getSchemaInfo.ts`**: Added `getViewTables()` method that returns `IViewTable[]` with `tableName` and `viewQuery`
  - **`filterViewTables.ts`**: Helper utility that uses `schemaInfoParsed.getViewTables()` to filter out views
  - All filtering now uses this centralized approach for consistency
- **Files Using Centralized Filtering**:
  - `processMultipleFiles.ts`: Uses `filterViewTables()` before file generation
  - `processDynamicFolders.ts`: Uses `filterViewTables()` before folder generation
  - `processIterateCommand.ts`: Uses `filterViewTables()` in `processLoopTables`, `processLoopTablesReversed`, and `processHtmlLoop`
- **Testing**: Comprehensive test suites with 27 test cases covering all scenarios:
  - `processMultipleFiles-viewTables.test.ts`: 9 tests for FILE_LOOP
  - `processDynamicFolders-viewTables.test.ts`: 6 tests for FOLDER_LOOP
  - `processLoopTables-viewTables.test.ts`: 12 tests for template LOOP commands
  - `useSchemaInfo.test.ts`: 3 tests for `getViewTables()` function
- **Edge Cases Handled**: Empty viewQuery strings, undefined vs null, mixed schemas with views/base tables/pivot tables
- **Integration**: Works seamlessly with `--ignore` flag (views excluded first, then manual ignores applied)
- **Benefits of Centralization**:
  - Single source of truth for view detection logic
  - Consistent filtering across all operations
  - Easy to maintain and extend
  - Uses efficient Set-based lookup for O(1) performance
- **Documentation**: See `src/utils/project-builder/docs/README.md` for user-facing documentation

### Early Return Performance Optimization for User Files Loading

- **Problem**: Race condition on app reload where `selectedProject` is restored from localStorage before `userFiles` are fetched, causing unnecessary build attempts
- **Solution**: Two-level early return strategy implemented in `App.tsx` and `useProjectStore.ts`
- **Component Level** (`App.tsx`): `useEffect` checks prerequisites (`hasSelectedProject`, `hasUser`, `hasUserFiles`) before triggering build
  - Prevents unnecessary async function calls when data isn't ready
  - Automatically rebuilds when `userFiles` become available via dependency array
- **Store Level** (`useProjectStore.ts`): `buildProjectFilesForProject` returns early if `userFiles` are empty
  - Prevents expensive operations (YAML parsing, file searching, structure processing)
  - Returns immediately with clear error message instead of going through entire build pipeline
- **Performance Impact**: Eliminates wasted CPU cycles by avoiding build pipeline execution when prerequisites aren't met
- **Implementation**: Uses descriptive boolean variables (`hasSelectedProject`, `hasUser`, `hasUserFiles`, `canBuildProject`, `hasNoUserFiles`) for readability
- **Documentation**: See `src/utils/project-builder/docs/PERFORMANCE_OPTIMIZATIONS.md` for detailed documentation

### Automatic Unique Timestamps for Multiple File Generation

- **Problem**: When generating multiple files using `FILE_LOOP` with `{{timestamp()}}`, all files would receive the same timestamp, causing filename collisions
- **Solution**: Automatic offset mechanism that ensures unique timestamps while preserving order
- **Implementation**:
  - **`formatTimestamp()`** (`placeholderFunctions.ts`): Added optional `offsetMs` parameter to apply millisecond offset to base date
  - **`processTimestampFunction()`** (`placeholderFunctions.ts`): Added optional `offsetMs` parameter and passes it to `formatTimestamp()`
  - **`processDynamicProperties()`** (`processDynamicProperties.ts`): Automatically calculates offset from `tableIndex` (1 second per index, converted to milliseconds)
- **How it works**:
  - Each file receives a timestamp offset by its processing index (`tableIndex`)
  - Offset is applied in 1-second increments (1000ms per index) to ensure uniqueness even for second-level formats (Laravel, Rails)
  - Order is preserved: earlier items get earlier timestamps
- **Example**: When generating 3 files, timestamps are offset by 0s, 1s, and 2s respectively
- **Benefits**:
  - No manual intervention required - uniqueness is automatic
  - Works with all timestamp formats (ISO 8601, Laravel, Rails, custom)
  - Preserves processing order in timestamps
  - Prevents filename collisions in batch operations
- **Testing**: Comprehensive test suite in `placeholderFunctions.test.ts` (7 tests) and `processDynamicProperties-timestamp.test.ts` (10 tests)
- **Documentation**: See `src/utils/project-builder/docs/PLACEHOLDER_FUNCTIONS.md` for user-facing documentation
- **Note**: This is a general-purpose feature that works for any use case requiring unique, ordered timestamps, not specific to any framework

### Repository Viewer Fallback and Projects Folder Convention Enforcement

- **Problem**: Repositories without valid scaffolder project structure (missing `Projects/` folder) would fail silently or show stale data from localStorage, preventing users from browsing invalid repositories
- **Solution**: Added repository viewer fallback mode and enforced root-level-only Projects folder convention through self-documenting code
- **Implementation**:
  - **`useMockDatabaseStore.ts`**: Fixed state update to occur even when no Projects folder is found, enabling fallback viewer
  - **`src/utils/project-builder/utils/findProjectsFolderAtRoot.ts`**: Created self-documenting utility function that enforces root-level-only Projects folder lookup (not nested)
  - **`App.tsx`**: Added repository viewer fallback UI with helpful hints and call-to-action links
  - **`src/components/FileViewer.tsx`**: Conditionally hide action buttons when in read-only mode
  - **`useUserFiles.ts`**: Improved error messaging for empty repositories
- **Features**:
  - **Fallback Viewer**: Repositories without valid scaffolder structure now display in read-only mode with helpful information
  - **Structure Hints**: Warning banner shows when `Projects/` folder is missing, explaining where it should be located
  - **Documentation Links**: Link to structure documentation for users to learn how to set up scaffolder projects
  - **Convert Repository Button**: UI placeholder for future repository conversion feature
  - **Root-Level Convention**: Projects folder MUST be at root level (enforced by `findProjectsFolderAtRoot()` function name)
- **UI Enhancements**:
  - Action buttons ("Create App", "Export Into A New Repository") are hidden in read-only mode
  - Info banners explain why repository is in read-only mode
  - Warning banners show missing structure requirements
- **Code Quality**:
  - Self-documenting function names replace comments (aligns with project's no-comments preference)
  - Centralized Projects folder lookup logic in reusable utility function
  - Consistent behavior across all three lookup locations (`useMockDatabaseStore`, `App.tsx`, `loadCoreFiles.ts`)
- **Files Changed**:
  - `src/useMockDatabaseStore.ts`: Fixed state update logic, uses `findProjectsFolderAtRoot()`
  - `src/App.tsx`: Added fallback viewer UI, conditional button rendering, uses `findProjectsFolderAtRoot()`
  - `src/components/FileViewer.tsx`: Conditionally hide buttons when `mode === 'view'`
  - `src/utils/project-builder/utils/findProjectsFolderAtRoot.ts`: New utility function
  - `src/utils/project-builder/utils/loadCoreFiles.ts`: Uses `findProjectsFolderAtRoot()`
  - `src/hooks/useUserFiles.ts`: Improved error messaging for empty repositories
