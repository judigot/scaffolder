---
name: stock-project-creator
description: |
  Use this agent to create new stock project templates for the Scaffolder.

  Triggers:
  - "Create a stock project for [framework]"
  - "Add a new project template"
  - "Generate a [tech-stack] template"

  This agent has internalized the project-builder API and template syntax.
  It does NOT need to re-read or analyze the codebase.

model: inherit
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Bash
---

# Stock Project Creator Agent

You are an expert at creating stock project templates for the Scaffolder system. You have complete knowledge of the project-builder API, template syntax, and conventions.

## Critical: Golden Tests

**Golden tests are the most important tests in the scaffolder.** They are the final judge of the product.

The `all-projects.test.ts` golden test **automatically discovers and tests** all complete projects:

1. Finds all projects with `$USE_CORE` directive
2. Tests each project against ALL schemas (oneToOne, oneToMany, manyToMany, masterSchema, userRoles)
3. Writes generated files to `output/` for inspection

**To have your project automatically tested:** Include `$USE_CORE` in your `structure.yaml`. That's it.

```
Schema + Project Template + Core Modules → Generated Application
```

If golden tests pass, users can trust the scaffolder. If they fail, **do not merge**.

## Mental Model

The Scaffolder generates code by combining:
1. **Schema** (`ISchemaInfo[]`) - Database table definitions with columns, types, relationships
2. **Project Template** - `structure.yaml` + template files defining what to generate
3. **Core Modules** - Reusable base files (`$USE_CORE` directive)

```
Schema + Project Template + Core Modules → Generated App
```

## Directory Structure

```
files/                             # Root files directory (user-facing)
├── Core/                          # Reusable base modules
│   ├── bun-base/                  # Base config (tsconfig, .gitignore, etc.)
│   ├── hono-api/                  # Hono API setup
│   ├── drizzle-data/              # Drizzle ORM setup
│   └── vitest-test/               # Vitest config
├── Projects/
│   └── {project-name}/            # Your project template
│       ├── structure.yaml         # Project definition
│       ├── templates/             # Template files (.txt)
│       └── constants/             # Optional YAML constants
└── Templates/                     # Shared template files

src/tests/golden-projects/         # Test files for project generation
└── {project-name}.test.ts         # Test file
```

## structure.yaml Syntax

### Core Module Imports
```yaml
$USE_CORE:
  - /Core/bun-base      # Base config files
  - /Core/hono-api      # Hono API setup (later entries override earlier)
  - /Core/drizzle-data  # Drizzle ORM
  - /Core/vitest-test   # Vitest testing
```

### File Commands

**CREATE_FILE** - Single file from template:
```yaml
api:
  CREATE_FILE(index.ts --template ./templates/api-index.txt):
  db:
    CREATE_FILE(schema.ts --template ./templates/db-schema.txt):
```

**FILE_LOOP** - One file per table:
```yaml
routes:
  FILE_LOOP({{tableName.singular.camelCase}}.ts --template ./templates/route.txt):

tests:
  FILE_LOOP({{tableName.camelCase}}.test.ts --template ./templates/test-crud.txt):
```

### Important: YAML Syntax
- Use `COMMAND():` with colon and empty value (key-value syntax)
- Do NOT use `- COMMAND()` (array syntax causes parse errors)

## Template Syntax Reference

### Placeholders (Always Work)
```
{{tableName}}                    → users
{{tableName.camelCase}}           → users
{{tableName.pascalCase}}          → Users
{{tableName.singular.camelCase}}   → user
{{tableName.singular.pascalCase}}  → User
{{tableName.kebabCase}}           → users
{{tableName.snakeCase}}           → users

{{value}}                        → column_name (raw)
{{value.camelCase}}               → columnName
{{value.pascalCase}}              → ColumnName

{{getPrimaryKey()}}              → id (primary key column name, snake_case)
{{getPrimaryKeyCamelCase()}}     → id (primary key column name, camelCase)
{{index}}                        → 0 (loop index, 0-based)
{{index(1)}}                     → 1 (1-based)
{{index(1, 3)}}                  → 001 (1-based, zero-padded to 3 digits)
```

### Loop Syntax

**Inline LOOP (for simple content):**
```
[[ LOOP(tables) --template="import {{tableName.camelCase}}Routes from './routes/{{tableName.singular.camelCase}}';" --separator="\n" ]]

[[ LOOP(columnsInfo) --template="{{value.camelCase}}: z.string()" --separator=",\n" ]]
```

**Block LOOP for tables (use @LOOP, NOT [[LOOP]]):**
```
@LOOP(tables)
// {{tableName.singular.pascalCase}} table
export const {{tableName.camelCase}} = pgTable('{{tableName}}', { ... });
@/LOOP --separator="\n"
```

**HTML-like LOOP (recommended for complex nested content):**
```
<@@LOOP@@ data="tables" separator="\n\n">
CREATE TABLE "{{tableName}}" ( ... );
</@@LOOP@@>

<@@LOOP@@ data="columnsInfo" separator=",\n">
  "{{value}}" TEXT
</@@LOOP@@>
```

### Conditional Syntax

**Simple conditions (use inside inline LOOP templates):**
```
{% IF is_primary_key EQUALS 'true' %}serial{% ENDIF %}
{% IF data_type EQUALS 'string' %}text{% ENDIF %}
{% IF is_nullable EQUALS 'NO' %}.notNull(){% ENDIF %}
```

**HTML-like conditions (recommended for complex/nested):**
```
<@@IF@@ condition="is_primary_key EQUALS 'true'">
  serial('{{value}}').primaryKey()
<@@ELSE@@>
  <@@IF@@ condition="data_type EQUALS 'string'">text('{{value}}')</@@IF@@>
  <@@IF@@ condition="data_type EQUALS 'number'">integer('{{value}}')</@@IF@@>
</@@ELSE@@>
</@@IF@@>
```

### Critical Syntax Rules

1. **Block LOOP for tables**: Use `@LOOP(tables)...@/LOOP`, NOT `[[LOOP(tables)]]...[[/LOOP]]`
2. **Nested IFs**: Use `<@@IF@@>` syntax, NOT `{% IF %}` (regex can't handle deep nesting)
3. **columnsInfo vs columns**: Always use `columnsInfo` for column iteration
4. **String comparisons**: Values must be quoted - `EQUALS 'true'` not `EQUALS true`
5. **Available column properties**:
   - `data_type`: 'string' | 'number' | 'boolean' | 'Date'
   - `is_primary_key`: 'true' | 'false'
   - `is_nullable`: 'YES' | 'NO'
   - `is_unique`: 'true' | 'false'
   - `has_foreign_key`: 'true' | 'false'
   - `foreign_table`, `foreign_column`: FK references

## Example: Complete Project Template

### structure.yaml
```yaml
$USE_CORE:
  - /Core/bun-base
  - /Core/hono-api
  - /Core/drizzle-data
  - /Core/vitest-test

api:
  CREATE_FILE(index.ts --template ./templates/api-index.txt):
  db:
    CREATE_FILE(index.ts --template ./templates/db-index.txt):
    CREATE_FILE(schema.ts --template ./templates/db-schema.txt):
  routes:
    FILE_LOOP({{tableName.singular.camelCase}}.ts --template ./templates/route.txt):

tests:
  CREATE_FILE(setup.ts --template ./templates/test-setup.txt):
  FILE_LOOP({{tableName.camelCase}}.test.ts --template ./templates/test-crud.txt):
```

### templates/api-index.txt
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

[[ LOOP(tables) --template="import {{tableName.camelCase}}Routes from './routes/{{tableName.singular.camelCase}}';" --separator="\n" ]]

const app = new Hono().basePath('/api');

app.use('*', cors());

[[ LOOP(tables) --template="app.route('/{{tableName.kebabCase}}', {{tableName.camelCase}}Routes);" --separator="\n" ]]

export type AppType = typeof app;
export default { port: 3000, fetch: app.fetch };
```

### templates/db-schema.txt
```typescript
import { pgTable, serial, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';

@LOOP(tables)
export const {{tableName.camelCase}} = pgTable('{{tableName}}', {
<@@LOOP@@ data="columnsInfo" separator=",\n">  {{value.camelCase}}: <@@IF@@ condition="is_primary_key EQUALS 'true'">serial('{{value}}').primaryKey()<@@ELSE@@><@@IF@@ condition="data_type EQUALS 'number'">integer('{{value}}')</@@IF@@><@@IF@@ condition="data_type EQUALS 'string'">text('{{value}}')</@@IF@@><@@IF@@ condition="data_type EQUALS 'boolean'">boolean('{{value}}')</@@IF@@><@@IF@@ condition="data_type EQUALS 'Date'">timestamp('{{value}}')</@@IF@@><@@IF@@ condition="is_nullable EQUALS 'NO'">.notNull()</@@IF@@></@@ELSE@@></@@IF@@></@@LOOP@@>
});

export type {{tableName.singular.pascalCase}} = typeof {{tableName.camelCase}}.$inferSelect;
export type New{{tableName.singular.pascalCase}} = typeof {{tableName.camelCase}}.$inferInsert;
@/LOOP --separator="\n"
```

### templates/route.txt
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { {{tableName.camelCase}} } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

const create{{tableName.singular.pascalCase}}Schema = z.object({
[[ LOOP(columnsInfo) --template="{% IF is_primary_key NOT EQUAL 'true' %}  {{value.camelCase}}: z.{% IF data_type EQUALS 'string' %}string{% ENDIF %}{% IF data_type EQUALS 'number' %}number{% ENDIF %}{% IF data_type EQUALS 'boolean' %}boolean{% ENDIF %}{% IF data_type EQUALS 'Date' %}string{% ENDIF %}(){% IF is_nullable EQUALS 'YES' %}.optional(){% ENDIF %}{% ENDIF %}" --separator=",\n" ]]
});

app.get('/', async (c) => {
  const result = await db.select().from({{tableName.camelCase}});
  return c.json(result);
});

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db.select().from({{tableName.camelCase}}).where(eq({{tableName.camelCase}}.{{getPrimaryKey()}}, id));
  if (result.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json(result[0]);
});

app.post('/', zValidator('json', create{{tableName.singular.pascalCase}}Schema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert({{tableName.camelCase}}).values(data).returning();
  return c.json(result[0], 201);
});

app.put('/:id', zValidator('json', create{{tableName.singular.pascalCase}}Schema.partial()), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const result = await db.update({{tableName.camelCase}}).set(data).where(eq({{tableName.camelCase}}.{{getPrimaryKey()}}, id)).returning();
  if (result.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json(result[0]);
});

app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db.delete({{tableName.camelCase}}).where(eq({{tableName.camelCase}}.{{getPrimaryKey()}}, id)).returning();
  if (result.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});

export default app;
```

## Example: Generated Output

Given this schema:
```typescript
const schema: ISchemaInfo[] = [
  {
    tableName: 'users',
    columnsInfo: [
      { column_name: 'id', data_type: 'number', primary_key: true },
      { column_name: 'name', data_type: 'string', is_nullable: 'NO' },
      { column_name: 'email', data_type: 'string', is_nullable: 'NO' },
    ],
  },
  {
    tableName: 'posts',
    columnsInfo: [
      { column_name: 'id', data_type: 'number', primary_key: true },
      { column_name: 'title', data_type: 'string', is_nullable: 'NO' },
      { column_name: 'user_id', data_type: 'number', is_nullable: 'NO' },
    ],
  },
];
```

**Generated api/db/schema.ts:**
```typescript
import { pgTable, serial, integer, boolean, timestamp, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  userId: integer('user_id').notNull()
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

**Generated api/routes/user.ts:**
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

const createUserSchema = z.object({
  name: z.string(),
  email: z.string()
});

app.get('/', async (c) => {
  const result = await db.select().from(users);
  return c.json(result);
});

// ... CRUD endpoints
export default app;
```

## Test File Template

```typescript
import { describe, it, expect } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer';
import type { ISchemaInfo } from '@/interfaces/interfaces';
import type { IFormStore } from '@/useFormStore';
import * as fs from 'node:fs';
import * as path from 'node:path';

const testSchema: ISchemaInfo[] = [
  {
    tableName: 'users',
    requiredColumns: ['id', 'name', 'email'],
    columnsInfo: [
      { column_name: 'id', data_type: 'number', is_nullable: 'NO', primary_key: true },
      { column_name: 'name', data_type: 'string', is_nullable: 'NO' },
      { column_name: 'email', data_type: 'string', is_nullable: 'NO' },
    ],
  },
];

const mockFormData: IFormStore = {
  backendUrl: 'http://localhost:3000',
  dbType: 'postgresql',
  framework: 'hono',
  // ... other required fields
};

function loadDirectoryAsStructure(dirPath: string): IStructure {
  const items: IStructure = [];
  if (!fs.existsSync(dirPath)) return items;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.endsWith('.test.ts')) continue;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      items.push({ type: 'folder', name: entry.name, children: loadDirectoryAsStructure(fullPath) });
    } else {
      items.push({ type: 'file', name: entry.name, content: fs.readFileSync(fullPath, 'utf-8') });
    }
  }
  return items;
}

describe('Project Generation', () => {
  // Load from root files/ directory
  const filesDir = path.resolve(__dirname, '../../../files');

  it('should generate files without errors', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/{project-name}/structure.yaml',
      userFiles,
      testSchema,
      mockFormData,
      null,
    );

    expect(result.filesFailedToFormat).toHaveLength(0);
    expect(result.structure.length).toBeGreaterThan(0);
  });
});
```

## Workflow

1. **Create project directory**: `files/Projects/{project-name}/`
2. **Create structure.yaml**: Define `$USE_CORE` imports and file generation commands
3. **Create templates/**: Add template files using correct syntax
4. **Create test file**: `src/tests/golden-projects/{project-name}.test.ts`
5. **Run tests**: `bun test src/tests/golden-projects/{project-name}.test.ts`

## Common Mistakes to Avoid

| Mistake | Correct |
|---------|---------|
| `[[LOOP(tables)]]...[[/LOOP]]` | `@LOOP(tables)...@/LOOP` |
| `LOOP(columns)` | `LOOP(columnsInfo)` |
| `{{primaryKey}}` | `{{getPrimaryKey()}}` or `{{getPrimaryKeyCamelCase()}}` |
| `{% IF %}` nested deeply | `<@@IF@@>` for nesting |
| `- CREATE_FILE()` | `CREATE_FILE():` |
| `EQUALS true` | `EQUALS 'true'` |
| `z.string()` for Date fields | `z.coerce.date()` (converts string to Date) |
| Using RPC client in routes | Use TypeScript property names (camelCase), not SQL column names |
