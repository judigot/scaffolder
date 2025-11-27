# Build Configuration for Node.js/Vercel Backend

## Objective
Build a TypeScript backend application into a single `index.js` file in the `api/` folder for Vercel serverless functions.

## Solution: Direct esbuild Bundling

Since the codebase uses TypeScript import extensions (`.ts` in import paths), and TypeScript's `allowImportingTsExtensions` conflicts with JS emission, we use **esbuild directly** on TypeScript source files.

### Why esbuild?
- Handles TypeScript natively (no separate compilation step)
- Reads `tsconfig.json` for path alias resolution (`@/*`)
- Handles `.ts` extensions in imports automatically
- Built-in bundling and tree-shaking
- Extremely fast (~128ms for full build)

## Implementation

### Build Command
```bash
pnpm run build:api
```

### Build Script (`package.json`)
```json
{
  "build:bundle": "esbuild src/index.ts --bundle --platform=node --format=esm --target=node20 --outfile=api/index.js --minify --tree-shaking=true --tsconfig=tsconfig.vercel.json --external:express --external:cors --external:compression --external:dotenv --external:auth0 --external:@auth0/* --external:@octokit/* --external:jsonwebtoken --external:jwks-rsa --external:mysql2 --external:pg-pool --external:vite --external:lightningcss --external:@vitejs/* --external:prettier --external:@prettier/*",
  "build:api": "cross-env NODE_ENV=production npm run build:bundle && node -e \"const fs=require('fs');const f='api/index.js';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/import\\.meta\\.env/g,'process.env'));if(fs.existsSync('temp'))fs.rmSync('temp',{recursive:true,force:true})\""
}
```

### What the Build Does
1. **Bundle**: Compiles TypeScript directly to JavaScript
2. **Tree-shake**: Removes unused code
3. **Minify**: Reduces file size
4. **Externalize**: Keeps Node.js dependencies external (Vercel provides them)
5. **Post-process**: Replaces `import.meta.env` with `process.env` for Node.js compatibility
6. **Cleanup**: Removes `temp/` folder if it exists (safety measure)

### External Dependencies
These are marked external because Vercel provides them at runtime:
- `express`, `cors`, `compression` - Web server
- `dotenv` - Environment variables
- `auth0`, `@auth0/*` - Authentication
- `@octokit/*` - GitHub API
- `jsonwebtoken`, `jwks-rsa` - JWT handling
- `mysql2`, `pg-pool` - Database drivers
- `vite`, `lightningcss`, `@vitejs/*` - Build tools (not needed at runtime)
- `prettier`, `@prettier/*` - Code formatting (not needed at runtime)

### TypeScript Config (`tsconfig.vercel.json`)
```json
{
  "compilerOptions": {
    "outDir": "./temp",
    "rootDir": "./src",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "paths": { "@/*": ["./src/*"] },
    "target": "ESNext",
    "lib": ["ESNext"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.tsx", "src/**/*.jsx"]
}
```

## Output
- **File**: `api/index.js`
- **Format**: ESM (ES Modules)
- **Target**: Node.js 20+
- **Size**: ~1MB (minified, tree-shaken)

## Best Practices Applied

1. **Single Bundle**: One file for Vercel serverless deployment
2. **Tree-shaking**: Dead code elimination for smaller bundles
3. **External Dependencies**: Runtime dependencies provided by Vercel
4. **ESM Format**: Modern module system
5. **Minification**: Reduced file size for faster cold starts
6. **Environment Variable Handling**: Proper `process.env` support

## File Structure
```
src/
  ├── index.ts (entry point)
  ├── app/
  │   ├── routes/
  │   └── services/
  └── utils/
api/
  └── index.js (bundled output for Vercel)
```
