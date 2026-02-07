# Golden Project Tests

**These are the most critical tests in the scaffolder.**

Golden tests validate the complete end-to-end pipeline:

```
Schema + Project Template + Core Modules → Generated Application
```

## Why "Golden"?

These tests serve as the **final judge** of the scaffolder product. They verify that:

1. **Templates process correctly** - All syntax (`@LOOP`, `<@@IF@@>`, `{{placeholders}}`) resolves
2. **Core modules merge properly** - `$USE_CORE` imports combine without conflicts
3. **Generated code is valid** - Output passes formatting (no syntax errors)
4. **File structure is correct** - Expected folders and files are created

If golden tests pass, users can trust the scaffolder to generate working applications.

## Test Files

| File | Purpose |
|------|---------|
| `all-projects.test.ts` | **TRUE GOLDEN TEST** - Dynamically tests ALL complete projects × ALL schemas |
| `hono-react.test.ts` | Tests hono-react project specifically (subset of above) |

## How `all-projects.test.ts` Works

1. **Discovers complete projects** - Finds all projects with `$USE_CORE` directive
2. **Loads all schemas** - Uses schemas from `src/schema-infos/`
3. **Tests every combination** - Project × Schema matrix
4. **Writes output to disk** - Generated files in `output/{project}/{schema}/`

```
Current coverage:
├── App Generator - Express React  × 5 schemas = 5 tests
└── hono-react                     × 5 schemas = 5 tests
                                              = 10 combinations + discovery tests
```

## Adding New Complete Projects

To have a project automatically tested by the golden test:

1. Create project in `files/Projects/{project-name}/`
2. Include `$USE_CORE` directive in `structure.yaml`
3. Run tests - it will be discovered and tested automatically

```yaml
# structure.yaml
$USE_CORE:
  - /Core/bun-base
  - /Core/your-api-framework
  # ...
```

## Running Golden Tests

```bash
# Run all golden tests
bun test src/tests/golden-projects/

# Run the true golden test (all projects × all schemas)
bun test src/tests/golden-projects/all-projects.test.ts

# Run specific project test
bun test src/tests/golden-projects/hono-react.test.ts
```

## Inspecting Generated Output

After running tests, generated files are written to:

```
src/tests/golden-projects/output/
├── App Generator - Express React/
│   ├── oneToOne/          # Full app generated with oneToOne schema
│   ├── oneToMany/
│   ├── manyToMany/
│   ├── masterSchema/
│   └── userRoles/
└── hono-react/
    ├── oneToOne/
    └── ...
```

## Failure Protocol

If a golden test fails:

1. **Do not merge** - These are blocking tests
2. **Check the error** - Usually unprocessed template syntax
3. **Review `filesFailedToFormat`** - Shows exactly what broke
4. **Fix the template** - Not the test (templates are the source of truth)

## Schema Test Cases

| Schema | Description |
|--------|-------------|
| oneToOne | User ↔ Profile relationship |
| oneToMany | User → Posts relationship |
| manyToMany | Products ↔ Orders with pivot |
| masterSchema | Complex schema with all relationship types |
| userRoles | Users, Roles, UserRoles pivot |

## Runtime Tests

Beyond static golden tests, runtime tests verify that generated apps actually work end-to-end.

### What Runtime Tests Verify

1. **Dependencies install** - `bun install` succeeds
2. **Migrations run** - Database schema is created
3. **Seed data loads** - Initial data is inserted correctly
4. **Server starts** - App runs without errors
5. **API works** - All CRUD endpoints respond correctly

### Running Runtime Tests

```bash
# Scaffold a project, then run the full runtime test
./src/tests/golden-projects/runtime-test.sh

# Or run the generated api-test.sh directly
./api-test.sh http://localhost:3000/api
```

### Runtime Test Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  runtime-test.sh                                                │
├─────────────────────────────────────────────────────────────────┤
│  1. bun install            → Install dependencies               │
│  2. bun run db:generate    → Generate Drizzle client            │
│  3. bun run db:push        → Push schema to database            │
│  4. bun run db:seed        → Seed with test data                │
│  5. bun run dev &          → Start server in background         │
│  6. ./api-test.sh          → Run CRUD tests on all endpoints    │
└─────────────────────────────────────────────────────────────────┘
```

### Auto-Generated `api-test.sh`

Every scaffolded project includes an `api-test.sh` script that tests all CRUD endpoints. This is generated from a shared template at `/Templates/testing/api-test.txt`.

The template uses these placeholders:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{tableName.titleCase}}` | Human-readable name | `Order Product` |
| `{{tableName.kebabCase}}` | API endpoint path | `order-product` |
| `{{primaryKey}}` | Primary key field name | `orderProductId` |
| `{{createPayload}}` | JSON for POST request | `{"orderId":1,"productId":1}` |
| `{{updatePayload}}` | JSON for PUT request | `{"orderId":1,"productId":1}` |

The script tests each table with the **C→R→U→R→D→R** pattern:
- **C**reate → **R**ead → **U**pdate → **R**ead (verify) → **D**elete → **R**ead (404)

### Adding `api-test.sh` to Projects

In your project's `structure.yaml`, add:

```yaml
CREATE_FILE(api-test.sh --template /Templates/testing/api-test.txt):
```

The template is in a shared location (`/Templates/testing/`) to avoid duplication across projects.
