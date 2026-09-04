# Better Auth

TypeScript session layer for generated apps. Replaces Lucia.

Uses the Drizzle adapter and cookie sessions. Compatible with `$SCHEMA_FILTER` `user` + `session` tables (UUID user ids, `session.userId` FK).

## Features

- Email/password via Better Auth
- Drizzle adapter (`pg`) mapped onto generated `user` / `session` tables
- Optional `account` + `verification` tables for native Better Auth routes
- Cookie name `auth_session` (same as the previous Lucia cookie)

## Usage

```yaml
$USE_CORE:
  - /Core/drizzle-data
  - /Core/auth-services
  - /Core/better-auth
```

Put `/Core/better-auth` after `/Core/auth-services` so the factory file and `better-auth` dependency win the merge.

## Environment

```txt
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

`BETTER_AUTH_SECRET` must be at least 32 characters. Generate with `openssl rand -base64 32`.

## Schema mapping

Generated `user` and `session` tables stay the source of truth.

| Better Auth field | Generated column |
| --- | --- |
| `user.name` | `username` |
| `session.token` | `session.id` (Lucia-shaped session row) |
| `user.emailVerified` | `emailVerified` / `email_verified` |

`api/db/auth-schema.ts` adds `account` and `verification` for `/sign-in/email` and `/sign-up/email`. Custom `/login` and `/register` routes in auth-services still hash passwords onto the user row.

## Hono

Mount the handler after CORS, matching `basePath` `/api`:

```ts
import { getBetterAuth } from './auth';

app.all('/auth/*', (c) => getBetterAuth().handler(c.req.raw));
```

## NestJS

Use `/Core/auth-nestjs` on top of `/Core/nestjs-api`.
