# Placeholder Functions Documentation

This document describes the built-in placeholder functions `index()` and `timestamp()` that can be used in template placeholders for dynamic filename generation and content formatting.

## Overview

Placeholder functions provide dynamic values for filenames and content in project templates. They support both **property-style** access (`{{index}}`) and **function-style** calls (`{{index(1, 3)}}`).

### Available Functions

- **`index()`** - Generate sequential index numbers for ordered file generation
- **`timestamp()`** - Generate formatted date/time strings for timestamped files

## Index Function

The `index()` function generates sequential numbers, useful for creating ordered migration files, numbered backups, or any sequentially indexed files.

### Syntax

```yaml
# Property-style (uses defaults)
{{index}}

# Function-style with parameters
{{index(base, width, offset)}}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `base` | `number` | `0` | Starting index base (0 or 1) |
| `width` | `number \| 'auto' \| undefined` | `undefined` | Zero-padding width. `'auto'` calculates from total count, `undefined` means no padding |
| `offset` | `number` | `0` | Additional offset to add to the index |

### Usage Examples

#### Basic Usage (0-based, no padding)

```yaml
FILE_LOOP({{index}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `0_users.sql`
- `1_posts.sql`
- `2_comments.sql`

#### 1-based Indexing

```yaml
FILE_LOOP({{index(1)}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `1_users.sql`
- `2_posts.sql`
- `3_comments.sql`

#### Zero-padded Indexing

```yaml
FILE_LOOP({{index(1, 3)}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `001_users.sql`
- `002_posts.sql`
- `003_comments.sql`

#### Auto-width Padding

```yaml
FILE_LOOP({{index(1, 'auto')}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output (for 100 tables):**
- `001_users.sql` (3 digits)
- `002_posts.sql`
- ...
- `100_comments.sql` (3 digits)

#### Format String Detection

You can use a format string pattern to specify padding:

```yaml
FILE_LOOP({{index('001')}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `001_users.sql` (1-based, 3-digit padding)
- `002_posts.sql`
- `003_comments.sql`

#### With Offset

```yaml
FILE_LOOP({{index(1, 3, 100)}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `101_users.sql` (1 + 100 = 101)
- `102_posts.sql`
- `103_comments.sql`

### Real-World Use Cases

#### Database Migrations

Generate ordered migration files for database schema changes:

```yaml
migrations:
  FILE_LOOP({{index(1, 4)}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `0001_create_users_table.sql`
- `0002_create_posts_table.sql`
- `0003_create_comments_table.sql`

#### Versioned Backups

Create numbered backup files:

```yaml
backups:
  FILE_LOOP(backup_{{index(1, 3)}}_{{tableName}}.sql --template ./templates/backup.sql.txt):
```

## Timestamp Function

The `timestamp()` function generates formatted date/time strings, useful for creating timestamped migration files, logs, or any time-based file naming.

### Syntax

```yaml
# Property-style (uses ISO 8601 default)
{{timestamp}}

# Function-style with format string
{{timestamp('YYYY-MM-DD')}}
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | `string` | `undefined` | Format string using JavaScript-style tokens. If not provided, returns ISO 8601 format |

### Format Tokens

The format string uses JavaScript-style date formatting tokens:

| Token | Description | Example |
|-------|-------------|---------|
| `YYYY` | 4-digit year | `2024` |
| `YY` | 2-digit year | `24` |
| `MM` | 2-digit month | `01` - `12` |
| `DD` | 2-digit day | `01` - `31` |
| `HH` | 2-digit hour (24-hour) | `00` - `23` |
| `mm` | 2-digit minute | `00` - `59` |
| `ss` | 2-digit second | `00` - `59` |
| `X` | Unix timestamp (seconds) | `1704067200` |
| `x` | Unix timestamp (milliseconds) | `1704067200000` |

### Usage Examples

#### Default ISO 8601 Format

```yaml
FILE_LOOP({{timestamp}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `2024-01-15T12:00:00.000Z_users.sql`
- `2024-01-15T12:00:00.000Z_posts.sql`

#### Laravel-style Timestamp

```yaml
FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableName}}_table.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `2024_01_15_120000_create_users_table.sql`
- `2024_01_15_120000_create_posts_table.sql`

#### Rails-style Timestamp

```yaml
FILE_LOOP({{timestamp('YYYYMMDDHHmmss')}}_create_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `20240115120000_create_users.sql`
- `20240115120000_create_posts.sql`

#### Date Only

```yaml
FILE_LOOP({{timestamp('YYYY-MM-DD')}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `2024-01-15_users.sql`
- `2024-01-15_posts.sql`

#### Custom Format

```yaml
FILE_LOOP({{timestamp('YYYY-MM-DD HH:mm:ss')}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `2024-01-15 12:00:00_users.sql`
- `2024-01-15 12:00:00_posts.sql`

### Real-World Use Cases

#### Framework Migration Files

**Laravel:**
```yaml
FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNamePlural}}_table.php --template ./templates/migration.php.txt):
```

**Rails:**
```yaml
FILE_LOOP({{timestamp('YYYYMMDDHHmmss')}}_create_{{tableName}}.rb --template ./templates/migration.rb.txt):
```

**Django:**
```yaml
FILE_LOOP({{timestamp('YYYYMMDDHHmmss')}}_{{index('0001')}}_{{tableName}}.py --template ./templates/migration.py.txt):
```

## Combining Functions

You can combine `index()` and `timestamp()` in the same filename:

### Timestamp + Index

```yaml
FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_{{index(1, 6)}}_create_{{tableName}}_table.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `2024_01_15_120000_000001_create_users_table.sql`
- `2024_01_15_120000_000002_create_posts_table.sql`

### Date + Index

```yaml
FILE_LOOP({{timestamp('YYYY-MM-DD')}}_{{index(1, 3)}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Output:**
- `2024-01-15_001_users.sql`
- `2024-01-15_002_posts.sql`

## Filename Sanitization

### Enterprise-Grade Cross-Platform Compatibility

All generated filenames are automatically sanitized using enterprise-grade validation to ensure compatibility across Windows, Linux, and macOS filesystems. This protects against security vulnerabilities and filesystem errors.

### Security Features

#### Invalid Character Handling

- **Colons (`:`)** → Replaced with hyphens (`-`) - Common in ISO 8601 timestamps
- **Other invalid characters** (`<`, `>`, `"`, `|`, `?`, `*`, `/`, `\`) → Removed
- **Control characters** (0x00-0x1F, 0x80-0x9F) → Removed to prevent injection attacks

#### Reserved Filename Protection

Windows reserved filenames are automatically prefixed with underscore:
- **Device names**: `CON`, `PRN`, `AUX`, `NUL`
- **Serial ports**: `COM1` through `COM9`
- **Parallel ports**: `LPT1` through `LPT9`

Case-insensitive matching ensures protection regardless of capitalization.

#### Edge Case Handling

- **Trailing periods/spaces** → Removed (invalid on Windows)
- **Leading periods/spaces** → Removed
- **Multiple consecutive dots** → Collapsed to single dot
- **Empty filenames** → Defaults to `file`
- **Length limits** → Truncated to 255 characters (preserving extension)

### Example

When using the default ISO 8601 timestamp format:

```yaml
FILE_LOOP({{timestamp}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
```

**Generated filename (before sanitization):**
- `2026-01-01T17:45:31.646Z_product.sql` ❌ (contains colons, invalid on Windows)

**Generated filename (after sanitization):**
- `2026-01-01T17-45-31.646Z_product.sql` ✅ (colons replaced with hyphens)

### Custom Format Recommendations

To avoid sanitization, use formats that don't include colons:

```yaml
# ✅ Good - No colons
FILE_LOOP({{timestamp('YYYY-MM-DD-HHmmss')}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
# Output: 2026-01-01-174531_product.sql

# ✅ Good - Underscores instead of colons
FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
# Output: 2026_01_01_174531_product.sql

# ⚠️ Will be sanitized - Contains colons
FILE_LOOP({{timestamp('YYYY-MM-DD HH:mm:ss')}}_{{tableName}}.sql --template ./templates/migration.sql.txt):
# Output: 2026-01-01 17-45-31_product.sql (colons replaced)
```

### Security Considerations

The sanitization function protects against:

1. **Path Traversal**: Invalid path separators (`/`, `\`) are removed
2. **Control Character Injection**: Non-printable characters are stripped
3. **Reserved Name Conflicts**: Windows device names are prefixed
4. **Filesystem Limits**: Filenames are truncated to safe lengths
5. **Empty/Invalid Names**: Fallback to safe default names

This ensures that user-generated filenames (including from `USE_USER_ENV` and `USE_FORM_DATA`) cannot cause filesystem errors or security vulnerabilities.

## Security Considerations

### Input Sanitization

Both functions include built-in security measures to prevent script injection:

1. **Character Filtering**: Only allows alphanumeric characters, spaces, and safe punctuation (`-`, `_`, `.`, `:`)
2. **Keyword Removal**: Removes JavaScript-related keywords that could be used in eval/Function contexts
3. **Format Validation**: Ensures format strings only contain valid tokens

### Safe Usage

Format strings are parsed by JavaScript (not SQL), so:
- SQL keywords are **not** filtered (they're not a security concern)
- JavaScript keywords are filtered as a defense-in-depth measure
- Format strings are only used for string replacement, never code execution

### Example of Sanitization

```yaml
# Malicious input
{{timestamp("YYYY-MM-DD'; DROP TABLE users; --")}}

# After sanitization
# Semicolons and quotes are removed, but SQL keywords remain (harmless)
# Result: "2024-01-15 DROP TABLE users --"
```

## Integration with FILE_LOOP

The placeholder functions work seamlessly with the `FILE_LOOP` action to generate multiple files:

```yaml
migrations:
  indexed:
    FILE_LOOP({{index(1, 4)}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml):
  
  timestamped:
    FILE_LOOP({{timestamp('YYYY_MM_DD_HHmmss')}}_create_{{tableNameSnakeCasePlural}}_table.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml):
  
  hybrid:
    FILE_LOOP({{timestamp('YYYY-MM-DD')}}_{{index(1, 3)}}_{{tableNameSnakeCaseSingular}}.sql --template ./templates/migration.sql.txt --data-source=/Constants/typeMappings.yaml):
```

## Available Properties

In addition to function calls, you can access these properties directly:

### Index Properties

- `{{index}}` - Current table index (0-based, no padding)
- `{{tableIndex}}` - Same as `{{index}}`
- `{{tableIndexZeroPadded}}` - Zero-padded index (auto-width)
- `{{tableIndexOneBased}}` - 1-based index
- `{{tableIndexOneBasedZeroPadded}}` - 1-based, zero-padded (auto-width)
- `{{totalTables}}` - Total number of tables

### Timestamp Properties

- `{{timestamp}}` - ISO 8601 formatted timestamp

## Common Format Presets

For reference, here are common format patterns used by popular frameworks:

| Framework | Format Pattern | Example Output |
|-----------|---------------|----------------|
| Laravel | `YYYY_MM_DD_HHmmss` | `2024_01_15_120000` |
| Rails | `YYYYMMDDHHmmss` | `20240115120000` |
| Django | `YYYYMMDDHHmmss` | `20240115120000` |
| ISO 8601 | `YYYY-MM-DDTHH:mm:ss.sssZ` | `2024-01-15T12:00:00.000Z` |
| Date Only | `YYYY-MM-DD` | `2024-01-15` |
| Date Time | `YYYY-MM-DD HH:mm:ss` | `2024-01-15 12:00:00` |

## Best Practices

1. **Use appropriate padding**: For large file sets, use `'auto'` width or explicit padding to ensure proper sorting
2. **Choose consistent formats**: Stick to one timestamp format per project for consistency
3. **Combine when needed**: Use timestamp + index for unique, ordered filenames
4. **Consider file system limits**: Some file systems have filename length limits
5. **Test with your data**: Verify output with your actual table/schema count

## Troubleshooting

### Index starts at wrong number

- Check the `base` parameter: `{{index(0)}}` vs `{{index(1)}}`
- Verify `offset` parameter if used

### Padding not working

- Ensure `width` is specified: `{{index(1, 3)}}` not `{{index(1)}}`
- Use `'auto'` for automatic width calculation

### Timestamp format not working

- Verify format tokens are correct (e.g., `YYYY` not `yyyy`)
- Check that format string uses supported tokens only
- Ensure quotes are properly escaped in YAML

### Files not in order

- Use zero-padding for proper lexicographic sorting
- Consider using timestamp for time-based ordering
- Combine timestamp + index for both uniqueness and ordering

## Related Documentation

- [FILE_LOOP Action](./README.md#file_loop) - Generate multiple files from schema tables
- [Template Commands](./README.md#template-commands) - Other template syntax
- [Project Actions](./README.md#project-actions) - Available project builder actions

