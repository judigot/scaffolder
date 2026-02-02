# Schemas Directory

Framework-agnostic schema definitions for the scaffolder.

## Structure

```
Schemas/
├── Auth/                    # Authentication module schemas
│   ├── base.json           # user + session (required)
│   ├── oauth.json          # OAuth provider accounts
│   ├── otp.json            # One-time password codes
│   ├── mfa.json            # Multi-factor authentication
│   └── README.md           # Auth module documentation
├── Presets/                 # Pre-configured schema combinations
│   ├── Auth - Basic.json   # Email/password only
│   ├── Auth - Social.json  # + OAuth providers
│   ├── Auth - Verified.json # + OTP verification
│   ├── Auth - Enterprise.json # + MFA
│   ├── Auth - Full.json    # All features
│   └── README.md           # Preset documentation
└── schema-definition.json  # JSON Schema for validation
```

## Usage in structure.yaml

### Use a Preset

```yaml
$USE_SCHEMA:
  - /Schemas/Presets/Auth - Social
```

### Compose Modules

```yaml
$USE_SCHEMA:
  - /Schemas/Auth/base
  - /Schemas/Auth/oauth
  - /Schemas/Auth/mfa
```

## Schema Format

Each schema module is a JSON file with:

```json
{
  "name": "module-name",
  "description": "What this module provides",
  "version": "1.0.0",
  "requires": ["other-module"],
  "tables": {
    "tableName": {
      "description": "Table description",
      "columns": {
        "columnName": {
          "type": "uuid|varchar|text|boolean|timestamp|...",
          "primary": true,
          "nullable": false,
          "unique": true,
          "default": "expression",
          "references": {
            "table": "otherTable",
            "column": "id",
            "onDelete": "CASCADE"
          }
        }
      },
      "indexes": [
        { "columns": ["col1", "col2"], "unique": true }
      ]
    }
  }
}
```

## Accessing Schema in Templates

The loaded schema is available in the build context as `authSchema`:

```typescript
// In template processing
if (ctx.authSchema) {
  const tables = ctx.authSchema.tables;
  const features = ctx.authSchema.features;
  const modules = ctx.authSchema.modules;
}
```

## Adding New Schemas

1. Create a new JSON file in the appropriate directory
2. Follow the schema-definition.json format
3. Add `requires` for dependencies
4. Add to a preset if it's a common combination

## Type Mappings

| Schema Type | PostgreSQL | MySQL | SQLite |
|-------------|-----------|-------|--------|
| uuid | uuid | varchar(36) | text |
| varchar | varchar(n) | varchar(n) | text |
| text | text | text | text |
| boolean | boolean | tinyint(1) | integer |
| timestamp | timestamp | datetime | text |
| integer | integer | int | integer |
| bigint | bigint | bigint | integer |
| json | jsonb | json | text |
