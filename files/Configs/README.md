# Reusable Configs

Centralized configuration files for consistent project setup. These sync to [scaffolder-files](https://github.com/judigot/scaffolder-files) for public access.

## Available Configs

| File | Purpose |
|------|---------|
| `eslint.config.js` | Strict TypeScript + React linting with Next.js auto-detection |
| `biome.json` | Fast linting with strict a11y and security rules |
| `.prettierrc` | Code formatting preferences |
| `vitest.config.ts` | Test configuration with path aliases |
| `postcss.config.js` | PostCSS with Tailwind CSS |
| `tailwind.config.js` | Tailwind CSS configuration |

## ESLint Features

- **Next.js auto-detection** - Automatically applies Next.js rules when detected
- **Test globals** - `describe`, `it`, `expect`, `vi`, etc. available without imports
- **Strict TypeScript** - Type-checked rules enabled
- **No enums** - Enforces object literals over TypeScript enums
- **Interface prefix** - Requires `I` prefix for interfaces (e.g., `IUser`)

## Usage in Scaffolder Templates

Reference these configs in structure.yaml:
```yaml
$COPY: Configs/eslint.config.js
$COPY: Configs/.prettierrc
```

## Usage in Stock Projects

Fetch directly from scaffolder-files:
```bash
curl -sO https://raw.githubusercontent.com/judigot/scaffolder-files/main/Configs/eslint.config.js
```
