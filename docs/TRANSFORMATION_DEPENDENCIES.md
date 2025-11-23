# Transformation Dependencies

## Overview

Transformations (code generation) in this application depend on asynchronous data loading. All transformation functions must wait for required dependencies to be loaded before executing.

## Rule: Transformations Must Wait for Dependencies

**Transformations must come after `userFiles`, `typeMappings`, and `dbTypes` have been set.**

### Why This Rule Exists

1. **Type Mappings Are Loaded Asynchronously**: The `typeMappings` are parsed from `typeMappings.yaml` file which is loaded asynchronously when `userFiles` are fetched from the repository.

2. **Database Types Are Loaded Asynchronously**: The `dbTypes` are parsed from `dbTypes.yaml` file which is loaded asynchronously when `userFiles` are fetched from the repository. This allows the system to support multiple database types dynamically (postgresql, mysql, sqlite, mssql, etc.).

3. **No Fallback Values**: The system does not use fallback/default values for type mappings or database types. Transformations will fail or produce incorrect results if executed before these are available.

4. **Data Integrity**: Waiting ensures that all transformations use the correct type mappings and database types as defined in the user's configuration files.

### Implementation Details

#### In Application Code (`App.tsx`)

The `useEffect` hook that triggers transformations includes `typeMappings` in its dependency array and only executes when `typeMappings` is available:

```typescript
useEffect(() => {
  if (!typeMappings || Object.keys(typeMappings).length === 0) {
    return;
  }
  if (!dbTypes || dbTypes.length === 0) {
    return;
  }
  setTransformations();
}, [
  dbType,
  includeInsertData,
  includeTypeGuards,
  schemaInfo,
  typeMappings, // Required dependency
  dbTypes, // Required dependency
  setTransformations,
]);
```

#### In Store (`useTransformationsStore.ts`)

The `setTransformations` function relies on the checks in `App.tsx` to ensure `typeMappings` and `dbTypes` are available before it's called. The strict checks are enforced at the application level.

#### In Utility Functions (`common.ts`)

The `getTypeMapping` function retrieves type mappings from the store. The `generateColumnDefinition` function uses dynamic `dbTypes` to determine if a column type is a database definition:

```typescript
const getTypeMappings = (): Record<PropertyKey, unknown> => {
  const storeTypeMappings = useMockDatabaseStore.getState().typeMappings;
  if (!storeTypeMappings || Object.keys(storeTypeMappings).length === 0) {
    return {};
  }
  return storeTypeMappings;
};

// In generateColumnDefinition:
const dbTypes = useMockDatabaseStore.getState().dbTypes;
const isDBDefinition =
  dbTypes !== undefined &&
  dbTypes.length > 0 &&
  typeof columnType === 'string' &&
  dbTypes.includes(columnType);
```

**Note**: The system waits for actual type mappings and database types to be loaded from the user's repository before running transformations.

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

The following test files require `typeMappings` and `dbTypes` to be set up:

- `src/tests/generateTypescriptInterfaces.test.ts`
- `src/tests/generateSQLSchema.test.ts`
- `src/tests/convertIntrospectedStructure.test.ts`
- `src/tests/identifySchema.test.ts`
- Any test that uses `getTypeMapping`, `generateColumnDefinition`, `extractDBConnectionInfo`, or transformation functions

The test helper `setupTypeMappings()` automatically sets up both `typeMappings` and `dbTypes` from their respective YAML files.

### Functions That Require Type Mappings and Database Types

The following functions depend on `typeMappings` and `dbTypes` being available:

- `getTypeMapping()` - Maps column types to target language types (requires `typeMappings`)
- `generateColumnDefinition()` - Generates column definitions for SQL/TypeScript (requires `typeMappings` and `dbTypes`)
- `generateTypescriptInterfaces()` - Generates TypeScript interface definitions (requires `typeMappings`)
- `generateSQLSchema()` - Generates SQL CREATE TABLE statements (requires `typeMappings` and `dbTypes`)
- `extractDBConnectionInfo()` - Validates database connection strings against loaded `dbTypes`

### Loading Sequence

1. User provides GitHub repository URL
2. `userFiles` are fetched asynchronously
3. `setUserFiles()` is called, which:
   - Parses `typeMappings.yaml` from the Constants folder
   - Parses `dbTypes.yaml` from the Constants folder
   - Sets `typeMappings` and `dbTypes` in the store
4. `useEffect` in `App.tsx` detects `typeMappings` and `dbTypes` changes
5. `setTransformations()` is called only when both are available
6. Transformations execute with correct type mappings and database types

### Best Practices

1. **Always check for `typeMappings`**: Before executing any transformation, verify that `typeMappings` is available.

2. **Use the test helper**: In tests, always use `setupTypeMappings()` and `teardownTypeMappings()` to ensure clean test state.

3. **Don't use fallbacks in production**: The fallback mechanism in `getTypeMappings()` is for testing only. Production code should wait for the actual type mappings to load.

4. **Document dependencies**: When creating new transformation functions, document their dependency on `typeMappings`.

