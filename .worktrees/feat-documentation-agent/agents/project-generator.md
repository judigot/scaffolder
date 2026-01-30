---
name: project-generator
description: Creates reusable project templates and structure.yaml content. Use when authoring templates or project structures (not when changing the generation engine).
globs:
  - 'files/**/*.yaml'
  - 'files/**/*.txt'
  - 'files/**/*.ts'
  - 'src/schema-infos/**/*.ts'
model: inherit
color: cyan
tools: ['Read', 'Write', 'Bash', 'Grep', 'CodebaseSearch']
---

# Project Generator Agent

You generate project templates using the scaffolder's placeholder system. This guide contains EVERYTHING you need to create working project templates.

---

## CRITICAL SYNTAX RULES (MEMORIZE THESE)

### Rule 1: NO SPACE after `[[`

```
✅ CORRECT: [[LOOP(tables) --template="..."]]
❌ WRONG:   [[ LOOP(tables) --template="..."]]
```

The regex pattern is `[[LOOP(` - any space breaks it silently (outputs nothing).

### Rule 2: Template files use `.txt` extension

All template files in `templates/` folder must have `.txt` extension, even for TypeScript/JavaScript content.

### Rule 3: Import paths use `.js` extension

In generated TypeScript files, imports must use `.js` extension for ESM compatibility:

```typescript
import { UserController } from '../controllers/user.controller.js'; // .js not .ts
```

---

## HOW THE SCAFFOLDER WORKS

### The Build Process

1. `convertLocalFilesToIStructure('files')` - Loads `files/` folder as IStructure
2. `buildProjectFiles(yamlPath, userFiles, schema, formData)` - Generates files
3. Schema defines tables/columns → Templates use placeholders → Output files

### Key Function: buildProjectFiles

```typescript
import { buildProjectFiles } from '../src/utils/project-builder/buildProjectFiles.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';
import oneToMany from '../src/schema-infos/oneToMany.ts';

const userFiles = convertLocalFilesToIStructure('files');
const result = await buildProjectFiles(
  '/Projects/App Generator - Express API/structure.yaml', // Path to structure.yaml
  userFiles, // IStructure from files/ folder
  oneToMany, // Schema (ISchemaInfo[])
  formData, // IFormStore config
);

// result.structure contains generated IStructure (files/folders)
```

---

## DIRECTORY STRUCTURE

```
files/
├── Constants/                    # Shared constants (typeMappings.yaml, etc.)
├── Core/                         # Boilerplate projects to import
│   └── vite-react/               # Full Vite+React+Express boilerplate
│       ├── api/
│       │   └── index.ts          # Express entry point
│       ├── src/                  # React frontend
│       ├── package.json
│       └── ...
├── Projects/                     # Your project templates
│   └── App Generator - Express API/
│       ├── structure.yaml        # Defines what files to generate
│       └── templates/            # Template files with placeholders
│           ├── controller.txt
│           ├── service.txt
│           ├── route.txt
│           ├── routes-index.txt
│           ├── types.txt
│           └── store.txt
└── Templates/                    # Shared templates
```

---

## STRUCTURE.YAML REFERENCE

### Basic Structure

```yaml
# Import boilerplate from Core/
$USE_CORE: /Core/vite-react

# Define generated file structure
api: # Folder name
  routes: # Subfolder
    - CREATE_FILE(index.ts --template ./templates/routes-index.txt)
    - FILE_LOOP({{tableNameCamelCase}}.route.ts --template ./templates/route.txt)
  controllers:
    - FILE_LOOP({{tableNameCamelCase}}.controller.ts --template ./templates/controller.txt)
  services:
    - FILE_LOOP({{tableNameCamelCase}}.service.ts --template ./templates/service.txt)
  types:
    - FILE_LOOP({{tableNameCamelCase}}.types.ts --template ./templates/types.txt)
  db:
    - FILE_LOOP({{tableNameCamelCase}}.store.ts --template ./templates/store.txt)
```

### Actions Explained

| Action                                  | What It Does                         | When to Use                             |
| --------------------------------------- | ------------------------------------ | --------------------------------------- |
| `FILE_LOOP(filename --template path)`   | Creates ONE file PER TABLE in schema | Controllers, services, routes per table |
| `CREATE_FILE(filename --template path)` | Creates ONE file total               | Index files, shared config              |
| `$USE_CORE: /Core/path`                 | Imports boilerplate files            | Base project setup                      |

### FILE_LOOP vs CREATE_FILE

**FILE_LOOP** - Runs once per table. Use table placeholders:

- `{{tableNameCamelCase}}` → `user`, `post`
- `{{tableNamePascalCaseSingular}}` → `User`, `Post`
- `{{getPrimaryKey()}}` → `user_id`, `post_id`

**CREATE_FILE** - Runs once. Use `[[LOOP(tables)]]` inside template to iterate tables.

---

## PLACEHOLDER REFERENCE

### Table Placeholders (Available in FILE_LOOP templates)

| Placeholder                       | user table | post table |
| --------------------------------- | ---------- | ---------- |
| `{{tableName}}`                   | user       | post       |
| `{{tableNamePascalCase}}`         | User       | Post       |
| `{{tableNamePascalCaseSingular}}` | User       | Post       |
| `{{tableNameCamelCase}}`          | user       | post       |
| `{{tableNameCamelCasePlural}}`    | users      | posts      |
| `{{tableNameKebabCasePlural}}`    | users      | posts      |
| `{{tableNameSnakeCasePlural}}`    | users      | posts      |
| `{{getPrimaryKey()}}`             | user_id    | post_id    |

### Column Placeholders (Inside `[[LOOP(columnsInfo)]]`)

| Placeholder          | Description     | Example Values                        |
| -------------------- | --------------- | ------------------------------------- |
| `{{value}}`          | Column name     | `user_id`, `first_name`, `email`      |
| `{{data_type}}`      | TypeScript type | `string`, `number`, `boolean`, `Date` |
| `{{is_nullable}}`    | Nullable flag   | `'YES'` or `'NO'`                     |
| `{{column_default}}` | Default value   | `'AUTO_INCREMENT'`, `null`            |
| `{{primary_key}}`    | Is primary key  | `true` or `undefined`                 |

---

## TEMPLATE EXAMPLES

### 1. types.txt (FILE_LOOP template - runs per table)

```
export interface I{{tableNamePascalCaseSingular}} {
[[LOOP(columnsInfo) --template="  {{value}}{% IF is_nullable EQUALS 'YES' %}?{% ENDIF %}: {{data_type}};" --separator="\n"]]
}

export type ICreate{{tableNamePascalCaseSingular}} = Omit<I{{tableNamePascalCaseSingular}}, '{{getPrimaryKey()}}' | 'created_at' | 'updated_at'>;
```

**Output for user table:**

```typescript
export interface IUser {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export type ICreateUser = Omit<IUser, 'user_id' | 'created_at' | 'updated_at'>;
```

### 2. routes-index.txt (CREATE_FILE template - uses LOOP(tables))

```
import { Router } from 'express';
[[LOOP(tables) --template="import { {{tableNameCamelCase}}Router } from './{{tableNameCamelCase}}.route.js';" --separator="\n"]]

export const router = Router();

[[LOOP(tables) --template="router.use('/{{tableNameKebabCasePlural}}', {{tableNameCamelCase}}Router);" --separator="\n"]]
```

**Output:**

```typescript
import { Router } from 'express';
import { userRouter } from './user.route.js';
import { postRouter } from './post.route.js';

export const router = Router();

router.use('/users', userRouter);
router.use('/posts', postRouter);
```

### 3. controller.txt (FILE_LOOP template)

```
import type { Request, Response } from 'express';
import { {{tableNamePascalCaseSingular}}Service } from '../services/{{tableNameCamelCase}}.service.js';

const service = new {{tableNamePascalCaseSingular}}Service();

export class {{tableNamePascalCaseSingular}}Controller {
  getAll = async (_req: Request, res: Response): Promise<void> => {
    const items = await service.getAll();
    res.json(items);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const item = await service.getById(Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: '{{tableNamePascalCaseSingular}} not found' });
      return;
    }
    res.json(item);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const item = await service.create(req.body);
    res.status(201).json(item);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const item = await service.update(Number(req.params.id), req.body);
    if (!item) {
      res.status(404).json({ error: '{{tableNamePascalCaseSingular}} not found' });
      return;
    }
    res.json(item);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const success = await service.delete(Number(req.params.id));
    if (!success) {
      res.status(404).json({ error: '{{tableNamePascalCaseSingular}} not found' });
      return;
    }
    res.status(204).send();
  };
}
```

### 4. route.txt (FILE_LOOP template)

```
import { Router } from 'express';
import { {{tableNamePascalCaseSingular}}Controller } from '../controllers/{{tableNameCamelCase}}.controller.js';

export const {{tableNameCamelCase}}Router = Router();
const controller = new {{tableNamePascalCaseSingular}}Controller();

{{tableNameCamelCase}}Router.get('/', controller.getAll);
{{tableNameCamelCase}}Router.get('/:id', controller.getById);
{{tableNameCamelCase}}Router.post('/', controller.create);
{{tableNameCamelCase}}Router.put('/:id', controller.update);
{{tableNameCamelCase}}Router.delete('/:id', controller.delete);
```

### 5. service.txt (FILE_LOOP template)

```
import type { I{{tableNamePascalCaseSingular}}, ICreate{{tableNamePascalCaseSingular}} } from '../types/{{tableNameCamelCase}}.types.js';
import { {{tableNameCamelCasePlural}}, getNext{{tableNamePascalCaseSingular}}Id } from '../db/{{tableNameCamelCase}}.store.js';

export class {{tableNamePascalCaseSingular}}Service {
  async getAll(): Promise<I{{tableNamePascalCaseSingular}}[]> {
    return {{tableNameCamelCasePlural}};
  }

  async getById(id: number): Promise<I{{tableNamePascalCaseSingular}} | undefined> {
    return {{tableNameCamelCasePlural}}.find((item) => item.{{getPrimaryKey()}} === id);
  }

  async create(data: ICreate{{tableNamePascalCaseSingular}}): Promise<I{{tableNamePascalCaseSingular}}> {
    const newItem: I{{tableNamePascalCaseSingular}} = {
      {{getPrimaryKey()}}: getNext{{tableNamePascalCaseSingular}}Id(),
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };
    {{tableNameCamelCasePlural}}.push(newItem);
    return newItem;
  }

  async update(id: number, data: Partial<ICreate{{tableNamePascalCaseSingular}}>): Promise<I{{tableNamePascalCaseSingular}} | undefined> {
    const index = {{tableNameCamelCasePlural}}.findIndex((item) => item.{{getPrimaryKey()}} === id);
    if (index === -1) return undefined;
    {{tableNameCamelCasePlural}}[index] = { ...{{tableNameCamelCasePlural}}[index], ...data, updated_at: new Date() };
    return {{tableNameCamelCasePlural}}[index];
  }

  async delete(id: number): Promise<boolean> {
    const index = {{tableNameCamelCasePlural}}.findIndex((item) => item.{{getPrimaryKey()}} === id);
    if (index === -1) return false;
    {{tableNameCamelCasePlural}}.splice(index, 1);
    return true;
  }
}
```

### 6. store.txt (FILE_LOOP template - in-memory storage)

```
import type { I{{tableNamePascalCaseSingular}} } from '../types/{{tableNameCamelCase}}.types.js';

export const {{tableNameCamelCasePlural}}: I{{tableNamePascalCaseSingular}}[] = [];

let {{tableNameCamelCase}}IdCounter = 1;
export const getNext{{tableNamePascalCaseSingular}}Id = (): number => {{tableNameCamelCase}}IdCounter++;
```

---

## CONDITIONAL SYNTAX

Use inside LOOP templates:

```
{% IF is_nullable EQUALS 'YES' %}?{% ENDIF %}
{% IF data_type EQUALS 'string' %}string{% ENDIF %}
{% IF data_type EQUALS 'number' %}number{% ENDIF %}
{% IF data_type EQUALS 'boolean' %}boolean{% ENDIF %}
{% IF data_type EQUALS 'Date' %}Date{% ENDIF %}
```

---

## TESTING GENERATED PROJECTS

### Step 1: Create Generation Script

Create `scripts/generate-express-api.ts`:

```typescript
import { buildProjectFiles } from '../src/utils/project-builder/buildProjectFiles.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';
import type { IFormStore } from '../src/useFormStore.ts';
import { frameworks } from '../src/useFormStore.ts';
import { CREATION_MODES } from '../src/constants.ts';
import oneToMany from '../src/schema-infos/oneToMany.ts';
import masterJSONSchema from '../src/json-schemas/masterJSONSchema.ts';
import type {
  IStructure,
  IFile,
  IFolder,
} from '../src/components/FileViewer.tsx';
import * as fs from 'node:fs';
import * as path from 'node:path';

const outputDir = process.argv[2] || 'C:/Users/Jude/Desktop/test/express-api';

const formData: IFormStore = {
  schemaInput: masterJSONSchema,
  backendUrl: 'http://localhost:5000',
  backendDir: outputDir,
  frontendDir: `${outputDir}/frontend`,
  dbConnection: 'postgresql://user:pass@localhost:5432/db',
  framework: frameworks.EXPRESS,
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: true,
  outputOnSingleFile: false,
  dbType: 'postgresql',
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: CREATION_MODES.SCHEMA_BUILDER,
  dbUsername: 'user',
  dbPassword: 'pass',
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: 'db',
  setCreationMode: (): void => {},
  setMasterSchema: (): void => {},
  setOneToOne: (): void => {},
  setOneToMany: (): void => {},
  setManyToMany: (): void => {},
  setDBType: (): void => {},
  setPublicRepoURL: (): void => {},
  setDbConnection: (): void => {},
};

function writeStructureToDisk(structure: IStructure, basePath: string): void {
  for (const item of structure) {
    const itemPath = path.join(basePath, item.name);
    if (item.type === 'file') {
      const file = item as IFile;
      fs.mkdirSync(path.dirname(itemPath), { recursive: true });
      if (file.isBinary === true) {
        fs.writeFileSync(itemPath, Buffer.from(file.content, 'base64'));
      } else {
        fs.writeFileSync(itemPath, file.content, 'utf-8');
      }
    } else {
      const folder = item as IFolder;
      fs.mkdirSync(itemPath, { recursive: true });
      writeStructureToDisk(folder.children, itemPath);
    }
  }
}

async function main(): Promise<void> {
  console.log('Loading scaffolder files...');
  const userFiles = convertLocalFilesToIStructure('files');

  console.log('Building project...');
  const result = await buildProjectFiles(
    '/Projects/App Generator - Express API/structure.yaml',
    userFiles,
    oneToMany,
    formData,
  );

  // Check for errors
  const errorFile = result.structure.find(
    (f) => f.type === 'file' && f.name.endsWith('.log'),
  );
  if (errorFile && errorFile.type === 'file') {
    console.error('Generation failed:');
    console.error(errorFile.content);
    process.exit(1);
  }

  console.log(`Writing to ${outputDir}...`);
  fs.mkdirSync(outputDir, { recursive: true });
  writeStructureToDisk(result.structure, outputDir);
  console.log('Done!');
}

main().catch(console.error);
```

### Step 2: Run Generation

```bash
cd ~/Desktop/scaffolder
bun run scripts/generate-express-api.ts ~/Desktop/test/express-api
```

### Step 3: Install Dependencies & Run

```bash
cd ~/Desktop/test/express-api
pnpm install  # or bun install
bun api/index.ts
```

### Step 4: Test with curl

```bash
curl http://localhost:5000/api/users
curl -X POST http://localhost:5000/api/users -H "Content-Type: application/json" -d '{"first_name":"John"}'
```

---

## IMPORTANT: INTEGRATING WITH CORE

When using `$USE_CORE: /Core/vite-react`, the core's `api/index.ts` does NOT automatically use your generated routes. You must either:

### Option A: Modify the core's api/index.ts

After generation, update `api/index.ts` to import and use the generated router:

```typescript
import express from 'express';
import cors from 'cors';
import { router } from './routes/index.js'; // Add this

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api', router); // Add this

app.listen(5000);
```

### Option B: Create a custom api/index.ts template

Add to your structure.yaml:

```yaml
$USE_CORE: /Core/vite-react
api:
  - CREATE_FILE(index.ts --template ./templates/api-index.txt)  # Override core's index.ts
  routes:
    - CREATE_FILE(index.ts --template ./templates/routes-index.txt)
    - FILE_LOOP(...)
```

---

## AVAILABLE SCHEMAS FOR TESTING

| Schema         | Tables               | Location                           |
| -------------- | -------------------- | ---------------------------------- |
| `oneToMany`    | user, post           | `src/schema-infos/oneToMany.ts`    |
| `masterSchema` | Multiple tables      | `src/schema-infos/masterSchema.ts` |
| `manyToMany`   | Tables with junction | `src/schema-infos/manyToMany.ts`   |

---

## COMMON MISTAKES TO AVOID

| Mistake                           | Problem                     | Fix                       |
| --------------------------------- | --------------------------- | ------------------------- |
| `[[ LOOP(tables)`                 | Space after `[[`            | Use `[[LOOP(tables)`      |
| `import { X } from './x.ts'`      | Wrong extension             | Use `./x.js`              |
| `template.ts`                     | Wrong file extension        | Use `template.txt`        |
| Hardcoding `user_id`              | Won't work for other tables | Use `{{getPrimaryKey()}}` |
| Using `LOOP(tables)` in FILE_LOOP | Already iterating tables    | Use placeholders directly |
| Missing `--separator`             | Output runs together        | Add `--separator="\n"`    |

---

## CHECKLIST FOR NEW PROJECT TEMPLATE

1. [ ] Create folder: `files/Projects/App Generator - {Name}/`
2. [ ] Create `structure.yaml` with `$USE_CORE` if needed
3. [ ] Create `templates/` folder with `.txt` files
4. [ ] Use `FILE_LOOP` for per-table files
5. [ ] Use `CREATE_FILE` with `[[LOOP(tables)]]` for index files
6. [ ] Use `.js` extension in imports
7. [ ] NO space after `[[` in template commands
8. [ ] Test with generation script
9. [ ] Verify API works with curl

---

## ONE-SHOT TEST PROMPT

Use this prompt in a new chat to test project generation end-to-end:

```
@agents/project-generator.md

Generate a working Express API project using the scaffolder system.

**Requirements:**
- Use the `oneToMany` schema (user → post tables)
- Output to `~/Desktop/test/express-api`
- Use `$USE_CORE: /Core/vite-react` for boilerplate

**Steps:**
1. Run `bun run scripts/generate-express-api.ts ~/Desktop/test/express-api`
2. Update `api/index.ts` to import and use the generated router from `./routes/index.js`
3. Install deps with `pnpm install` and run server with `bun api/index.ts`
4. Test endpoints: `curl http://localhost:5000/api/users` and `curl http://localhost:5000/api/posts`
5. Report which endpoints work and show sample responses

Execute all steps without stopping.
```
