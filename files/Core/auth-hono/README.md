# Auth Hono Adapter

Hono middleware and the Better Auth catch-all handler.

Legacy `src/` files stay in place for older overlays. New apps should import from `api/auth/hono`.

## Features

- `betterAuthHandler` — `app.all('/auth/*', betterAuthHandler)`
- Session middleware via `auth.api.getSession`
- Auth guards (`requireAuth`, `requireVerifiedEmail`)
- Pre-built email/password routes in `src/routes.ts` (kept until the handler path is enough)

## Usage

```yaml
$USE_CORE:
  - /Core/auth-services
  - /Core/better-auth
  - /Core/auth-hono
```

Do not `$USE_CORE` this overlay after a React `src/` core unless you want `src/middleware.ts` from this package. Prefer the `api/auth/hono` files.

### Mount Better Auth

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { betterAuthHandler } from './auth/hono';
import { initializeBetterAuth, getBetterAuth } from './auth';
import { db } from './db';
import { session, user } from './db/schema';
import { account, verification } from './db/auth-schema';

initializeBetterAuth(db, session, user, { account, verification });

const app = new Hono().basePath('/api');

app.use(
  '/auth/*',
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
);

app.all('/auth/*', betterAuthHandler);
```

This serves Better Auth at `/api/auth/*`:

- POST `/api/auth/sign-up/email`
- POST `/api/auth/sign-in/email`
- POST `/api/auth/sign-out`
- GET `/api/auth/get-session`

### Session middleware

```typescript
import { sessionMiddleware, requireAuth, getUser } from './auth/hono';

app.use('*', sessionMiddleware());

app.get('/profile', requireAuth(), (c) => {
  const user = getUser(c);
  return c.json({ user });
});
```

## Cookie name

`auth_session` — same as the previous Lucia cookie.
