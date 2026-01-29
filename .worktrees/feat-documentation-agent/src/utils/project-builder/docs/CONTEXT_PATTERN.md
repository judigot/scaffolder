# Build Context Pattern

This document describes the `IBuildContext` pattern used throughout the project builder system for managing shared state and reducing parameter passing.

## Overview

The project builder uses a **context object pattern** to pass shared data between functions, eliminating the need to pass 8-10 individual parameters to every function. This pattern improves maintainability, reduces coupling, and makes it easier to extend functionality.

## The Problem

Previously, functions required many individual parameters:

```typescript
// Before: Too many parameters
function processFile(
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  projectYamlPath: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown>,
  table?: ISchemaInfo,
  dataContext?: DataContext,
  currentPath?: string,
  // ... more parameters
) {
  // Function body
}
```

This approach had several issues:
- **Parameter explosion**: Functions needed 8-10+ parameters
- **Maintenance burden**: Adding new context required updating all function signatures
- **Error-prone**: Easy to pass parameters in wrong order
- **Hard to extend**: Adding new context data required changes across many files

## The Solution

The `IBuildContext` interface provides a single object containing all shared data:

```typescript
export interface IBuildContext {
  // Core data (always present)
  readonly userFiles: IStructure;
  readonly schemaInfo: ISchemaInfo[];
  readonly schemaInfoParsed: ISchemaInfoResult;
  readonly projectYamlPath: string;

  // Optional form/user data
  readonly formData?: IFormStore;
  readonly userMetadata?: Record<string, unknown> | null;

  // Contextual data (varies per scope)
  readonly table?: ISchemaInfo;
  readonly dataContext?: DataContext;
  readonly currentPath?: string;

  // Command-specific (used during YAML processing)
  readonly node?: unknown;
  readonly command?: string;
  readonly folderName?: string;
  readonly children?: unknown;
  readonly options?: IActionFlags;

  // Callbacks
  readonly onFileUsingUserEnv?: (filePath: string) => void;
  readonly onFileFailedToFormat?: (filePath: string, errorMessage: string) => void;
}
```

## Usage Pattern

### Creating Context

Use the `createContext` helper function to create initial context:

```typescript
import { createContext } from '@/utils/project-builder/helpers/contextHelpers';

const ctx = createContext(
  userFiles,
  schemaInfo,
  schemaInfoParsed,
  projectYamlPath,
  formData,
  userMetadata,
);
```

### Passing Context

Functions accept a single `ctx` parameter:

```typescript
// After: Single context parameter
function processFile(ctx: BuildContext) {
  // Access context properties
  const { userFiles, schemaInfo, table } = ctx;
  // Function body
}
```

### Modifying Context

Use the **spread operator** to create new context objects with modifications:

```typescript
// Create new context with table added
const ctxWithTable = { ...ctx, table: currentTable };

// Create new context with path updated
const ctxWithPath = { ...ctx, currentPath: newPath };

// Create new context with multiple changes
const updatedCtx = {
  ...ctx,
  table: currentTable,
  dataContext: newDataContext,
  currentPath: newPath,
};
```

### Helper Functions

The `contextHelpers.ts` file provides helper functions for common modifications:

```typescript
import {
  withTable,
  withPath,
  withDataContext,
  withUpdates,
} from '@/utils/project-builder/helpers/contextHelpers';

// Add table to context
const ctxWithTable = withTable(ctx, currentTable);

// Update path
const ctxWithPath = withPath(ctx, newPath);

// Update data context
const ctxWithData = withDataContext(ctx, newDataContext);

// Multiple updates at once
const updatedCtx = withUpdates(ctx, {
  table: currentTable,
  currentPath: newPath,
});
```

## Benefits

### 1. Reduced Parameter Count

**Before:**
```typescript
function processYamlStructure(
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  projectYamlPath: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown>,
  table?: ISchemaInfo,
  dataContext?: DataContext,
  currentPath?: string,
  // ... more
) { }
```

**After:**
```typescript
function processYamlStructure(ctx: IBuildContext) { }
```

### 2. Easier Extension

Adding new context properties only requires:
1. Updating `IBuildContext` interface
2. Updating `createContext` function
3. All other code automatically inherits the new property via spread operator

**Example:**
```typescript
// Add new property to interface
export interface IBuildContext {
  // ... existing properties
  readonly newProperty?: string; // New property
}

// Update createContext
export const createContext = (
  // ... existing parameters
  newProperty?: string, // New parameter
): IBuildContext => ({
  // ... existing properties
  newProperty, // New property
});

// All existing code automatically gets access via spread:
const newCtx = { ...ctx, newProperty: 'value' }; // Works automatically!
```

### 3. Type Safety

TypeScript ensures all context properties are correctly typed:

```typescript
// TypeScript will catch errors
const ctx: IBuildContext = {
  userFiles, // ✓ Correct type
  schemaInfo, // ✓ Correct type
  invalidProperty: 'value', // ✗ TypeScript error
};
```

### 4. Immutability

The `readonly` modifier ensures context objects are immutable:

```typescript
// This won't compile (readonly property)
ctx.userFiles = newFiles; // ✗ TypeScript error

// Instead, create a new context
const newCtx = { ...ctx, userFiles: newFiles }; // ✓ Correct
```

## Implementation Details

### Context Creation

The `createContext` function is the single source of truth for context creation:

```typescript
export const createContext = (
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  projectYamlPath: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  table?: ISchemaInfo,
  dataContext?: DataContext,
  currentPath?: string,
  node?: unknown,
  command?: string,
  folderName?: string,
  children?: unknown,
  options?: IActionFlags,
  onFileUsingUserEnv?: (filePath: string) => void,
  onFileFailedToFormat?: (filePath: string, errorMessage: string) => void,
): IBuildContext => ({
  userFiles,
  schemaInfo,
  schemaInfoParsed,
  projectYamlPath,
  formData,
  userMetadata,
  table,
  dataContext,
  currentPath,
  node,
  command,
  folderName,
  children,
  options,
  onFileUsingUserEnv,
  onFileFailedToFormat,
});
```

### Context Propagation

Context is propagated through the call stack using spread syntax:

```typescript
// In processYamlStructure
function processYamlStructure(ctx: IBuildContext) {
  // Process current node
  processNode(ctx);

  // Recursively process children with updated context
  for (const child of children) {
    processYamlStructure({
      ...ctx,
      node: child,
      currentPath: newPath,
    });
  }
}
```

### Context Updates

When updating context, always create a new object:

```typescript
// ✓ Correct: Create new context
const updatedCtx = { ...ctx, table: newTable };

// ✗ Wrong: Mutate existing context
ctx.table = newTable; // Don't do this!
```

## Best Practices

### 1. Always Use Spread for Updates

```typescript
// ✓ Good
const newCtx = { ...ctx, table: newTable };

// ✗ Bad
ctx.table = newTable;
```

### 2. Use Helper Functions for Common Patterns

```typescript
// ✓ Good: Use helper
const ctxWithTable = withTable(ctx, newTable);

// ✓ Also good: Direct spread
const ctxWithTable = { ...ctx, table: newTable };
```

### 3. Keep Context Immutable

```typescript
// ✓ Good: Create new context
function processWithTable(ctx: IBuildContext, table: ISchemaInfo) {
  const ctxWithTable = { ...ctx, table };
  processFile(ctxWithTable);
}

// ✗ Bad: Mutate context
function processWithTable(ctx: IBuildContext, table: ISchemaInfo) {
  ctx.table = table; // Don't mutate!
  processFile(ctx);
}
```

### 4. Pass Full Context, Not Individual Properties

```typescript
// ✓ Good: Pass full context
function processFile(ctx: IBuildContext) {
  const { userFiles, schemaInfo } = ctx;
  // Use properties
}

// ✗ Bad: Destructure and pass individual properties
function processFile({ userFiles, schemaInfo }: IBuildContext) {
  // This works but breaks the pattern
}
```

## Migration Guide

If you need to add new context properties:

1. **Update the interface:**
   ```typescript
   export interface IBuildContext {
     // ... existing properties
     readonly newProperty?: string;
   }
   ```

2. **Update createContext:**
   ```typescript
   export const createContext = (
     // ... existing parameters
     newProperty?: string,
   ): IBuildContext => ({
     // ... existing properties
     newProperty,
   });
   ```

3. **Update call sites:**
   ```typescript
   const ctx = createContext(
     // ... existing arguments
     newPropertyValue, // Add new argument
   );
   ```

4. **Use in functions:**
   ```typescript
   function myFunction(ctx: IBuildContext) {
     const { newProperty } = ctx; // Access new property
   }
   ```

## Related Files

- `src/utils/project-builder/interfaces/interfaces.ts` - `IBuildContext` interface definition
- `src/utils/project-builder/helpers/contextHelpers.ts` - Context creation and helper functions
- `src/utils/project-builder/project-processors/processYamlStructure.ts` - Main recursive processor using context

## Summary

The context object pattern provides:
- ✅ Reduced parameter count (from 8-10 to 1)
- ✅ Easier extension (add properties in one place)
- ✅ Type safety (TypeScript ensures correctness)
- ✅ Immutability (readonly properties prevent mutations)
- ✅ Better maintainability (single source of truth)

This pattern is used throughout the project builder system and is the recommended approach for passing shared data between functions.

