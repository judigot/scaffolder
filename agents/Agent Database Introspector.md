# Agent Database Introspector - Context Guide

This document provides essential context about the database introspection system for AI agents working on this codebase.

## Overview

The database introspection system connects to PostgreSQL or MySQL databases, extracts schema information (tables, columns, constraints, views), and converts it into a structured format (`ISchemaInfo[]`) that can be used throughout the application for code generation, schema visualization, and project scaffolding.

## Core Architecture

### Main Entry Point
- **`introspect.ts`**: Main function that orchestrates the introspection process
  - Takes a database connection string and database type (`postgresql` or `mysql`)
  - Reads the appropriate SQL introspection query file
  - Executes the query against the database
  - Filters out ignored tables (e.g., Laravel migration tables)
  - Returns raw introspection results as `IIntrospectedSchemaInfo[]`

### Data Flow

1. **Connection** → User provides database connection string and type
2. **Query Execution** → System reads and executes database-specific SQL query
3. **Raw Results** → Returns `IIntrospectedSchemaInfo[]` with snake_case properties
4. **Conversion** → `convertIntrospectedStructure()` transforms to `ISchemaInfo[]` with camelCase
5. **Enrichment** → `addSchemaInfo()` adds relationship information (hasOne, hasMany, etc.)
6. **Usage** → Converted schema info is used in UI, code generation, and project building

## Key Components

### 1. Introspection Queries (`src/introspect_*.sql`)

Database-specific SQL queries that extract schema information:

- **`introspect_postgresql.sql`**: PostgreSQL introspection query
  - Uses `information_schema` and `pg_class` system catalogs
  - Extracts: columns, primary keys, foreign keys, unique constraints, check constraints
  - **View Support**: Detects views using `relkind = 'v'`, extracts view definitions with `pg_get_viewdef()`, and identifies referenced tables using `information_schema.view_table_usage`
  - Returns JSON structure with all table metadata

- **`introspect_mysql.sql`**: MySQL introspection query (similar structure)

**Key Features:**
- Detects both regular tables (`relkind = 'r'`) and views (`relkind = 'v'`)
- Extracts view SQL definitions
- Identifies tables referenced by views
- Handles composite unique constraints
- Supports check constraints

### 2. Conversion Layer (`convertIntrospectedStructure.ts`)

Transforms raw database introspection results into application-friendly format:

#### Functions

- **`convertTable()`**: Converts a single `IIntrospectedSchemaInfo` to `ISchemaInfo`
  - Maps snake_case to camelCase
  - Converts data types using type mappings
  - Extracts required columns, foreign tables, and foreign keys
  - Handles view information (viewQuery, viewStructure)

- **`convertColumn()`**: Converts column information
  - Maps database types to TypeScript types
  - Handles default values (removes PostgreSQL type casts)
  - Preserves primary keys, unique constraints, and foreign keys

- **`getTypeScriptType()`**: Maps database types to TypeScript types
  - Uses type mappings from `useMockDatabaseStore`
  - Supports both core and custom type mappings
  - Handles PostgreSQL and MySQL introspected types

- **`getRequiredColumns()`**: Extracts non-nullable columns
- **`getForeignTables()`**: Extracts unique foreign table references
- **`getForeignKeys()`**: Extracts column names that are foreign keys

### 3. Schema Enrichment (`identifySchema.ts`)

The `addSchemaInfo()` function (imported but not defined in conversion file) enriches schema info with:
- Relationship detection (hasOne, hasMany, belongsTo, belongsToMany)
- Pivot table identification
- Child table relationships

## Interface Definitions

### IIntrospectedSchemaInfo (Raw Database Result)

Raw result from database query with snake_case properties:

```typescript
interface IIntrospectedSchemaInfo {
  table_name: string;
  view_query?: string | null;           // SQL definition for views
  view_structure?: string[] | null;     // Tables referenced by view
  columns: IColumnInfo[];
  check_constraints: string[] | null;
  composite_unique_constraints: string[] | null;
}
```

### ISchemaInfo (Converted Application Format)

Application-friendly format with camelCase properties:

```typescript
interface ISchemaInfo extends ITableInfo {
  tableName: string;
  viewQuery?: string;                   // View SQL definition (if view)
  viewStructure?: string[];             // Referenced tables (if view)
  columnsInfo: IColumnInfo[];
  requiredColumns?: string[];
  foreignKeys?: string[];
  // ... relationship fields from ITableInfo
}
```

### IColumnInfo

Column information structure:

```typescript
interface IColumnInfo {
  column_name: string;                  // snake_case from DB
  data_type: string;                    // TypeScript type after conversion
  is_nullable: string;                  // 'YES' or 'NO'
  column_default?: string | null;
  primary_key?: true;
  unique?: true;
  foreign_key?: {
    foreign_table_name: string;
    foreign_column_name: string;
  };
}
```

## View Support

The system fully supports database views:

### Detection
- Views are detected using PostgreSQL's `relkind = 'v'` in `pg_class`
- MySQL uses `table_type = 'VIEW'` in `information_schema.tables`

### View Information Extracted
1. **`viewQuery`**: The complete SQL definition of the view (from `pg_get_viewdef()`)
2. **`viewStructure`**: Array of table names that the view references (from `information_schema.view_table_usage`)

### View Handling
- Views are included in introspection results
- View query is stored as-is (not parsed or modified)
- Referenced tables are identified for dependency tracking
- Views are displayed separately in the UI (not mixed with regular tables)
- View tables show only the query, not columns/relationships

## Database Support

### PostgreSQL
- Uses `information_schema` and `pg_class` system catalogs
- Supports views via `pg_get_viewdef()` and `information_schema.view_table_usage`
- Handles PostgreSQL-specific type casting in defaults

### MySQL
- Uses `information_schema` tables
- Query uses `$DB_NAME` placeholder that gets replaced with actual database name
- Similar structure to PostgreSQL query

## Type Conversion

### Database Type → TypeScript Type Mapping

The system uses type mappings from `useMockDatabaseStore`:

1. **Direct mapping**: If database type exists in mappings, use its TypeScript type
2. **Introspected type matching**: Check `postgresql-introspected` or `mysql-introspected` arrays
3. **Fallback**: Default to `'string'` if no mapping found

### Example Type Conversions
- `varchar`, `text` → `'string'`
- `integer`, `bigint` → `'number'`
- `boolean` → `'boolean'`
- `timestamp`, `date` → `'Date'`

## Filtering

### Ignored Tables
- Tables in `IGNORED_TABLES_LARAVEL` constant are filtered out
- Typically includes system tables like `migrations`, `flyway_schema_history`

## Key Files

1. **`introspect.ts`**: Main entry point, handles database connection and query execution
2. **`introspect_postgresql.sql`**: PostgreSQL-specific introspection query
3. **`convertIntrospectedStructure.ts`**: Converts raw DB results to application format
4. **`interfaces/interfaces.ts`**: Type definitions for all schema structures
5. **`identifySchema.ts`**: Adds relationship information (imported but not in this file)

## Common Patterns

### Adding Support for a New Database Type

1. Create `introspect_<dbtype>.sql` file with appropriate query
2. Add database type to `DBTypes` union type
3. Add execution logic in `introspect.ts`
4. Update type conversion logic if needed

### Modifying Introspection Query

1. Update SQL query in `introspect_postgresql.sql` or `introspect_mysql.sql`
2. Ensure returned structure matches `IIntrospectedSchemaInfo` interface
3. Update conversion logic in `convertIntrospectedStructure.ts` if structure changes
4. Test with actual database to verify results

### Adding New Column Properties

1. Update SQL query to extract new property
2. Add property to `IIntrospectedSchemaInfo` interface (snake_case)
3. Add property to `IColumnInfo` or `ISchemaInfo` interface (camelCase)
4. Update `convertTable()` or `convertColumn()` to map the property
5. Update UI components if needed

### Handling View-Specific Logic

Views are identified by the presence of `viewQuery`:
- Check: `table.viewQuery !== undefined`
- Views should not have editable columns/relationships
- View query is displayed as read-only SQL
- Referenced tables shown for dependency tracking

## Error Handling

- Missing connection string throws error
- Unsupported database type throws error
- Invalid table structure throws error during conversion
- Type guards (`isITable`, `isITableArray`) validate structure

## Testing Considerations

- Test with real database connections
- Verify view detection works correctly
- Test type conversion for various database types
- Verify foreign key relationships are extracted correctly
- Test with tables that have no relationships (standalone tables)
- Test with pivot tables
- Verify ignored tables are filtered correctly

## Recent Changes

### View Support Implementation
- Added `viewQuery` and `viewStructure` to introspection results
- Updated PostgreSQL query to detect views and extract view definitions
- Added view dependency tracking using `information_schema.view_table_usage`
- Updated conversion logic to map view information
- Modified UI to display views separately and show only query for views

### Type Safety Improvements
- Updated type guards to handle view properties
- Added explicit null/undefined checks for viewQuery (strict boolean expressions)
- Ensured all optional properties are properly handled

## Introspection Test Flow

### Overview
Tests verify that database schema creation and introspection work correctly through a round-trip process.

### Main Test Flow

1. TEST SETUP (beforeAll/beforeEach)
   - setupTypeMappings() - Load type maps and configure stores

2. TEST EXECUTION (it block)
   - Input: masterSchema (ISchemaInfo[]) containing table definitions

3. createAndIntrospectDatabase()
   - Step 1: Setup Form Store
     * Set dbConnection
     * Set dbType (postgresql/mysql)
     * Set quote character (" or `)
   
   - Step 2: Generate SQL Schema
     * generateSQLDeleteTables() → DROP TABLE IF EXISTS statements
     * generateSQLSchema() → CREATE TABLE statements with FOREIGN KEY constraints
     * formatSQL() → Format SQL for readability
   
   - Step 3: Clean Database (Clean Slate)
     * PostgreSQL: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
     * MySQL: SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS all_tables; SET FOREIGN_KEY_CHECKS = 1;
   
   - Step 4: Execute SQL
     * executePostgreSQL() or executeMySQL()
     * Creates tables in database
     * Applies constraints (PK, FK, unique, etc.)
   
   - Step 5: Introspect Database
     * introspect(dbConnection, dbType)
     * Reads introspect_postgresql.sql or introspect_mysql.sql
     * Executes introspection query
     * Returns IIntrospectedSchemaInfo[] (raw snake_case format)
   
   - Step 6: Convert to ISchemaInfo
     * convertIntrospectedStructure()
       - convertTable() for each table
         * Maps snake_case → camelCase
         * Converts data types
         * Normalizes AUTO_INCREMENT
       - addSchemaInfo()
         * Detects relationships
         * Adds hasOne, hasMany, belongsTo, belongsToMany
         * Identifies pivot tables
     * Returns ISchemaInfo[]
   
   - Step 7: Normalize Both Schemas
     * normalizeSchema(originalSchema)
     * normalizeSchema(introspectedSchema)
     * Normalization includes:
       - Sort all arrays (foreignKeys, requiredColumns, etc.)
       - Normalize AUTO_INCREMENT defaults
       - Handle undefined vs missing properties
       - Sort tables alphabetically
   
   - Step 8: Compare Schemas
     * expect(normalizedIntrospected).toEqual(normalizedOriginal)
     * Verifies:
       - Exact match of all fields
       - Primary keys correctly identified
       - Relationships preserved
       - Column types match
       - Constraints match

### Schema Generation Flow

masterSchema (ISchemaInfo[])
  → generateSQLDeleteTables() → ["DROP TABLE IF EXISTS table1;", ...]
  → generateSQLSchema()
      → For each table:
          → generateColumnDefinition() → Maps TypeScript types → SQL types
          → generateForeignKeyConstraint() → Creates FK constraints
      → formatSQL() → Formats SQL for readability
  → Combined SQL: DROP statements + CREATE statements

### Introspection Flow

Database (PostgreSQL/MySQL)
  → introspect()
      → Reads introspect_*.sql file
      → Executes query against information_schema
      → Returns IIntrospectedSchemaInfo[] (snake_case, raw DB types)
  
  → convertIntrospectedStructure()
      → convertTable() for each table
          → convertColumn()
              → getTypeScriptType() → Maps DB types → TS types
              → Normalizes AUTO_INCREMENT
          → getRequiredColumns()
          → getForeignTables()
          → getForeignKeys()
      
      → addSchemaInfo()
          → addAssociations()
              → Detects hasOne/hasMany
              → Detects belongsTo
              → Detects belongsToMany
          → linkChildTables()
          → identifyPivotTables()
          → addParentRelationships()
  
  → ISchemaInfo[] (camelCase, enriched)

### Normalization Flow

ISchemaInfo[]
  → normalizeSchema()
      → Sort tables by tableName
      → For each table:
          → normalizeTable()
              → Sort arrays:
                  → requiredColumns
                  → foreignKeys
                  → foreignTables
                  → childTables
                  → hasOne
                  → hasMany
                  → belongsTo
                  → belongsToMany
                  → pivotRelationships
              → normalizeColumns()
                  → Sort columns by column_name
                  → normalizeColumn()
                      → Normalize AUTO_INCREMENT (nextval(...) → AUTO_INCREMENT)
          → Handle optional fields (undefined vs missing)
  → Normalized ISchemaInfo[] (deterministic)

### Test Scenarios

#### Test 1: Exact Schema Match
Input: masterSchema
  → Create DB → Introspect → Normalize
  → Compare: normalizedIntrospected === normalizedOriginal
  → Result: All fields match exactly

#### Test 2: Primary Key Identification
Input: masterSchema
  → Create DB → Introspect
  → For each table:
      - Find primary key column
      - Verify column_name matches original
      - Verify primary_key flag is true
      - Verify AUTO_INCREMENT normalized
  → Result: Primary keys correctly identified

#### Test 3: Relationship Preservation
Input: masterSchema
  → Create DB → Introspect → Normalize
  → For each table:
      - Compare hasOne arrays
      - Compare hasMany arrays
      - Compare belongsTo arrays
      - Compare belongsToMany arrays
      - Compare pivotRelationships
  → Result: All relationships preserved

#### Test 4: "id" Primary Key Test
Input: masterSchemaWithId (uses "id" instead of "tableName_id")
  → Create DB → Introspect → Normalize
  → Verify:
      - Primary key column is "id" (not "tableName_id")
      - Relationships still work correctly
      - Exact match with original schema
  → Result: "id" primary keys work correctly

### Key Test Functions

#### createAndIntrospectDatabase()
Purpose: Complete round-trip test helper
1. Takes ISchemaInfo[] as input
2. Generates SQL
3. Creates database tables
4. Introspects database
5. Returns ISchemaInfo[] from introspection

#### normalizeSchema()
Purpose: Make schemas comparable
- Sorts all arrays
- Normalizes defaults (AUTO_INCREMENT)
- Handles optional fields consistently
- Ensures deterministic comparison

#### Comparison Strategy
- Exact match: All fields must match
- Deterministic: Normalization ensures consistent ordering
- Comprehensive: Tests all relationship types and constraints

### Database Cleanup Strategy

#### PostgreSQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
- Drops entire schema (all tables, views, sequences, etc.)
- Creates fresh schema
- Ensures completely clean slate

#### MySQL
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS all_tables;
SET FOREIGN_KEY_CHECKS = 1;
- Disables FK checks temporarily
- Drops all tables
- Re-enables FK checks
- Ensures clean slate without dropping database

### Round-Trip Verification

masterSchema → SQL → Database → Introspect → ISchemaInfo → Compare → masterSchema

Each step must work correctly for the test to pass.

### Why This Testing Approach?

1. Round-trip testing: Verifies the entire pipeline works
2. Deterministic: Normalization ensures consistent results
3. Comprehensive: Tests all aspects (PKs, FKs, relationships)
4. Clean slate: Each test starts fresh
5. Enterprise-grade: Catches edge cases and ensures reliability
