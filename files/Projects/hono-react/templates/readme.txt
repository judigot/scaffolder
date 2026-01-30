# [[USE_FORM_DATA(projectName)]]

A production-ready Hono + React fullstack application with Drizzle ORM.

## Tech Stack

- **Runtime**: Bun
- **API**: Hono with RPC client
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React + Vite
- **Testing**: Vitest
- **Deployment**: Vercel

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

@LOOP(tables)
### {{tableNamePascalCaseSingular}}
- `GET /api/{{tableNameKebabCase}}` - List all {{tableName}}
- `GET /api/{{tableNameKebabCase}}/:id` - Get single {{tableNameSingular}}
- `POST /api/{{tableNameKebabCase}}` - Create {{tableNameSingular}}
- `PUT /api/{{tableNameKebabCase}}/:id` - Update {{tableNameSingular}}
- `DELETE /api/{{tableNameKebabCase}}/:id` - Delete {{tableNameSingular}}
@/LOOP --separator="\n"

## Database Schema

@LOOP(tables)
### {{tableNamePascalCaseSingular}}

| Column | Type | Nullable |
|--------|------|----------|
[[ LOOP(columnsInfo) --template="| {{value}} | {{data_type}} | {{is_nullable}} |" --separator="\n" ]]
@/LOOP --separator="\n\n"

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
