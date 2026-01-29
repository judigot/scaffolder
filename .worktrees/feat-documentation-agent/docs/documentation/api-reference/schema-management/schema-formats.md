---
title: Schema Formats Guide
---

# Schema Formats Guide

This guide explains the two schema formats available in the application and when to use each format appropriately.

## Overview

The application supports two schema formats:

1. **Full Format (`ISchemaInfo[]`)** - Complete, explicit schema representation
2. **Compressed Format (`ISchemaInfoSlim`)** - Minimal, payload-optimized schema representation

Both formats represent the same database schema information but differ in their verbosity and use cases.

## Format Comparison

### Full Format (`ISchemaInfo[]`)

The full format is a comprehensive schema representation with all properties explicitly defined.

**Characteristics:**
- ✅ All properties are explicit (even when `false` or `undefined`)
- ✅ Includes inferred relationships (`hasOne`, `hasMany`, `belongsTo`, `belongsToMany`)
- ✅ Includes computed properties (`requiredColumns`, `foreignKeys`, `foreignTables`, `childTables`)
- ✅ Includes relationship metadata (`pivotRelationships`)
- ✅ Larger payload size
- ✅ Better for development and debugging
- ✅ Self-documenting structure

**Example:**
```typescript
const fullSchema: ISchemaInfo[] = [
  {
    tableName: 'users',
    columnsInfo: [
      {
        column_name: 'user_id',
        data_type: 'number',
        is_nullable: 'NO',
        primary_key: true,
        unique: undefined,
        foreign_key: undefined,
      },
      {
        column_name: 'email',
        data_type: 'string',
        is_nullable: 'NO',
        unique: true,
      },
    ],
    requiredColumns: ['user_id', 'email'],
    foreignKeys: [],
    foreignTables: [],
    childTables: ['posts'],
    hasOne: [],
    hasMany: ['posts'],
    belongsTo: [],
    belongsToMany: [],
    pivotRelationships: [],
  },
];
```

### Compressed Format (`ISchemaInfoSlim`)

The compressed format is a minimal representation that only includes explicitly `true` values.

**Characteristics:**
- ✅ Only `true` values are explicit
- ✅ `false`, `undefined`, `null`, `'NO'`, and empty arrays are omitted
- ✅ Smaller payload size (typically 40-60% reduction)
- ✅ Better for network transmission
- ✅ Requires inference for missing properties
- ✅ Less verbose, harder to read for humans

**Example:**
```typescript
const compressedSchema: ISchemaInfoSlim = [
  {
    tableName: 'users',
    columns: [
      {
        name: 'user_id',
        type: 'number',
        primaryKey: true,
        // nullable omitted (inferred as false)
        // unique omitted (inferred as false)
      },
      {
        name: 'email',
        type: 'string',
        unique: true,
        // nullable omitted (inferred as false)
      },
    ],
    // requiredColumns omitted (can be inferred)
    // hasMany omitted (can be inferred from foreign keys)
    // childTables omitted (can be inferred)
  },
];
```

## When to Use Each Format

### Use Full Format (`ISchemaInfo[]`) For:

#### ✅ **Local Storage (localStorage)**
Store schemas in full format in `localStorage` for:
- **Faster access** - No conversion needed when loading
- **Complete information** - All relationships and metadata available immediately
- **Development convenience** - Easier to debug and inspect
- **State management** - Zustand stores work better with complete data

```typescript
// ✅ CORRECT: Store full format in localStorage
const persistConfig: PersistOptions = {
  name: 'transformationsData',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    schemaInfo: state.schemaInfo, // ISchemaInfo[]
  }),
};
```

#### ✅ **Schema Files (Repository Storage)**
Save schemas to files in full format for:
- **Version control** - Easier to review diffs in Git
- **Human readability** - Developers can read and understand schemas
- **AI readability** - Better context for AI agents analyzing schemas
- **Long-term storage** - Complete information preserved

```typescript
// ✅ CORRECT: Save full format to files
await saveSchema({
  schemaName: 'my-schema',
  content: fullSchema, // ISchemaInfo[]
  publicRepoURL: 'https://github.com/owner/repo',
});
```

#### ✅ **Internal Application State**
Use full format for internal state management:
- **Zustand stores** - Complete data structures
- **Component state** - All properties available
- **Transformations** - Relationship inference already done
- **Development tools** - SchemaBuilder, validators, etc.

```typescript
// ✅ CORRECT: Use full format internally
const { schemaInfo } = useTransformationsStore.getState();
// schemaInfo is ISchemaInfo[]
```

#### ✅ **API Responses (Receiving)**
When receiving schemas from APIs, prefer full format:
- **Complete data** - No inference needed
- **Type safety** - All properties typed
- **Validation** - Easier to validate complete structures

### Use Compressed Format (`ISchemaInfoSlim`) For:

#### ✅ **API Payloads (Sending)**
Send compressed format in API requests for:
- **Reduced bandwidth** - Smaller payloads (40-60% reduction)
- **Faster transmission** - Less data to transfer
- **Cost savings** - Lower data transfer costs
- **Better performance** - Faster serialization/deserialization

```typescript
// ✅ CORRECT: Send compressed format to API
const compressed = convertSchema({
  schema: fullSchema,
  target: 'compressed',
});

await fetch('/api/schemas', {
  method: 'POST',
  body: JSON.stringify(compressed), // ISchemaInfoSlim
});
```

#### ✅ **WebSocket Messages**
Use compressed format for real-time updates:
- **Lower latency** - Smaller messages transmit faster
- **Reduced bandwidth** - Important for high-frequency updates
- **Better scalability** - Less server resources needed

```typescript
// ✅ CORRECT: Send compressed format via WebSocket
const compressed = convertSchema({
  schema: fullSchema,
  target: 'compressed',
});

websocket.send(JSON.stringify({
  type: 'schema-update',
  data: compressed, // ISchemaInfoSlim
}));
```

#### ✅ **Caching (When Size Matters)**
Use compressed format in caches when:
- **Cache size limits** - Limited storage available
- **Memory constraints** - Running in memory-constrained environments
- **CDN storage** - Storing in CDN with size limits

```typescript
// ✅ CORRECT: Cache compressed format
const compressed = convertSchema({
  schema: fullSchema,
  target: 'compressed',
});

cache.set('schema-key', compressed, { ttl: 3600 });
```

## Conversion Between Formats

The application provides a unified conversion utility to transform between formats.

### Converting Full → Compressed

```typescript
import { convertSchema } from '@/utils/convertSchemaFormat';

const fullSchema: ISchemaInfo[] = [/* ... */];

const compressed = convertSchema({
  schema: fullSchema,
  target: 'compressed',
});
// Returns: ISchemaInfoSlim
```

**What happens:**
- Only `true` values are kept
- `false`, `undefined`, `null`, `'NO'`, and empty arrays are omitted
- Property names are shortened (`columnsInfo` → `columns`, `column_name` → `name`)
- Relationship arrays are omitted (can be inferred)

### Converting Compressed → Full

```typescript
import { convertSchema } from '@/utils/convertSchemaFormat';

const compressedSchema: ISchemaInfoSlim = [/* ... */];

const full = convertSchema({
  schema: compressedSchema,
  target: 'full',
});
// Returns: ISchemaInfo[]
```

**What happens:**
- Missing properties are inferred (e.g., `nullable: undefined` → `is_nullable: 'NO'`)
- `foreign_column_name` is inferred from foreign table's primary key
- Relationship arrays are computed (`hasOne`, `hasMany`, `belongsTo`, etc.)
- Computed properties are added (`requiredColumns`, `foreignKeys`, etc.)

### Round-Trip Conversion

The conversion is **lossless** - converting full → compressed → full preserves all data:

```typescript
const original: ISchemaInfo[] = [/* ... */];

// Convert to compressed
const compressed = convertSchema({
  schema: original,
  target: 'compressed',
});

// Convert back to full
const restored = convertSchema({
  schema: compressed,
  target: 'full',
});

// original and restored are equivalent
expect(restored).toEqual(original);
```

## Best Practices

### ✅ DO

1. **Store full format locally**
   - Use `ISchemaInfo[]` in `localStorage` and Zustand stores
   - Save `ISchemaInfo[]` to schema files

2. **Convert before sending**
   - Always convert to compressed format before API calls
   - Convert before WebSocket messages

3. **Convert after receiving**
   - Convert compressed format to full format after receiving from API
   - Use full format for internal processing

4. **Use type guards**
   - Check format before conversion
   - Validate schema format before use

```typescript
import { isISchemaInfoArray } from '@/interfaces/interfaces';

if (isISchemaInfoArray(schema)) {
  // It's full format
  const compressed = convertSchema({ schema, target: 'compressed' });
} else {
  // It's compressed format
  const full = convertSchema({ schema, target: 'full' });
}
```

### ❌ DON'T

1. **Don't store compressed format locally**
   - Avoid storing `ISchemaInfoSlim` in `localStorage`
   - Don't save compressed format to files

2. **Don't send full format over network**
   - Avoid sending `ISchemaInfo[]` in API payloads
   - Don't use full format in WebSocket messages

3. **Don't mix formats**
   - Don't use compressed format in Zustand stores
   - Don't use full format in API payloads

4. **Don't assume format**
   - Always check format before conversion
   - Don't assume schema format without validation

## Storage Strategy Summary

| Storage Location | Format | Reason |
|-----------------|--------|--------|
| **localStorage** | Full (`ISchemaInfo[]`) | Fast access, complete data |
| **Zustand Stores** | Full (`ISchemaInfo[]`) | Complete state management |
| **Schema Files** | Full (`ISchemaInfo[]`) | Human-readable, version control |
| **API Payloads (Send)** | Compressed (`ISchemaInfoSlim`) | Smaller size, faster transmission |
| **API Responses (Receive)** | Full (`ISchemaInfo[]`) | Complete data, no inference needed |
| **WebSocket Messages** | Compressed (`ISchemaInfoSlim`) | Lower latency, reduced bandwidth |
| **Cache (Size Matters)** | Compressed (`ISchemaInfoSlim`) | Memory efficiency |

## Migration Guide

If you have existing code using schemas, follow these steps:

### Step 1: Identify Storage Locations

Find all places where schemas are stored or transmitted:
- `localStorage` persistence
- API calls (sending/receiving)
- WebSocket messages
- File storage

### Step 2: Apply Format Rules

- **Storage**: Keep as full format
- **Transmission**: Convert to compressed before sending

### Step 3: Add Conversion Points

```typescript
// Before sending to API
const compressed = convertSchema({
  schema: fullSchema,
  target: 'compressed',
});
await api.saveSchema(compressed);

// After receiving from API
const response = await api.getSchema();
const full = convertSchema({
  schema: response,
  target: 'full',
});
```

### Step 4: Update Type Annotations

Ensure types are correct:
```typescript
// Storage
const schemaInfo: ISchemaInfo[] = [/* ... */];

// Transmission
const payload: ISchemaInfoSlim = convertSchema({
  schema: schemaInfo,
  target: 'compressed',
});
```

## Performance Considerations

### Payload Size Reduction

The compressed format typically reduces payload size by:
- **40-60%** for typical schemas
- **Up to 70%** for schemas with many relationships
- **30-40%** for simple schemas

### Conversion Overhead

Conversion is fast but adds overhead:
- **Full → Compressed**: ~1-5ms for typical schemas
- **Compressed → Full**: ~2-10ms (includes inference)

**Recommendation**: Convert at boundaries (API calls) rather than frequently.

### Memory Usage

- **Full format**: Higher memory usage, faster access
- **Compressed format**: Lower memory usage, requires conversion

**Recommendation**: Use full format for frequently accessed data, compressed for transmission.

## Examples

### Complete Workflow Example

```typescript
import { convertSchema } from '@/utils/convertSchemaFormat';
import type { ISchemaInfo, ISchemaInfoSlim } from '@/interfaces/interfaces';

// 1. Load from localStorage (full format)
const storedSchema: ISchemaInfo[] = JSON.parse(
  localStorage.getItem('schema') ?? '[]'
);

// 2. Use full format internally
const { setSchemaInfo } = useTransformationsStore.getState();
setSchemaInfo(storedSchema);

// 3. Convert before sending to API
const compressed: ISchemaInfoSlim = convertSchema({
  schema: storedSchema,
  target: 'compressed',
});

await fetch('/api/schemas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(compressed),
});

// 4. Convert after receiving from API
const response = await fetch('/api/schemas/123');
const receivedCompressed: ISchemaInfoSlim = await response.json();

const receivedFull: ISchemaInfo[] = convertSchema({
  schema: receivedCompressed,
  target: 'full',
});

// 5. Store full format
localStorage.setItem('schema', JSON.stringify(receivedFull));
setSchemaInfo(receivedFull);
```

## Related Documentation

- [Schema Management API](/documentation/api-reference/schema-management/) - API reference
- [Schema Management Feature](/features/schema-management/) - User guide
- [Schema Conversion Utility](/documentation/api-reference/schema-management/#conversion-utilities) - Conversion API
