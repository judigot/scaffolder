# Transformation Dependencies

## Overview

Transformations (code generation) in this application depend on asynchronous data loading. All transformation functions must wait for required dependencies to be loaded before executing.

## Rule: Transformations Must Wait for Dependencies

**Transformations must come after `userFiles` and `typeMappings` have been set.**

### Why This Rule Exists

1. **Type Mappings Are Loaded Asynchronously**: The `typeMappings` are parsed from `typeMappings.yaml` file which is loaded asynchronously when `userFiles` are fetched from the repository.

2. **No Fallback Values**: The system does not use fallback/default values for type mappings. Transformations will fail or produce incorrect results if executed before type mappings are available.

3. **Data Integrity**: Waiting ensures that all transformations use the correct type mappings as defined in the user's configuration files.

### Implementation Details

#### In Application Code (`App.tsx`)

The `useEffect` hook that triggers transformations includes `typeMappings` in its dependency array and only executes when `typeMappings` is available:

```typescript
useEffect(() => {
  if (typeMappings) {
    setTransformations();
  }
}, [
  dbType,
  includeInsertData,
  includeTypeGuards,
  schemaInfo,
  typeMappings, // Required dependency
  setTransformations,
]);
```

#### In Store (`useTransformationsStore.ts`)

The `setTransformations` function checks for `typeMappings` before executing:

```typescript
setTransformations: (tempSchemaInfo?: ISchemaInfo[] | null) => {
  const { typeMappings } = useMockDatabaseStore.getState();
  
  // ... other code ...
  
  if (!typeMappings) {
    return; // Exit early if typeMappings not available
  }
  
  // ... proceed with transformations ...
}
```

#### In Utility Functions (`common.ts`)

The `getTypeMapping` function uses a fallback mechanism that checks the store first, then falls back to default mappings from `@/utils/mappings.ts` if the store is empty:

```typescript
const getTypeMappings = (): Record<PropertyKey, unknown> => {
  const storeTypeMappings = useMockDatabaseStore.getState().typeMappings;
  if (!storeTypeMappings || Object.keys(storeTypeMappings).length === 0) {
    return fallbackTypeMappings; // From @/utils/mappings.ts
  }
  return storeTypeMappings;
};
```

**Note**: The fallback mechanism ensures that tests and initial application load work correctly, but in production, the system waits for actual type mappings to be loaded from the user's repository.

### Testing

When writing tests for transformation functions, you must set up `typeMappings` before running the tests.

#### Test Helper

Use the test helper to set up and tear down type mappings:

```typescript
import {
  setupTypeMappings,
  teardownTypeMappings,
} from '@/tests/helpers/setupTypeMappings.ts';

describe('MyTest', () => {
  beforeEach(() => {
    setupTypeMappings();
  });

  afterEach(() => {
    teardownTypeMappings();
  });

  it('should work correctly', () => {
    // Your test code here
  });
});
```

#### Affected Test Files

The following test files require `typeMappings` to be set up:

- `src/tests/generateTypescriptInterfaces.test.ts`
- `src/tests/generateSQLSchema.test.ts`
- Any test that uses `getTypeMapping`, `generateColumnDefinition`, or transformation functions

### Functions That Require Type Mappings

The following functions depend on `typeMappings` being available:

- `getTypeMapping()` - Maps column types to target language types
- `generateColumnDefinition()` - Generates column definitions for SQL/TypeScript
- `generateTypescriptInterfaces()` - Generates TypeScript interface definitions
- `generateSQLSchema()` - Generates SQL CREATE TABLE statements

### Loading Sequence

1. User provides GitHub repository URL
2. `userFiles` are fetched asynchronously
3. `setUserFiles()` is called, which:
   - Parses `typeMappings.yaml` from the Constants folder
   - Sets `typeMappings` in the store
4. `useEffect` in `App.tsx` detects `typeMappings` change
5. `setTransformations()` is called
6. Transformations execute with correct type mappings

### Best Practices

1. **Always check for `typeMappings`**: Before executing any transformation, verify that `typeMappings` is available.

2. **Use the test helper**: In tests, always use `setupTypeMappings()` and `teardownTypeMappings()` to ensure clean test state.

3. **Don't use fallbacks in production**: The fallback mechanism in `getTypeMappings()` is for testing only. Production code should wait for the actual type mappings to load.

4. **Document dependencies**: When creating new transformation functions, document their dependency on `typeMappings`.

