# Nest.js API core

Reusable Nest.js HTTP package for Bun + Turborepo apps.

This core is **not** a standalone Nest app at the repository root. It supplies
`apps/api/` so it can merge into a monorepo skeleton (for example
`/Core/template-monorepo`) via `$USE_CORE`.

## Layout

```text
apps/api/          NestJS package named @bigbang/api
```

## Contract

- Workspace package name: `@bigbang/api`
- Dev script: `bun --hot src/main.ts`
- Global prefix: `/api`
- Health: `GET /api/health` → `{ "status": "healthy", "timestamp": "..." }`
- Hello: `GET /api/hello` → `{ "message": "Hello, world!" }`
- Unknown routes: JSON `{ "error": "Not Found" }` with HTTP 404
- Listen: `PORT` on `0.0.0.0` (default `3000`; empty string does not fail boot)
- CORS: `CORS_ORIGINS` (Vite `3001` and Next `3002` by default)
- `ZodValidationPipe` for schema-driven controllers (FILE_LOOP in the project)

Schema-driven CRUD modules, Drizzle schema, and tests belong in the **project**
template (`files/Projects/template-monorepo/templates`), not this core.

## Composition

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/drizzle-data-apps-api
```

Put this core **after** the monorepo skeleton so `apps/api` lands on the
workspace package path. Compose `/Core/drizzle-data-apps-api` after this core
for path-aware Drizzle at `apps/api/src/db`. Do not also `$USE_CORE`
`/Core/hono-api` or `/Core/drizzle-data`; those are repo-root Hono overlays.

Optional Fastify adapter (not a second golden):

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/nestjs-fastify
  - /Core/drizzle-data-apps-api
```
