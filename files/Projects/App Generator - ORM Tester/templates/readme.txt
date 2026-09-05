# ORM Tester

Pre-configured project to test schema parity across multiple ORMs.

## Quick Start

```bash
# 1. Install dependencies (only needed once)
bun install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Create test database
bun run db:create

# 4. Test individual ORMs
bun run test:raw       # Raw SQL (baseline)
bun run test:drizzle   # Drizzle ORM
bun run test:prisma    # Prisma ORM
bun run test:typeorm   # TypeORM
bun run test:mikroorm  # MikroORM

# 5. Compare all results
bun run compare
```

## What Each Test Does

Each `test:*` script:
1. **Cleans the database** - drops all tables
2. **Runs the ORM's migration** - creates tables using that ORM's tooling
3. **Exports the schema** - queries `information_schema` for table/column definitions
4. **Writes result** - saves to `results/<orm>_result.json`

## Available Scripts

| Script | Description |
|--------|-------------|
| `test:raw` | Execute raw SQL schema (baseline reference) |
| `test:drizzle` | Run `drizzle-kit push` |
| `test:prisma` | Run `prisma db push` |
| `test:typeorm` | Run TypeORM synchronize |
| `test:mikroorm` | Run MikroORM schema generator |
| `test:all` | Run all ORM tests sequentially |
| `compare` | Compare all results against raw SQL |
| `db:create` | Create the test database |
| `db:drop` | Drop the test database |

## Project Structure

```
orm-tester/
├── prisma/
│   └── schema.prisma       # Prisma schema
├── src/
│   ├── drizzle/
│   │   └── schema.ts       # Drizzle schema
│   ├── typeorm/
│   │   ├── entities/       # TypeORM entity files
│   │   └── data-source.ts  # TypeORM configuration
│   ├── mikroorm/
│   │   ├── entities/       # MikroORM entity files
│   │   └── config.ts       # MikroORM configuration
│   └── raw/
│       └── schema.sql      # Raw SQL schema
├── scripts/
│   ├── db-utils.ts         # Database utilities
│   ├── test-*.ts           # Individual ORM test scripts
│   └── compare-results.ts  # Schema comparison tool
├── results/
│   └── *_result.json       # Generated schema exports
├── drizzle.config.ts       # Drizzle Kit configuration
└── package.json
```

## Result Format

Each `*_result.json` contains:

```json
{
  "orm": "drizzle",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "orm_tester",
  "tables": [
    {
      "tableName": "user",
      "columns": [
        {
          "column_name": "id",
          "data_type": "bigint",
          "is_nullable": "NO",
          "column_default": "nextval('user_id_seq'::regclass)",
          "character_maximum_length": null
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Database connection fails
- Ensure PostgreSQL is running
- Check credentials in `.env`
- Run `bun run db:create` to create the database

### Prisma fails
- Run `bun run prisma:generate` first

### TypeORM/MikroORM fails
- Ensure `reflect-metadata` is imported (done in test scripts)
