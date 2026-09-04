# Shared Core Files

Reusable core templates that can be imported by multiple projects.

## Usage

### Single Core Import
```yaml
$USE_CORE: /Core/vite

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### Multiple Core Imports
```yaml
$USE_CORE:
  - /Core/vite
  - /Core/react
  - /Core/extra

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

## Override Priority

**Lowest to Highest (later wins):**

1. First core import
2. Second core import
3. ...
4. Last core import
5. **Local `core/` folder** (always highest priority)

## Example

```yaml
# structure.yaml
$USE_CORE:
  - /Core/vite      # Base
  - /Core/react     # Overrides vite

# Local core/package.json overrides both imported versions
```

**Result:**
- Files from `/Core/vite` (base layer)
- Files from `/Core/react` (overrides vite)
- Files from local `core/` (overrides everything)

## Creating Core Templates

1. Create folder in `files/Core/`
2. Add your template files
3. Reference in `structure.yaml` with `$USE_CORE:`

```
Core/
└── my-template/
    ├── .eslintrc.json
    ├── tsconfig.json
    └── src/
        └── utils/

Reusable API / app cores:

- `/Core/hono-api` — repo-root Hono overlay (`hono-react`)
- `/Core/nestjs-api` — Nest.js HTTP package at `apps/api` (`@bigbang/api`)
- `/Core/nextjs` — Next.js 16 App Router BFF at repo root (`App Generator - Next.js`)
- `/Core/laravel` — Laravel application base
- `/Core/template-monorepo` — Bun Turborepo skeleton (Vite + Next.js + packages; no API)
- `/Core/tanstack-form` — TanStack Form `createFormHook` wrappers (CRUD create pages)
- `/Core/tanstack-router` — TanStack Router v1 file-based routing + Vite plugin
- `/Core/bullmq` — Nest-first BullMQ + Redis compose overlay (`apps/api/src/queue`)
- `/Core/otel` — OpenTelemetry NodeSDK, merge-able into Nest and Hono
- `/Core/playwright-e2e` — reusable Playwright package at `e2e/`
- `/Core/vitest-test` — Vitest 4 CRUD test runner (`tests/`, coverage v8)

Auth cores (Better Auth replaces Lucia):

- `/Core/better-auth` — session factory, Drizzle adapter, React client, `account`/`verification` tables
- `/Core/auth-services` — password helpers, OAuth (Arctic), session wrappers over Better Auth
- `/Core/auth-hono` — Hono handler + session middleware (`api/auth/hono`)
- `/Core/auth-nestjs` — NestJS `AuthModule` adapter (`@thallesp/nestjs-better-auth`)
- `/Core/auth-react` — `AuthProvider` / login forms on `better-auth/react`

```yaml
$USE_CORE:
  - /Core/auth-react
  - /Core/auth-services
  - /Core/better-auth
```

Compose the Nest API into the monorepo:

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
```

Standalone Next.js BFF (do not compose with `/Core/template-monorepo`; `app/` would collide):

```yaml
$USE_CORE:
  - /Core/drizzle-data
  - /Core/better-auth
  - /Core/nextjs
```

Compose queues, tracing, and e2e onto the Nest golden:

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/bullmq
  - /Core/otel
  - /Core/playwright-e2e
```

Hono CRUD forms (not login) pull TanStack Form wrappers:

```yaml
$USE_CORE:
  - /Core/vite-react
  - /Core/tanstack-router
  - /Core/tanstack-form
```

Use:
```yaml
$USE_CORE: /Core/my-template
```

## Notes

- The `core/` and `Core/` folders are automatically excluded from final output
- Only the contents are merged into your project structure
- Use local `core/` folder for project-specific overrides

