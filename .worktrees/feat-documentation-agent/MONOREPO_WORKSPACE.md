# Monorepo Workspace Guide

This monorepo follows industry best practices for enterprise-grade TypeScript monorepos using pnpm workspaces, Turborepo, and Changesets.

## Overview

This project uses pnpm workspaces with **Turborepo** and **Changesets** for an enterprise-grade monorepo setup.

## Architecture

```
.
├── apps/                    # Applications
├── packages/                # Shared packages
│   ├── eslint-config/      # Shared ESLint configuration
│   ├── tsconfig/           # Shared TypeScript configurations
│   └── shared-utils/       # Shared utilities
├── .changeset/             # Changeset version management
├── turbo.json              # Turborepo task orchestration
└── pnpm-workspace.yaml     # pnpm workspace configuration
```

## Key Technologies

### pnpm Workspaces
- **Isolated node_modules**: Each package has its own dependencies
- **Workspace protocol**: `workspace:*` for internal dependencies
- **Hoisting**: Only ESLint, Prettier, and @types/* are hoisted
- **Fast**: Disk space efficient package manager

### Turborepo
- **Task orchestration**: Intelligent task execution with dependency awareness
- **Caching**: Build outputs cached for faster subsequent builds
- **Parallel execution**: Tasks run in parallel when possible
- **Incremental builds**: Only rebuild what changed

### Changesets
- **Version management**: Coordinated versioning across packages
- **Changelog generation**: Automatic changelog from changesets
- **Release automation**: CI/CD integration for publishing
- **Semantic versioning**: Enforced versioning strategy

## Workspace Configuration

- **`pnpm-workspace.yaml`**: Defines workspace packages (`apps/*` and `packages/*`)
- **`turbo.json`**: Turborepo task orchestration and caching configuration
- **`.changeset/config.json`**: Changesets version management configuration
- **`.npmrc`**: pnpm configuration with workspace-optimized settings
- **`package.json`**: Root package with workspace scripts

## Package Structure

### Shared Packages

All packages follow this structure:

```
package-name/
├── package.json           # Package manifest
├── tsconfig.json          # Extends @bigbang/tsconfig
├── src/
│   └── index.ts          # Main entry point
├── dist/                  # Build output (gitignored)
└── README.md             # Package documentation
```

### Package Naming

- **Scope**: All packages use `@bigbang/` scope
- **Naming**: kebab-case (e.g., `@bigbang/shared-utils`)
- **Private**: All packages are `private: true`

## Best Practices

### Package Naming

All packages should use the `@bigbang/` scope:

```json
{
  "name": "@bigbang/package-name"
}
```

### Workspace Protocol

Always use `workspace:*` for internal dependencies:

```json
{
  "dependencies": {
    "@bigbang/shared-utils": "workspace:*"
  }
}
```

### Export Maps

Use proper export maps in `package.json`:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

### TypeScript Configuration

- Packages extend `packages/tsconfig.base.json` or `@bigbang/tsconfig/base.json`
- Use `composite: true` for project references
- Build outputs go to `dist/`

## Development Workflow

### Adding a New Package

1. Create package directory:
   ```bash
   mkdir -p packages/my-package/src
   ```

2. Create `package.json`:
   ```json
   {
     "name": "@bigbang/my-package",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.js",
         "default": "./dist/index.js"
       }
     },
     "files": ["dist", "README.md"],
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch",
       "clean": "rm -rf dist *.tsbuildinfo",
       "typecheck": "tsc --noEmit",
       "lint": "eslint src --ext .ts,.tsx",
       "test": "vitest"
     }
   }
   ```

3. Create `tsconfig.json`:
   ```json
   {
     "extends": "@bigbang/tsconfig/base.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src",
       "composite": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. Create `src/index.ts`

5. Run `pnpm install` to link the package

### Using Workspace Packages

Add dependency using workspace protocol:

```json
{
  "dependencies": {
    "@bigbang/shared-utils": "workspace:*"
  }
}
```

Import normally:

```typescript
import { something } from '@bigbang/shared-utils';
```

## Commands

### Development

```bash
# Run dev in all workspaces (with Turborepo caching)
pnpm workspace:dev

# Run dev in specific workspace
pnpm --filter @bigbang/shared-utils dev

# Run dev in all packages
pnpm --filter './packages/*' dev
```

### Building

```bash
# Build all workspaces (dependency-aware, cached)
pnpm workspace:build

# Build specific workspace
pnpm --filter @bigbang/shared-utils build

# Build all apps
pnpm --filter './apps/*' build

# Build all packages
pnpm --filter './packages/*' build
```

### Testing

```bash
# Test all workspaces
pnpm workspace:test

# Test specific workspace
pnpm --filter @bigbang/shared-utils test
```

### Linting & Type Checking

```bash
# Lint all workspaces
pnpm workspace:lint

# Type check all workspaces
pnpm workspace:typecheck
```

### Clean

```bash
# Clean all workspaces
pnpm workspace:clean
```

### Version Management

```bash
# Create a changeset (interactive)
pnpm changeset

# Version packages based on changesets
pnpm version-packages

# Release packages (build + publish)
pnpm release
```

## Running Commands in Specific Workspaces

```bash
# Run command in a specific package
pnpm --filter @bigbang/shared-utils dev

# Run command in all apps
pnpm --filter './apps/*' build

# Run command in all packages
pnpm --filter './packages/*' test

# Run command recursively (all workspaces)
pnpm -r build
```

## Installing Dependencies

```bash
# Add to root
pnpm add <package>

# Add to specific workspace
pnpm --filter @bigbang/shared-utils add <package>

# Add to all workspaces
pnpm -r add <package>

# Add dev dependency
pnpm --filter @bigbang/shared-utils add -D <package>
```

## Build Order

When building, packages are built before apps that depend on them:

```bash
pnpm workspace:build
```

This ensures:
1. All packages in `packages/*` are built first
2. Then all apps in `apps/*` are built

Turborepo handles this automatically via `dependsOn: ["^build"]` in `turbo.json`.

## Turborepo Pipeline

Tasks are defined in `turbo.json`:

- **build**: Depends on `^build` (build dependencies first)
- **test**: Depends on `^build` (test after dependencies built)
- **lint**: No dependencies, runs in parallel
- **typecheck**: Depends on `^build` (type check after dependencies built)
- **dev**: No caching, persistent process

### Cache Behavior

- Build outputs are cached
- Cache is invalidated when:
  - Source files change
  - Dependencies change
  - Environment variables change (if specified)

### Viewing Cache

```bash
# View cache status
turbo run build --dry-run

# Clear cache
turbo run build --force
```

## Version Management with Changesets

### Creating a Changeset

1. Run `pnpm changeset`
2. Select packages to version
3. Choose version bump (patch, minor, major)
4. Write changelog entry

### Releasing

1. Changesets are committed to `.changeset/`
2. CI creates a PR with version bumps
3. After merge, CI publishes packages

### Manual Release

```bash
# Version packages
pnpm version-packages

# Build and publish
pnpm release
```

## TypeScript Project References

Packages use TypeScript's project references for:

- **Faster builds**: Incremental compilation
- **Better IDE support**: Cross-package navigation
- **Type safety**: Ensures dependencies are built

### Adding References

In `tsconfig.json`:

```json
{
  "references": [
    { "path": "../shared-utils" }
  ]
}
```

## Enterprise Features

### Performance
- **Cached builds**: 10-30 seconds
- **Incremental builds**: 5-15 seconds
- **Parallel execution**: All independent tasks
- **Remote caching**: Ready for CI/CD

### Scalability
- **Unlimited packages**: Add as many as needed
- **Dependency-aware**: Builds in correct order
- **Type-safe**: Full TypeScript support
- **Modular**: Clear package boundaries

### Maintainability
- **Shared configs**: One source of truth
- **Automated releases**: No manual versioning
- **Clear structure**: Standardized layout
- **Documentation**: Comprehensive guides

### Security
- **Private packages**: All packages are private
- **Lockfile**: Committed for reproducibility
- **Dependency audit**: Built into pnpm
- **No secrets**: No secrets in packages

## Enterprise-Grade Checklist

- [x] Task orchestration (Turborepo)
- [x] Build caching
- [x] Version management (Changesets)
- [x] TypeScript project references
- [x] Shared ESLint/TypeScript configs
- [x] CI/CD pipelines
- [x] Pre-commit hooks
- [x] Dependency isolation
- [x] Workspace protocol
- [x] Documentation
- [x] Git ignore patterns
- [x] Package structure standards

## Best Practices Summary

### 1. Dependency Management

- **Centralize common deps**: Add to root `package.json`
- **Use workspace protocol**: Always `workspace:*` for internal deps
- **Avoid duplication**: Let pnpm handle deduplication

### 2. Build Order

- Packages build before apps
- Turborepo handles this automatically via `dependsOn: ["^build"]`

### 3. Testing

- Unit tests in each package
- Integration tests in apps
- E2E tests at root level

### 4. Code Quality

- Shared ESLint config: `@bigbang/eslint-config`
- Shared TypeScript config: `@bigbang/tsconfig`
- Pre-commit hooks: Husky + lint-staged

### 5. Documentation

- Each package has a README
- Document public API
- Include usage examples

## CI/CD

### Continuous Integration

- Runs on every push/PR
- Builds all packages
- Runs tests
- Type checks
- Lints code

### Continuous Deployment

- Releases on merge to main
- Uses Changesets for versioning
- Publishes to npm (if configured)

## Troubleshooting

### Cache Issues

```bash
# Clear Turborepo cache
turbo run build --force

# Clear pnpm cache
pnpm store prune
```

### Dependency Issues

```bash
# Reinstall all dependencies
rm -rf node_modules **/node_modules
pnpm install
```

### TypeScript Issues

```bash
# Rebuild TypeScript project references
pnpm workspace:build
```

## Performance

### Build Times

- First build: ~2-5 minutes (depending on size)
- Cached build: ~10-30 seconds
- Incremental build: ~5-15 seconds

### Optimization Tips

1. Use Turborepo caching
2. Leverage TypeScript project references
3. Build only what changed
4. Run tests in parallel

## Industry Alignment

This setup aligns with practices used by:
- **Vercel** (Turborepo creators)
- **Microsoft** (Rush/Changesets)
- **Google** (Bazel monorepo patterns)
- **Meta** (Large-scale monorepos)
- **Netflix** (Monorepo best practices)

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Build all packages:**
   ```bash
   pnpm workspace:build
   ```

3. **Run development:**
   ```bash
   pnpm workspace:dev
   ```

4. **Create a changeset:**
   ```bash
   pnpm changeset
   ```

## Notes

- All packages are `private: true` (not published to npm)
- Use `workspace:*` protocol for internal dependencies
- Build outputs should be in `dist/` and gitignored
- Source files should be in `src/`
