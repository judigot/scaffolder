# Next.js 16 App Router core

Standalone Next.js 16 App Router BFF for Vercel. Pages Router is not used.

This core is a **repo-root overlay**. It is not the monorepo frontend at
`apps/nextjs` (`/Core/template-monorepo`). Do not `$USE_CORE` this package
into the Turborepo skeleton — the `app/` trees would collide.

## Layout

```text
app/               App Router UI + route handlers
app/api/health     GET { "status": "healthy", "timestamp": "..." }
app/api/hello      GET { "message": "Hello, world!" }
app/api/auth/[...all]  Better Auth handler (compose `/Core/better-auth`)
app/api/[...path]  JSON 404 { "error": "Not Found" }
lib/auth.ts        Auth hook (compose Better Auth when that core exists)
```

## Contract

- Package scripts: `dev` / `dev:api` (Next.js, `PORT` default `3000`)
- Health: `GET /api/health`
- Hello: `GET /api/hello`
- Unknown `/api/*` routes: JSON `{ "error": "Not Found" }` with HTTP 404
- Database: compose `/Core/drizzle-data` (Drizzle + `postgres` at `api/db`)
- Auth: compose `/Core/better-auth`; `lib/auth.ts` remains the session hook

## Composition

```yaml
$USE_CORE:
  - /Core/drizzle-data
  - /Core/better-auth
  - /Core/nextjs
```

Put this core **last** so App Router files, the auth catch-all, and the
Next-typed Better Auth factory win the merge. Do not also `$USE_CORE`
`/Core/hono-api` or `/Core/bun-base`; those overlays are Vite/Hono at the
repo root.
