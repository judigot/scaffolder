# Nest.js Fastify overlay

Optional HTTP-adapter overlay for `/Core/nestjs-api`. This is **not** a second
golden and is **not** composed into `Projects/template-monorepo` by default.

Swaps Express for Fastify at `apps/api` (`@bigbang/api`).

## Layout

```text
apps/api/src/main.ts              FastifyAdapter bootstrap
apps/api/src/not-found.filter.ts  FastifyReply 404 JSON
apps/api/test/app.test.ts         FastifyAdapter health tests
apps/api/package.json             @nestjs/platform-fastify + fastify
```

## Composition

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/nestjs-fastify
  - /Core/drizzle-data-apps-api
```

Put this core **after** `/Core/nestjs-api` so `main.ts` and the 404 filter
override the Express versions. `package.json` merges; Express may remain as an
unused dependency.
