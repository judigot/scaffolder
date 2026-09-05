# Next.js App Router BFF

Generated Next.js 16 App Router backend-for-frontend with Drizzle ORM.

## Tech Stack

- **Runtime**: Bun
- **App**: Next.js 16 App Router (Vercel)
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **Auth**: Better Auth at `/api/auth/*` (`getAuthSession` in `lib/auth.ts`)

## Getting Started

```sh
bun install
cp .env.example .env
bun run db:push
bun run dev
```

- App: http://localhost:3000
- Health: http://localhost:3000/api/health
- Hello: http://localhost:3000/api/hello

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/hello` - Hello payload
- `GET|POST /api/auth/*` - Better Auth handler

<@@LOOP@@ data="tables" separator="\n">### <@@>tableName.singular.pascalCase</@@>
- `GET /api/<@@>tableName.kebabCase</@@>` - List all <@@>tableName</@@>
- `GET /api/<@@>tableName.kebabCase</@@>/:id` - Get single <@@>tableName.singular</@@>
- `POST /api/<@@>tableName.kebabCase</@@>` - Create <@@>tableName.singular</@@>
- `PUT /api/<@@>tableName.kebabCase</@@>/:id` - Update <@@>tableName.singular</@@>
- `PATCH /api/<@@>tableName.kebabCase</@@>/:id` - Update <@@>tableName.singular</@@>
- `DELETE /api/<@@>tableName.kebabCase</@@>/:id` - Delete <@@>tableName.singular</@@></@@LOOP@@>
