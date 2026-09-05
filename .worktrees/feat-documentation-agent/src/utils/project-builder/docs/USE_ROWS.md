# USE_ROWS Template Command Guide

## Overview
The `USE_ROWS` command generates database row data (seed data + sample data) in various formats. It combines user-defined seed data (priority) with auto-generated sample data (fallback), ensuring foreign key integrity. Perfect for database migrations, seed files, testing fixtures, and data exports.

## Terminology

- **Seed Data**: User-defined, intentional data (e.g., reference data like user roles, status types). Industry-standard term used by Rails, Laravel, Django, and other frameworks.
- **Sample Data**: Auto-generated, realistic fake data used when seed data is not available. Also known as "generated data" or "test data" in some contexts.

## Syntax

```
[[USE_ROWS(parameters)]]
```

### Parameters

All parameters are optional and comma-separated:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tableName` | string | Current table context | Specific table to output. If omitted, uses current table context (in `FILE_LOOP`) or all tables (in `CREATE_FILE`) |
| `format` | `sql` \| `csv` \| `json` | `sql` | Output format |
| `rows` | number | All rows | Limit number of rows to output |
| `offset` | number | `0` | Skip first N rows (pagination) |
| `delimiter` | string | `,` | CSV delimiter (supports escape sequences: `\t`, `\n`, `\,`) |
| `includeHeaders` | boolean | `true` | Include column headers in CSV output |
| `pretty` | boolean | `false` | Pretty-print JSON with indentation |

## How It Works

1. **Data Source**: Uses row data from `useTransformationsStore`, which already has:
   - Seed data merged (seed data takes priority over sample data)
   - Foreign key references fixed to point to valid seed data IDs
   - Tables ordered by dependency (parent tables before child tables)

2. **Table Selection**:
   - **With `tableName`**: Outputs only the specified table
   - **Without `tableName` in `FILE_LOOP`**: Uses current table context
   - **Without `tableName` in `CREATE_FILE`**: Outputs all tables in dependency order

3. **Formatting**: Converts the selected data to the requested format (SQL, CSV, or JSON)

## Use Cases

### 1. Migration Files with Seed Data

Include seed data directly in migration files:

**Template**: `migration.sql.txt`
```sql
DROP TABLE IF EXISTS "{{tableName}}";

CREATE TABLE "{{tableName}}" (
  -- table definition
);

[[USE_ROWS()]]
```

**Output**: Creates table and inserts seed/mock data for the current table in the migration file.

### 2. All-Tables Seed Data Files

Generate comprehensive seed data files for all tables:

**Template**: `seed-data.sql.txt`
```sql
-- Seed data for all tables
-- Generated seed data in dependency order (parent tables before child tables)

[[USE_ROWS()]]
```

**Output**: SQL INSERT statements for all tables, ordered by foreign key dependencies.

### 3. Per-Table Seed Data Files

Generate separate seed files for each table:

**Template**: `table-seed.sql.txt`
```sql
-- Seed data for {{tableName}}
-- This file contains seed data for a single table

[[USE_ROWS(tableName={{tableName}})]]
```

**Output**: SQL INSERT statements for the specified table only.

### 4. CSV Export for Data Import Tools

Export data in CSV format for Excel, analytics, or data import tools:

**Template**: `seed-data.csv.txt`
```csv
-- Seed data export in CSV format
-- Suitable for data import tools, Excel, and analytics

[[USE_ROWS(format=csv)]]
```

**Output**: CSV format with table names as section headers, column headers, and data rows.

### 5. JSON Export for API Fixtures

Export data in JSON format for testing, API fixtures, or programmatic use:

**Template**: `seed-data.json.txt`
```json
// Seed data export in JSON format
// Suitable for API fixtures, testing, and programmatic use

[[USE_ROWS(format=json, pretty=true)]]
```

**Output**: Pretty-printed JSON with all tables and their rows.

### 6. Pagination for Large Datasets

Limit the number of rows or skip rows for pagination:

**Template**: `seed-data-limited.sql.txt`
```sql
-- First 10 rows only
[[USE_ROWS(rows=10)]]

-- Skip first 5 rows, then get next 10
[[USE_ROWS(rows=10, offset=5)]]
```

**Output**: Limited number of rows based on pagination parameters.

### 7. Custom CSV Delimiters

Use custom delimiters for CSV export (e.g., tab-separated, semicolon-separated):

**Template**: `seed-data.tsv.txt`
```csv
-- Tab-separated values
[[USE_ROWS(format=csv, delimiter=\t)]]

-- Semicolon-separated values
[[USE_ROWS(format=csv, delimiter=;)]]
```

**Output**: CSV with custom delimiter.

### 8. CSV Without Headers

Generate CSV without column headers for data-only exports:

**Template**: `seed-data-no-headers.csv.txt`
```csv
-- Data only, no headers
[[USE_ROWS(format=csv, includeHeaders=false)]]
```

**Output**: CSV with only data rows, no table names or column headers.

## Examples

### Example 1: Basic SQL Output

**Template**:
```
[[USE_ROWS()]]
```

**Output**:
```sql
INSERT INTO
  "users" (user_id, email, name)
VALUES
  (1, 'admin@example.com', 'Admin User'),
  (2, 'demo@example.com', 'Demo User');
```

### Example 2: Specific Table with Format

**Template**:
```
[[USE_ROWS(tableName=users, format=json, pretty=true)]]
```

**Output**:
```json
{
  "users": [
    {
      "user_id": 1,
      "email": "admin@example.com",
      "name": "Admin User"
    },
    {
      "user_id": 2,
      "email": "demo@example.com",
      "name": "Demo User"
    }
  ]
}
```

### Example 3: CSV Export

**Template**:
```
[[USE_ROWS(format=csv)]]
```

**Output**:
```csv
users
user_id,email,name
1,admin@example.com,Admin User
2,demo@example.com,Demo User

posts
post_id,user_id,title,content
1,1,First Post,Hello World
2,1,Second Post,Another post
```

### Example 4: Pagination

**Template**:
```
[[USE_ROWS(tableName=users, rows=5, offset=10)]]
```

**Output**: SQL INSERT with rows 11-15 from the `users` table.

### Example 5: Custom CSV Delimiter

**Template**:
```
[[USE_ROWS(format=csv, delimiter=;)]]
```

**Output**: CSV with semicolon delimiter instead of comma.

## Data Priority and Foreign Key Handling

### Seed Data Priority

1. **Seed data** (from `schemaInfo[].data`) takes priority - user-defined, intentional data
2. **Sample data** (auto-generated) is used as fallback when no seed data exists - realistic fake data for development/testing
3. **FK references** in sample data are automatically fixed to reference valid seed data IDs

### Example Scenario

**Schema**:
- `user_types` has seed data: `[{id: 1, name: 'admin'}, {id: 2, name: 'user'}]`
- `users` has no seed data (uses sample data) with FK to `user_types`

**Result**:
- `user_types` output: Uses seed data (id: 1, 2)
- `users` output: Uses sample data, but `user_type_id` values are fixed to reference only seed data IDs (1 or 2)

This ensures foreign key integrity when mixing seed and sample data.

## Context Modes

### 1. Single Table Mode
```
[[USE_ROWS(tableName=users)]]
```
Outputs only the `users` table.

### 2. Current Table Context Mode
In a `FILE_LOOP` without `tableName`:
```
[[USE_ROWS()]]
```
Outputs the current table being processed in the loop.

### 3. All Tables Mode
In a `CREATE_FILE` without `tableName`:
```
[[USE_ROWS()]]
```
Outputs all tables in dependency order (parent tables before child tables).

## Format Details

### SQL Format (Default)
- Generates standard SQL INSERT statements
- Multiple rows per INSERT statement
- Properly escapes string values
- Handles NULL values correctly

### CSV Format
- Table name as section header
- Column headers (if `includeHeaders=true`)
- Properly escapes values containing delimiters, quotes, or newlines
- Empty string for NULL values
- Supports custom delimiters

### JSON Format
- Standard JSON object with table names as keys
- Arrays of row objects
- Pretty-printed when `pretty=true`
- `null` for NULL values

## Best Practices

1. **Use in Migration Files**: Include `[[USE_ROWS()]]` at the end of migration templates to seed tables during migration
2. **Separate Seed Files**: Use per-table seed files for better organization and selective seeding
3. **Format Selection**: Choose format based on use case:
   - SQL for database migrations
   - CSV for data import/export tools
   - JSON for API fixtures and testing
4. **Pagination**: Use `rows` and `offset` for large datasets to generate manageable file sizes
5. **Dependency Order**: When generating all tables, the system automatically orders by dependencies, so parent tables are inserted before child tables

## Related Commands

- `USE_DATA`: Access data from YAML files
- `USE_FORM_DATA`: Access form data
- `USE_TEMPLATE`: Include other templates
- `LOOP`: Iterate over schema data

## See Also

- [Project Builder Documentation](../README.md)
- [USE_DATA Command Guide](./USE_DATA.md)

