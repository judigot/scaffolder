# Auth NestJS Adapter

Better Auth on NestJS. Compose after `/Core/nestjs-api`. This overlay does not replace `app.module.ts`.

## Usage

```yaml
$USE_CORE:
  - /Core/template-monorepo
  - /Core/nestjs-api
  - /Core/auth-nestjs
```

Import `AuthNestModule.forRoot(auth)` from the app module once Drizzle tables exist:

```ts
import { Module } from '@nestjs/common';
import { AuthNestModule } from './auth/auth.module';
import { createNestAuth } from './auth/auth';
import { db } from './db';
import { user, session } from './db/schema';

const auth = createNestAuth(db, { user, session });

@Module({
  imports: [AuthNestModule.forRoot(auth)],
})
export class AppModule {}
```

`AuthModule` from `@thallesp/nestjs-better-auth` registers a global `AuthGuard`. Mark public routes with `@AllowAnonymous()`.

Disable Nest's body parser for Better Auth's raw body, or pass `bodyParser` options through `AuthModule.forRoot`.

## Environment

```txt
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3001,http://localhost:3002
PORT=3000
```
