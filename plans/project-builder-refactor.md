# Project Builder Refactoring Plan

## Overview

The `src/utils/project-builder/` module is the core scaffolding engine that processes YAML structure definitions and generates project files. While functional, it has accumulated technical debt that makes it difficult to maintain, extend, and debug.

This document outlines architectural issues, good patterns to preserve, and a phased refactoring plan.

---

## Current Architecture

### File Structure (57 files)

```
src/utils/project-builder/
├── buildProjectFiles.ts              # Main entry point
├── updateFilesInStructure.ts         # File structure utilities
├── constants/                        # Configuration & regex patterns
│   ├── actionFlags.ts                # 10 action flags enum
│   ├── projectActions.ts             # 6 project-level actions
│   ├── templateActions.ts            # Template syntax & 50+ regex patterns
│   └── placeholderFunctions.ts       # Placeholder function definitions
├── interfaces/
│   └── interfaces.ts                 # IBuildContext & related types
├── helpers/                          # 5 utility helpers
│   ├── contextHelpers.ts             # Context creation & modification
│   ├── formatFileContent.ts          # HTML/Auto-formatting
│   ├── autoFormatByExtension.ts      # Code formatting
│   ├── sanitizeFileName.ts           # Filename sanitization
│   └── extractFileNameFromPath.ts    # Path parsing
├── project-processors/               # 8 YAML structure processors
│   ├── processYamlStructure.ts       # Main recursive processor (1068 lines!)
│   ├── processMultipleFiles.ts       # FILE_LOOP handler (334 lines)
│   ├── processDynamicFolders.ts      # FOLDER_LOOP handler
│   ├── processLoopFolders.ts         # LOOP_FOLDERS handler
│   ├── importProject.ts              # IMPORT_PROJECT handler
│   ├── createBaseMethodFile.ts       # CREATE_BASE_METHOD_FILE handler
│   ├── checkConditions.ts            # Condition evaluation
│   └── parseConditionalFolder.ts     # Folder name parsing
├── template-processors/              # 15+ template command handlers
│   ├── processCommand.ts             # Main command dispatcher
│   ├── processIterateCommand.ts      # LOOP/ITERATE logic (500+ lines!)
│   ├── processIterateInTemplate.ts   # LOOP in template syntax
│   ├── processIfConditions.ts        # Conditional rendering
│   ├── getReplacementsForTable.ts    # Table placeholder mapping (225 lines)
│   ├── getReplacementsForAuth.ts     # Auth schema replacements
│   ├── processArrayIteration.ts      # Array iteration DSL
│   ├── processColumnsInfoIteration.ts# Column-specific loops
│   └── [+7 more processors]
└── utils/                            # 27+ utility functions
    ├── replacePlaceholders.ts        # Core replacement logic
    ├── dataSourceUtils.ts            # Glob pattern matching
    ├── parseCommand.ts               # Command string parsing
    └── [+24 more utilities]
```

### Data Flow

```
buildProjectFiles()
    ↓
    [Validation: circular imports, placeholder references]
    ↓
    ├─→ loadCoreFiles()
    ├─→ loadSchemas()
    ├─→ processCoreFiles()
    └─→ parseYAML + createContext()
        ↓
        processYamlStructure(ctx)   ← MAIN RECURSIVE PROCESSOR
        ├─ String nodes → command detection & execution
        ├─ Array nodes  → forEach → recurse
        └─ Object nodes → folder structure → recurse
            ↓
        [Template processing pipeline]
        1. replacePlaceholders()
        2. processCommand()
        3. processLoopTables()
        4. processLoopTablesReversed()
        5. processLoopDataSources()
        6. processIterateInTemplate()
        7. formatFileContent()
            ↓
    [Deduplicate & return structure]
```

---

## Problems Identified

### 1. Severe Parameter Drilling (CRITICAL)

**The Problem:**
Functions pass 10-15+ parameters through multiple layers, similar to React prop drilling.

**Evidence:**

```typescript
// processCommand.ts - 11 parameters!
export const processCommand = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  templateFilePath?: string,
  projectFilePath?: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataContext?: DataContext,
  skipLoopDataSources = false,
  mockData?: ParsedJSONSchema,
): string
```

```typescript
// processIterateCommand receives even more parameters
// and passes them all to child functions
```

**Impact:**
- Hard to add new parameters (must update 10+ call sites)
- Easy to pass wrong order of parameters
- Cognitive overload when reading code
- Type errors when optional params shift position

**Metrics:**
- Max parameters in single call: 15-20
- Average parameters per function: 8-12
- Functions not using IBuildContext: ~10 template processors
- Redundant parameter passing: 5-8 functions pass same 4-5 params every call

### 2. God Functions (CRITICAL)

**processYamlStructure.ts - 1068 lines**
- Handles 7 different action types
- Handles 3 input types (string, array, object)
- 150+ code path combinations
- Mixed concerns: routing, processing, validation, tracking

**processIterateCommand.ts - 500+ lines**
- Handles LOOP_TABLES, LOOP_COLUMNS, LOOP_DATA_SOURCES
- Handles condition evaluation
- Handles file-based template processing
- Handles HTML formatting
- No clear separation of concerns

### 3. Code Duplication

**Triple-nested template processing (appears 4 times):**

```typescript
// Lines 250-274, 347-371, 877-901, 985-1009 in processYamlStructure
processLoopDataSources(
  processLoopTablesReversed(
    processLoopTables(
      templateContent,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      formData,
      userMetadata,
      dataSource,
      ctx.mockData,
    ),
    schemaInfo,
    schemaInfoParsed,
    userFiles,
    formData,
    userMetadata,
    dataSource,
    ctx.mockData,
  ),
  userFiles,
  schemaInfoParsed,
  formData,
  userMetadata,
)
```

**Path construction (20+ times):**
```typescript
// Duplicated in processYamlStructure, processMultipleFiles, processLoopFolders
const buildAbsolutePath = (fileName: string, currentPath: string) => {
  if (currentPath === '') return fileName;
  return `${currentPath}/${fileName}`;
};
```

**File sanitization pattern (50+ times):**
```typescript
let outputFileName = processedName.includes('/')
  ? extractFileNameFromPath(processedName)
  : processedName;
outputFileName = sanitizeFileName(outputFileName);
```

### 4. Type Inconsistencies

**Replacements type mismatch:**
```typescript
// Declared type
type Replacements = Record<string, ReplacementValue>;
type ReplacementValue = string | string[];

// But code often expects Record<string, string>
// and arrays get comma-joined unexpectedly
```

**Optional parameter confusion:**
```typescript
table?: ISchemaInfo         // Optional in some, required in others
formData?: IFormStore       // Sometimes undefined, sometimes required
userMetadata?: Record<string, unknown> | null  // Triple state!
```

**Context property optionality:**
- ~40% of IBuildContext properties are optional
- No validation that required properties exist before use
- Functions assume `table` exists without null checks

### 5. Mixed Architectural Patterns

**Old pattern (parameter drilling):**
```typescript
export const processCommand = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  // ... 8 more params
): string
```

**New pattern (context-based):**
```typescript
export const processYamlStructure = async (
  ctx: IBuildContext,
): Promise<IStructure>
```

About 60% of code uses old pattern, 40% uses new pattern.

### 6. Unclear Function Responsibilities

**replacePlaceholders() vs processCommand():**
- Both handle template syntax
- `replacePlaceholders()` calls `processCommand()`
- `processCommand()` calls processors that call `replacePlaceholders()`
- Circular dependency risk, unclear when to use which

**getReplacementsForTable() doing too much (225 lines):**
- Generates 40+ replacement keys
- Creates Proxy objects for dynamic access
- Handles separator parsing with regex
- Handles auth resource detection
- Mixed concerns: schema mapping + dynamic property access

### 7. Inconsistent Error Handling

- Most functions return `[]` on error silently
- Few log errors
- Callback-based tracking for specific events only
- No centralized error collection
- Hard to debug why a file wasn't generated

### 8. Regex Pattern Explosion

`templateActions.ts` contains 50+ regex patterns:
- Many are compile-time constants (memory overhead)
- Some overlap in functionality
- Pattern construction scattered across files
- Hard to understand which regex handles what

---

## Good Patterns to Preserve

### 1. IBuildContext Pattern (EXCELLENT)

```typescript
interface IBuildContext {
  readonly userFiles: IStructure;
  readonly schemaInfo: ISchemaInfo[];
  readonly schemaInfoParsed: ISchemaInfoResult;
  readonly projectYamlPath: string;
  readonly table?: ISchemaInfo;
  readonly dataContext?: DataContext;
  readonly currentPath?: string;
  // ...
}
```

**Why it's good:**
- Single source of truth
- Immutable by convention (readonly)
- Pass-through without modification
- Helper functions for context modification

**Helper functions in contextHelpers.ts:**
```typescript
createContext()     // Initialize
withTable()         // New context with different table
withPath()          // New context with different path
withDataContext()   // New context with different data
withUpdates()       // New context with multiple changes
```

### 2. Recursive Structure Processing

```typescript
// Handles arrays, objects, and strings naturally
const processYamlStructure = async (ctx: IBuildContext) => {
  if (typeof node === 'string') return processStringNode(ctx);
  if (Array.isArray(node)) return processArrayNode(ctx);
  if (typeof node === 'object') return processObjectNode(ctx);
};
```

**Why it's good:**
- Natural handling of YAML nesting
- Proper depth tracking with `currentPath`
- Clean recursion pattern

### 3. Callback-based Tracking

```typescript
interface IBuildContext {
  onFileUsingUserEnv?: (filePath: string) => void;
  onFileFailedToFormat?: (filePath: string, msg: string) => void;
}
```

**Why it's good:**
- Clean event tracking without polluting return types
- Allows filtering concerns
- Non-invasive to main logic

### 4. Type-safe Command Options

```typescript
export const ACTION_FLAGS = {
  CONDITIONS: 'conditions',
  TEMPLATE: 'template',
  INCLUDE_TABLE: 'include-table',
  // ...
} as const;
```

**Why it's good:**
- Prevents typos
- Self-documenting
- Autocomplete support

### 5. Early Validation

```typescript
// In buildProjectFiles.ts
detectCircularImports(userFiles);
detectCircularPlaceholderImports(userFiles);
```

**Why it's good:**
- Fail fast with clear error messages
- Shows cycle chain for debugging
- Prevents infinite loops

### 6. Centralized Mock Data

```typescript
// Generates consistent mock data for seed files
// Supports multiple database types
```

**Why it's good:**
- Single source of test data generation
- Consistent across all generated files

---

## Refactoring Plan

### Phase 1: Consolidate Duplicate Code (LOW RISK)

**Goal:** Reduce code duplication without changing behavior

#### 1.1 Extract Template Processing Pipeline

Create `processTemplatePipeline.ts`:

```typescript
export const processTemplatePipeline = (
  content: string,
  ctx: IBuildContext,
): string => {
  let result = content;
  result = processLoopTables(result, ctx);
  result = processLoopTablesReversed(result, ctx);
  result = processLoopDataSources(result, ctx);
  return result;
};
```

Replace 4 duplicate occurrences with single function call.

#### 1.2 Extract Path Utilities

Create `pathUtils.ts`:

```typescript
export const buildAbsolutePath = (fileName: string, basePath: string): string => {
  if (basePath === '') return fileName;
  return `${basePath}/${fileName}`;
};

export const sanitizeOutputFileName = (name: string): string => {
  const fileName = name.includes('/') ? extractFileNameFromPath(name) : name;
  return sanitizeFileName(fileName);
};
```

#### 1.3 Extract File Processing Patterns

Create shared utilities for common patterns.

**Estimated effort:** 2-3 hours
**Risk:** Low (extracting existing code)
**Payoff:** High (reduces maintenance burden)

---

### Phase 2: Migrate Template Processors to Context API (MEDIUM RISK)

**Goal:** Eliminate parameter drilling in template processors

#### 2.1 Update Function Signatures

Before:
```typescript
export const processCommand = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  templateFilePath?: string,
  projectFilePath?: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataContext?: DataContext,
  skipLoopDataSources?: boolean,
  mockData?: ParsedJSONSchema,
): string
```

After:
```typescript
export const processCommand = (
  text: string,
  ctx: IBuildContext,
  options?: { skipLoopDataSources?: boolean },
): string
```

#### 2.2 Files to Update

Priority order (most called first):
1. `processCommand.ts`
2. `processIterateCommand.ts`
3. `replacePlaceholders.ts`
4. `processIfConditions.ts`
5. `processColumnsInfoIteration.ts`
6. `processArrayIteration.ts`
7. `getReplacementsForTable.ts`
8. `processIterateInTemplate.ts`

#### 2.3 Migration Strategy

1. Add context parameter alongside existing params
2. Update function body to use `ctx.xxx` instead of params
3. Update all call sites to pass context
4. Remove old parameters
5. Run tests after each file

**Estimated effort:** 4-6 hours
**Risk:** Medium (many call sites to update)
**Payoff:** Very High (eliminates parameter drilling)

---

### Phase 3: Decompose God Functions (HIGH IMPACT)

**Goal:** Break down large functions into focused modules

#### 3.1 Split processYamlStructure.ts (1068 lines)

Extract into separate handlers:

```
project-processors/
├── processYamlStructure.ts       # Coordinator only (~200 lines)
├── handlers/
│   ├── handleStringNode.ts       # String command routing
│   ├── handleArrayNode.ts        # Array iteration
│   ├── handleObjectNode.ts       # Object/folder processing
│   ├── handleCreateFile.ts       # CREATE_FILE action
│   ├── handleFileLoop.ts         # FILE_LOOP action (reuse processMultipleFiles)
│   ├── handleImportProject.ts    # IMPORT_PROJECT action
│   └── handleLoopFolders.ts      # LOOP_FOLDERS action
```

#### 3.2 Split processIterateCommand.ts (500+ lines)

Extract into strategy pattern:

```
template-processors/
├── processIterateCommand.ts      # Coordinator only (~100 lines)
├── loop-handlers/
│   ├── loopTables.ts             # LOOP(tables) handler
│   ├── loopTablesReversed.ts     # LOOP(tablesReversed) handler
│   ├── loopColumnsInfo.ts        # LOOP(columnsInfo) handler
│   ├── loopDataSource.ts         # LOOP_DATA_SOURCES handler
│   └── loopFileBased.ts          # File-based loop handler
```

#### 3.3 Split getReplacementsForTable.ts (225 lines)

Extract concerns:

```
template-processors/
├── replacements/
│   ├── tableReplacements.ts      # Core table placeholders
│   ├── caseReplacements.ts       # Case format variants
│   ├── columnReplacements.ts     # Column-related placeholders
│   ├── authReplacements.ts       # Auth resource detection
│   └── proxyReplacements.ts      # Dynamic property access
```

**Estimated effort:** 8-12 hours
**Risk:** High (significant restructuring)
**Payoff:** Very High (maintainability, testability)

---

### Phase 4: Improve Type Safety (MEDIUM RISK)

**Goal:** Eliminate type assertions and improve type inference

#### 4.1 Create Discriminated Unions for Nodes

```typescript
type YamlNode =
  | { type: 'string'; value: string }
  | { type: 'array'; items: YamlNode[] }
  | { type: 'object'; entries: Record<string, YamlNode> };
```

#### 4.2 Create Required Context Variants

```typescript
interface ITableContext extends IBuildContext {
  table: ISchemaInfo;  // Required, not optional
}

interface IFileContext extends ITableContext {
  currentPath: string;  // Required
  templateFilePath: string;  // Required
}
```

#### 4.3 Add Runtime Validation

```typescript
const requireTable = (ctx: IBuildContext): ITableContext => {
  if (!ctx.table) {
    throw new Error('Table is required for this operation');
  }
  return ctx as ITableContext;
};
```

**Estimated effort:** 4-6 hours
**Risk:** Medium (type system changes)
**Payoff:** Medium (better IDE support, fewer bugs)

---

### Phase 5: Improve Error Handling (LOW RISK)

**Goal:** Make debugging easier

#### 5.1 Create Error Collection

```typescript
interface IBuildContext {
  errors: BuildError[];
  warnings: BuildWarning[];
  addError: (error: BuildError) => void;
  addWarning: (warning: BuildWarning) => void;
}

interface BuildError {
  type: 'template' | 'validation' | 'io';
  message: string;
  file?: string;
  line?: number;
  context?: Record<string, unknown>;
}
```

#### 5.2 Add Structured Logging

```typescript
const log = createLogger('project-builder');

// In functions
log.debug('Processing file', { path, template });
log.warn('Skipping table', { table, reason });
log.error('Template error', { error, context });
```

**Estimated effort:** 3-4 hours
**Risk:** Low (additive changes)
**Payoff:** Medium (better debugging)

---

## Priority Matrix

| Task | Impact | Effort | Risk | Priority |
|------|--------|--------|------|----------|
| Extract template pipeline | High | Low | Low | **P0** |
| Extract path utilities | Medium | Low | Low | **P0** |
| Migrate processCommand to context | Very High | Medium | Medium | **P1** |
| Migrate processIterateCommand | Very High | Medium | Medium | **P1** |
| Split processYamlStructure | Very High | High | High | **P2** |
| Split processIterateCommand | High | Medium | Medium | **P2** |
| Add discriminated unions | Medium | Medium | Medium | **P3** |
| Add error collection | Medium | Low | Low | **P3** |

---

## Testing Strategy

### Kitchen Sink Projects

There are **two kitchen sink projects** that together test the entire scaffolder:

| Project | Focus | Files Generated | Key Features Tested |
|---------|-------|-----------------|---------------------|
| **hono-react** | Full-stack app generation | ~50 files | Routes, ORM, Auth, API tests |
| **App Generator - Database Schema** | Schema transformation | ~166 files | Index patterns, timestamps, SQL/CSV/JSON |

### Kitchen Sink #1: hono-react (Full-Stack)

**hono-react is the "kitchen sink" for application generation** - it exercises nearly every feature of the project-builder:

- All table types (regular, composite PK, auth tables)
- All column types (bigserial, text, varchar, boolean, timestamp, bigint)
- Foreign key relationships
- Authentication (Lucia + session management)
- OAuth accounts
- CRUD route generation
- Drizzle ORM schema generation
- Database seeding with mock data
- API test script generation

**The hono-react CI workflow (`.apps/hono-react/.github/workflows/api-test.yml`) is the ultimate integration test:**

```bash
# Run locally with act (catthehacker)
cd /tmp/hono-react
act -j api-test -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

**What it tests:**
1. Dependencies install correctly (`bun install`)
2. Drizzle schema is valid (`bun drizzle-kit push`)
3. API server starts without errors
4. All 69 API endpoints work (CRUD for all tables)
5. Authentication flow works (register, login, session, logout)
6. Composite primary key routes work (`/:orderId/:productId`)

**THIS MUST PASS AFTER EVERY REFACTORING CHANGE.**

### Kitchen Sink #2: App Generator - Database Schema (Schema Transformation)

**Database Schema is the "kitchen sink" for schemaInfo transformation** - the core of the scaffolder:

```
files/Projects/App Generator - Database Schema/
├── structure.yaml          # Tests FILE_LOOP with many naming patterns
└── templates/
    ├── migration.sql.txt   # Per-table migration template
    ├── flyway-migration.sql.txt
    ├── seed-data.*.txt     # SQL, CSV, JSON formats
    └── table-seed.*.txt    # Per-table seed formats
```

**What it tests (166 files generated):**

1. **Core schema.sql** - The source of truth for all database schemas
   - All column types (BIGSERIAL, TEXT, VARCHAR, BOOLEAN, TIMESTAMPTZ, BIGINT)
   - Foreign key constraints with proper naming
   - Composite primary keys (`PRIMARY KEY ("order_id", "product_id")`)
   - Unique constraints
   - Default values (`DEFAULT NOW()`)

2. **Index patterns** - `{{index}}` placeholder variations
   - `{{index}}` - 0-based (0, 1, 2...)
   - `{{index(1)}}` - 1-based (1, 2, 3...)
   - `{{index(1, 3)}}` - Zero-padded (001, 002, 003...)
   - `{{index(1, 4)}}` - Django-style (0001, 0002...)
   - `{{index('001')}}` - Format string detection
   - `{{index(1, 3, 100)}}` - With offset (101, 102, 103...)

3. **Timestamp patterns** - `{{timestamp}}` placeholder variations
   - `{{timestamp}}` - ISO 8601 default
   - `{{timestamp('YYYY_MM_DD_HHmmss')}}` - Laravel style
   - `{{timestamp('YYYYMMDDHHmmss')}}` - Rails style

4. **Hybrid patterns** - Combined timestamp + index
   - Laravel + index: `2024_01_15_143022_000001_create_users_table.sql`
   - Date + index: `2024-01-15_001_user.sql`
   - Rails + index: `20240115_001_user.sql`

5. **Flyway naming** - Java/MyBatis migrations
   - `V1__Create_users_table.sql`
   - `V001__Create_users_table.sql`

6. **Data export formats**
   - SQL: `INSERT INTO "user" (...) VALUES (...);`
   - CSV: Column headers + data rows
   - JSON: Array of objects

**How to test:**

```bash
# Generate the Database Schema project
cat > /tmp/build-db-schema.ts << 'EOF'
import { buildProjectFiles } from '/root/scaffolder/src/utils/project-builder/buildProjectFiles.ts';
import convertLocalFilesToIStructure from '/root/scaffolder/src/utils/convertLocalFilesToIStructure.ts';
import { createFolderStructure } from '/root/scaffolder/src/utils/createFolderStructure.ts';
import masterSchemaJson from '/root/scaffolder/files/Schemas/Master Schema with Multiple User Types.json';

const userFiles = convertLocalFilesToIStructure('/root/scaffolder/files');
const result = await buildProjectFiles(
  '/Projects/App Generator - Database Schema/structure.yaml',
  userFiles,
  masterSchemaJson,
  { dbType: 'postgresql', framework: 'Raw SQL' },
  null,
);
createFolderStructure({ structure: result.structure, targetDirectory: '/tmp/db-schema-output' });
EOF

bun /tmp/build-db-schema.ts

# Verify output
find /tmp/db-schema-output -type f | wc -l  # Should be ~166 files

# Validate schema.sql is valid PostgreSQL
docker exec scaffolder-postgresql-1 psql -U scaffolder -d test_db -f /tmp/db-schema-output/schema.sql
```

**Why this matters:**
- `schema.sql` is the **source of truth** for all ORM schemas
- If raw SQL is wrong, Drizzle/Prisma/TypeORM schemas will also be wrong
- Index/timestamp patterns are used across many projects
- Tests FILE_LOOP with complex filename templating

### Test Pyramid

```
                    ┌─────────────────────┐
                    │  hono-react CI      │  ← Ultimate integration test
                    │  (act + api-test.sh)│     Must pass for every PR
                    └─────────────────────┘
                   ┌───────────────────────┐
                   │  Golden Project Tests │  ← Generated output validation
                   │  (src/tests/golden-*) │     622 assertions
                   └───────────────────────┘
                  ┌─────────────────────────┐
                  │  Unit Tests             │  ← Function-level tests
                  │  (src/tests/utils/*)    │     Fast feedback
                  └─────────────────────────┘
```

### Before ANY Refactoring

1. **Run full test suite** - All 622 tests must pass
   ```bash
   bun test --run
   ```

2. **Run hono-react CI locally**
   ```bash
   bun run scripts/generate-golden-apps.ts
   cd /tmp && rm -rf hono-react && cp -r /root/scaffolder/.apps/hono-react .
   cd /tmp/hono-react
   # Set up .env with valid DATABASE_URL
   act -j api-test -P ubuntu-latest=catthehacker/ubuntu:act-latest
   ```

3. **Save golden file snapshots** for comparison
   ```bash
   # Generate and save current output
   bun run scripts/generate-golden-apps.ts
   cp -r .apps/hono-react /tmp/golden-before
   ```

### During Refactoring (EVERY CHANGE)

1. **Run unit tests after each file change**
   ```bash
   bun test --run
   ```

2. **Regenerate and compare output**
   ```bash
   bun run scripts/generate-golden-apps.ts
   diff -r /tmp/golden-before .apps/hono-react
   ```

3. **If output differs, verify it's intentional**
   - New features may add output (OK)
   - Existing output should not change (NOT OK)

### After Refactoring (Before PR)

1. **Full test suite passes**
   ```bash
   bun test --run  # 622 pass, 0 fail
   ```

2. **Lint passes**
   ```bash
   bun lint  # No errors
   ```

3. **hono-react CI passes**
   ```bash
   # Full CI run with act
   act -j api-test -P ubuntu-latest=catthehacker/ubuntu:act-latest
   # Expected: "All tests passed!" with 69 passing tests
   ```

4. **Database Schema project generates correctly**
   ```bash
   # Generate and validate schema.sql
   bun /tmp/build-db-schema.ts
   find /tmp/db-schema-output -type f | wc -l  # Should be ~166 files

   # Optionally validate SQL syntax
   docker exec scaffolder-postgresql-1 psql -U scaffolder -c "DROP DATABASE IF EXISTS schema_test; CREATE DATABASE schema_test;"
   docker exec scaffolder-postgresql-1 psql -U scaffolder -d schema_test -f /tmp/db-schema-output/schema.sql
   ```

5. **Manual smoke test** (optional but recommended)
   ```bash
   cd /tmp/hono-react
   bun install
   bun drizzle-kit push
   bun run api/db/seed.ts
   bun api/index.ts &
   ./api-test.sh
   ```

---

## Feature Preservation Checklist

**Every refactoring PR must verify these features still work:**

### Template DSL Features
- [ ] `<@@>placeholder</@@>` - Basic placeholder replacement
- [ ] `<@@LOOP@@ data="tables">` - Table iteration
- [ ] `<@@LOOP@@ data="columnsInfo">` - Column iteration
- [ ] `<@@LOOP@@ data="compositePrimaryKey">` - Composite key iteration
- [ ] `<@@IF@@ condition="...">` - Conditional rendering
- [ ] `[[COMMAND(...)]]` - Command syntax
- [ ] `$USE_TEMPLATE(...)` - Template inclusion
- [ ] `$USE_CORE(...)` - Core file inclusion
- [ ] `$USE_SCHEMA(...)` - Schema inclusion
- [ ] File-based data sources (`/path/**/*`)
- [ ] Separator attribute (`separator=","`)
- [ ] Filter attribute (`filter="condition"`)

### Project Actions
- [ ] `CREATE_FILE(...)` - Single file creation
- [ ] `FILE_LOOP(...)` - Multi-file generation per table
- [ ] `FOLDER_LOOP(...)` - Dynamic folder creation
- [ ] `LOOP_FOLDERS(...)` - Folder iteration
- [ ] `IMPORT_PROJECT(...)` - Project importing
- [ ] `CREATE_BASE_METHOD_FILE(...)` - Base method generation

### Table Processing
- [ ] Regular tables with single PK
- [ ] Composite primary key tables (pivot/junction tables)
- [ ] Auth tables (user, session, oauth_account)
- [ ] Tables with foreign keys
- [ ] Tables with all column types

### Generated Output Quality
- [ ] Drizzle schema compiles without errors
- [ ] Routes handle all CRUD operations
- [ ] Composite PK routes use correct URL pattern (`/:pk1/:pk2`)
- [ ] API tests pass for all endpoints
- [ ] Seed data generates valid records
- [ ] TypeScript types are correctly generated

### Index & Timestamp Patterns (Database Schema Project)
- [ ] `{{index}}` - 0-based index (0, 1, 2...)
- [ ] `{{index(1)}}` - 1-based index (1, 2, 3...)
- [ ] `{{index(1, 3)}}` - Zero-padded (001, 002, 003...)
- [ ] `{{index(1, 4)}}` - Django-style (0001, 0002...)
- [ ] `{{index('001')}}` - Format string detection
- [ ] `{{index(1, 3, 100)}}` - With offset (101, 102...)
- [ ] `{{timestamp}}` - ISO 8601 format
- [ ] `{{timestamp('YYYY_MM_DD_HHmmss')}}` - Laravel style
- [ ] `{{timestamp('YYYYMMDDHHmmss')}}` - Rails style
- [ ] Hybrid patterns (timestamp + index combined)

### Raw SQL Schema (schema.sql)
- [ ] DROP TABLE statements in correct order (reverse dependency)
- [ ] CREATE TABLE with all column types
- [ ] PRIMARY KEY constraints (single and composite)
- [ ] FOREIGN KEY constraints with proper naming
- [ ] UNIQUE constraints
- [ ] DEFAULT values (NOW(), etc.)
- [ ] NOT NULL constraints
- [ ] VARCHAR with length (VARCHAR(255))
- [ ] TIMESTAMPTZ with precision (TIMESTAMPTZ(6))

### Data Export Formats
- [ ] SQL INSERT statements
- [ ] CSV with headers
- [ ] JSON array of objects
- [ ] Per-table exports
- [ ] Combined exports

### Edge Cases
- [ ] Empty tables (no columns except PK)
- [ ] Tables with only required columns
- [ ] Tables with only optional columns
- [ ] Deeply nested folder structures
- [ ] Circular import detection still works
- [ ] Special characters in table/column names

---

## Success Metrics

### Code Quality
1. **Parameter count:** Average function params < 5 (currently 8-12)
2. **File size:** No file > 400 lines (currently 1068)
3. **Cyclomatic complexity:** No function > 20 (currently >50)
4. **Code duplication:** < 5% duplicated code
5. **Type safety:** Zero `as` assertions in core logic

### Test Coverage
1. **Unit tests:** > 80% coverage for refactored modules
2. **Golden tests:** All 622 assertions pass
3. **Integration:** hono-react CI passes (69 API tests)
4. **Schema generation:** Database Schema project generates ~166 valid files

### Performance (No Regression)
1. **Generation time:** hono-react generates in < 5 seconds
2. **Memory usage:** No significant increase
3. **CI time:** api-test.yml completes in < 3 minutes

---

## Notes for Future Agents

### Do Preserve

- **IBuildContext pattern** - Foundation for eliminating prop drilling
- **contextHelpers.ts functions** - Clean immutable context updates
- **Recursive processing pattern** - Natural YAML structure handling
- **Callback-based tracking** - Non-invasive event tracking
- **Early validation** - Circular dependency detection
- **Type-safe action flags** - `ACTION_FLAGS` const object
- **Triple-nested template pipeline** - Load-bearing, extract but don't remove
- **Composite PK handling** - Recently added, working well
- **hono-react as kitchen sink** - Tests most features

### Do Not

- Add more parameters to existing functions (use context instead)
- Create new god functions (split early)
- Use `as` type assertions (use type guards)
- Use `eslint-disable-next-line` (fix the issue properly)
- Duplicate the template processing pipeline
- Skip tests when refactoring
- Merge without hono-react CI passing
- Change generated output without updating golden tests

### Watch Out For

- The triple-nested loop pattern is load-bearing (don't remove without replacement)
- `replacePlaceholders` and `processCommand` have circular calls (be careful)
- Some regex patterns have subtle differences (test thoroughly)
- Mock data generation affects seed files (test with real DB)
- Composite PK tables need special handling in routes and tests
- Auth tables have special `isAuthResource` flag

### When Adding New Features

1. Add to hono-react structure.yaml if it's a new template feature
2. Add test case to golden project tests
3. Update api-test.sh template if it affects API generation
4. Run full CI before merging

---

## Quick Commands Reference

```bash
# Run all tests
bun test --run

# Run linter
bun lint

# Generate golden apps (hono-react)
bun run scripts/generate-golden-apps.ts

# Run hono-react CI locally
cd /tmp && rm -rf hono-react && cp -r /root/scaffolder/.apps/hono-react .
cd /tmp/hono-react
cat > .env << 'EOF'
DATABASE_URL="postgresql://scaffolder:scaffolder123@localhost:15432/hono_react_test"
NODE_ENV="development"
ACCESS_TOKEN_SECRET="test-access-secret"
REFRESH_TOKEN_SECRET="test-refresh-secret"
EOF
act -j api-test -P ubuntu-latest=catthehacker/ubuntu:act-latest

# Quick API test (after server is running)
./api-test.sh http://localhost:3000/api

# Generate Database Schema project
cat > /tmp/build-db-schema.ts << 'EOF'
import { buildProjectFiles } from '/root/scaffolder/src/utils/project-builder/buildProjectFiles.ts';
import convertLocalFilesToIStructure from '/root/scaffolder/src/utils/convertLocalFilesToIStructure.ts';
import { createFolderStructure } from '/root/scaffolder/src/utils/createFolderStructure.ts';
import masterSchemaJson from '/root/scaffolder/files/Schemas/Master Schema with Multiple User Types.json';
const userFiles = convertLocalFilesToIStructure('/root/scaffolder/files');
const result = await buildProjectFiles(
  '/Projects/App Generator - Database Schema/structure.yaml',
  userFiles, masterSchemaJson, { dbType: 'postgresql', framework: 'Raw SQL' }, null
);
createFolderStructure({ structure: result.structure, targetDirectory: '/tmp/db-schema-output' });
console.log('Generated to /tmp/db-schema-output');
EOF
bun /tmp/build-db-schema.ts
find /tmp/db-schema-output -type f | wc -l  # Should be ~166 files

# Validate schema.sql against real PostgreSQL
docker exec scaffolder-postgresql-1 psql -U scaffolder -d hono_react_test -f /tmp/db-schema-output/schema.sql

# Compare generated output
diff -r /tmp/golden-before .apps/hono-react
```

---

## References

- **Test suite:** `src/tests/`
- **Golden project tests:** `src/tests/golden-projects/`
- **hono-react CI workflow:** `.apps/hono-react/.github/workflows/api-test.yml`
- **API integration test:** `.apps/hono-react/api-test.sh`
- **Kitchen sink #1 (Full-stack):** `files/Projects/hono-react/`
- **Kitchen sink #2 (Schema):** `files/Projects/App Generator - Database Schema/`
- **Core SQL template:** `files/Templates/schema.txt`
- **Master schema:** `files/Schemas/Master Schema with Multiple User Types.json`
- **Type mappings:** `files/Constants/typeMappings.yaml`
