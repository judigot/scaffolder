# Core Configs Module

Reusable configuration files for generated projects.

**Note:** These files mirror `/Configs/` which syncs to scaffolder-files for external access.

## Included Configs

| File | Purpose |
|------|---------|
| `eslint.config.js` | Strict TypeScript + React + Next.js auto-detection |
| `biome.json` | Fast linting with strict a11y and security |
| `.prettierrc` | Code formatting preferences |
| `vitest.config.ts` | Test configuration with path aliases |
| `postcss.config.js` | PostCSS with Tailwind CSS |
| `tailwind.config.js` | Tailwind CSS configuration |

## Usage

Add to your project's `$USE_CORE`:

```yaml
$USE_CORE:
  - /Core/vite-react
  - /Core/configs    # Add this line
```
