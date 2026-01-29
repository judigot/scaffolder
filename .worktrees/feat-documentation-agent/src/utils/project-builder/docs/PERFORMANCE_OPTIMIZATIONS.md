# Performance Optimizations

This document describes performance optimizations implemented in the project builder system to improve responsiveness and reduce unnecessary computation.

## Early Return Strategy for User Files Loading

### Problem

When the application reloads after clearing the project cache, a race condition occurs:

1. `selectedProject` is restored from localStorage (persisted state)
2. `userFiles` starts as an empty array (not persisted)
3. `buildProjectFilesForProject` is called before `userFiles` are fetched from the API
4. The build process attempts to find files in an empty structure, wasting CPU cycles

### Solution

Two-level early return strategy:

#### 1. Component Level (`App.tsx`)

The `useEffect` hook checks prerequisites before triggering the build:

```typescript
const hasSelectedProject = selectedProject !== null;
const hasUser = user !== null;
const hasUserFiles = storeUserFiles.length > 0;
const canBuildProject = hasSelectedProject && hasUser && hasUserFiles;

if (canBuildProject) {
  // Build project files
}
```

**Benefits:**
- Prevents unnecessary async function calls when data isn't ready
- Automatically rebuilds when `userFiles` become available (via dependency array)

#### 2. Store Level (`useProjectStore.ts`)

The `buildProjectFilesForProject` function returns early if `userFiles` are empty:

```typescript
const hasNoUserFiles = allUserFiles.length === 0;
if (hasNoUserFiles) {
  return {
    structure: [/* error log file */],
    filesUsingUserEnv: [],
    filesFailedToFormat: [],
  };
}
```

**Benefits:**
- Prevents expensive operations (YAML parsing, file searching, structure processing)
- Returns immediately with a clear error message instead of going through the entire build pipeline

### Performance Impact

**Before optimization:**
- Build function called even with empty `userFiles`
- Full build pipeline executed (YAML parsing, file searching, structure processing)
- Error detected at the end after wasting CPU cycles

**After optimization:**
- Build function only called when prerequisites are met
- Early return prevents unnecessary computation
- Automatic rebuild when data becomes available

### Implementation Details

- **Location**: `src/App.tsx` (component level) and `src/useProjectStore.ts` (store level)
- **Dependencies**: `storeUserFiles` added to `useEffect` dependency array to trigger rebuild when files load
- **Error Handling**: Returns user-friendly error log file instead of crashing

## Best Practices

When implementing similar optimizations:

1. **Check prerequisites early**: Validate data availability before expensive operations
2. **Use boolean variables**: Make conditions readable with descriptive variable names
3. **Leverage React dependencies**: Include data in dependency arrays to trigger automatic updates
4. **Return meaningful errors**: Provide clear feedback when prerequisites aren't met

