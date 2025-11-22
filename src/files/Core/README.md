# Shared Core Files

Reusable core templates that can be imported by multiple projects.

## Usage

### Single Core Import
```yaml
$USE_CORE: /Core/vite

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

### Multiple Core Imports
```yaml
$USE_CORE:
  - /Core/vite
  - /Core/react
  - /Core/extra

src:
  IMPORT_PROJECT(Projects/Template - Frontend/structure.yaml):
```

## Override Priority

**Lowest to Highest (later wins):**

1. First core import
2. Second core import
3. ...
4. Last core import
5. **Local `core/` folder** (always highest priority)

## Example

```yaml
# structure.yaml
$USE_CORE:
  - /Core/vite      # Base
  - /Core/react     # Overrides vite

# Local core/package.json overrides both imported versions
```

**Result:**
- Files from `/Core/vite` (base layer)
- Files from `/Core/react` (overrides vite)
- Files from local `core/` (overrides everything)

## Creating Core Templates

1. Create folder in `src/files/Core/`
2. Add your template files
3. Reference in `structure.yaml` with `$USE_CORE:`

```
Core/
└── my-template/
    ├── .eslintrc.json
    ├── tsconfig.json
    └── src/
        └── utils/
```

Use:
```yaml
$USE_CORE: /Core/my-template
```

## Notes

- The `core/` and `Core/` folders are automatically excluded from final output
- Only the contents are merged into your project structure
- Use local `core/` folder for project-specific overrides

