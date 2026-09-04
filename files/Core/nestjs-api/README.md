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
- Listen port: `PORT` (default `3000`; empty string does not fail boot)
- CORS: `CORS_ORIGINS` (Vite `3001` and Next `3002` by default)

## Composition

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
```

Put this core **after** the monorepo skeleton so `apps/api` lands on the
workspace package path. Do not also `$USE_CORE` `/Core/hono-api`; that core is
a repo-root Hono overlay and would conflict.
