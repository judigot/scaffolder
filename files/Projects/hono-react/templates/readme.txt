# [[USE_FORM_DATA(projectName)]]

A production-ready Hono + React fullstack application with Drizzle ORM.

## Tech Stack

- **Runtime**: Bun
- **API**: Hono with RPC client
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React + Vite
- **Testing**: Vitest
- **Deployment**: Vercel

## Environment

- Node.js `24.13.0` (bundled npm `11.6.2`)
- npm `11.6.2`
- pnpm `10.28.0` (installed for tooling parity)
- Bun `1.3.8` (primary runtime, bundler, and package manager)

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Run database migrations
bun db:push

# Start development server
bun dev
```

## Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch
```

## API Endpoints

<@@LOOP@@ data="tables" separator="\n">### <@@>tableName.singular.pascalCase</@@>
- `GET /api/<@@>tableName.kebabCase</@@>` - List all <@@>tableName</@@>
- `GET /api/<@@>tableName.kebabCase</@@>/:id` - Get single <@@>tableName.singular</@@>
- `POST /api/<@@>tableName.kebabCase</@@>` - Create <@@>tableName.singular</@@>
- `PUT /api/<@@>tableName.kebabCase</@@>/:id` - Update <@@>tableName.singular</@@>
- `DELETE /api/<@@>tableName.kebabCase</@@>/:id` - Delete <@@>tableName.singular</@@></@@LOOP@@>

## Database Schema

<@@LOOP@@ data="tables" separator="\n\n">### <@@>tableName.singular.pascalCase</@@>

| Column | Type | Nullable |
|--------|------|----------|
<@@LOOP@@ data="columnsInfo" separator="\n">| <@@>value</@@> | <@@>data_type</@@> | <@@>is_nullable</@@> |</@@LOOP@@></@@LOOP@@>

## Deployment

Deploy to Vercel:

```bash
vercel
```

## Project Structure

```
├── api/
│   ├── index.ts          # API entry point
│   ├── db/
│   │   ├── index.ts      # Database connection
│   │   └── schema.ts     # Drizzle schema
│   └── routes/           # Route handlers
├── src/
│   ├── App.tsx           # React app
│   ├── main.tsx          # Entry point
│   └── styles/           # Styles
├── tests/                # Test files
├── drizzle.config.ts     # Drizzle config
├── vite.config.ts        # Vite config
└── vitest.config.ts      # Vitest config
```
