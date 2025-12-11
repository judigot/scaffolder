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

