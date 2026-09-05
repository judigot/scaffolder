# Drizzle data core for `apps/api`

Path-aware Drizzle overlay for Bun Turborepo apps whose HTTP package lives at
`apps/api` (`@bigbang/api`).

This core is **not** a replacement for `/Core/drizzle-data`. That core still
targets repo-root `api/db` for Hono apps such as `hono-react`. Do not compose
both in the same project.

## Layout

```text
apps/api/drizzle.config.ts
apps/api/src/db/index.ts
apps/api/package.json          # drizzle-orm, postgres, drizzle-kit (merged)
apps/api/.env.example          # DATABASE_URL plus the Nest HTTP env contract
```

Schema and seed files are **not** in this core. Generate them with the project's
`CREATE_FILE` templates so they stay schema-driven:

```yaml
apps:
  api:
    src:
      db:
        CREATE_FILE(schema.ts --template ./templates/db-schema.txt):
        CREATE_FILE(seed.ts --template ./templates/db-seed.txt):
```

## Composition

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/drizzle-data-apps-api
```

Put this core **after** `/Core/nestjs-api` so Drizzle dependencies merge into
`@bigbang/api` and `apps/api/src/db` lands next to Nest `src/`.
