# Auth Hono Adapter

Hono-specific middleware and route handlers for auth-services.

## Features

- Session cookie middleware
- Authentication guards (requireAuth, requireVerifiedEmail)
- Pre-built auth routes (/register, /login, /logout, /me)
- Type-safe context helpers

## Usage

### 1. Add to structure.yaml

```yaml
$USE_CORE:
  - /Core/auth-services
  - /Core/auth-hono
```

### 2. Apply Session Middleware

```typescript
import { Hono } from 'hono';
import { sessionMiddleware } from './auth/hono/middleware';

const app = new Hono();

// Apply to all routes
app.use('*', sessionMiddleware());
```

### 3. Protect Routes

```typescript
import { requireAuth, getUser } from './auth/hono/middleware';

// Protected route
app.get('/profile', requireAuth(), (c) => {
  const user = getUser(c);
  return c.json({ user });
});

// Or with email verification required
app.post('/sensitive', requireAuth(), requireVerifiedEmail(), (c) => {
  // Only verified users reach here
});
```

### 4. Use Pre-built Auth Routes

```typescript
import { createAuthRoutes } from './auth/hono/routes';
import { db } from './db';
import { user } from './db/schema';

const authRoutes = createAuthRoutes(db, user);
app.route('/auth', authRoutes);
```

This gives you:
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- GET /auth/me
- GET /auth/session

## Middleware Reference

### sessionMiddleware()

Validates session cookie and populates `user` and `session` in context.

```typescript
app.use('*', sessionMiddleware());

// Access in handlers:
const user = c.get('user');    // User | null
const session = c.get('session'); // Session | null
```

### requireAuth()

Returns 401 if no authenticated user.

```typescript
app.get('/private', requireAuth(), handler);
```

### requireVerifiedEmail()

Returns 403 if email not verified. Must be used after requireAuth.

```typescript
app.get('/verified-only', requireAuth(), requireVerifiedEmail(), handler);
```

## Cookie Helpers

```typescript
import { setSessionCookie, clearSessionCookie } from './auth/hono/middleware';

// Set session cookie from Lucia's serialized value
setSessionCookie(c, sessionCookie);

// Clear session cookie (logout)
clearSessionCookie(c);
```

## Context Types

```typescript
import type { HonoAuthContext } from './auth/hono/middleware';

const app = new Hono<HonoAuthContext>();
```
