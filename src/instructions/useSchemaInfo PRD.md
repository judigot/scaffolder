# **PRD: `useSchemaInfo` with Current Schema Format**

## **1. Overview**

This PRD describes how to implement a `useSchemaInfo` function that **accepts the existing schema format** and provides an API to derive essential information about each table (e.g., table names, pivot tables, relationships, foreign keys, etc.). The existing format includes properties like `columnsInfo`, `requiredColumns`, `childTables`, `foreignKeys`, etc.

---

## **2. Objectives**

1. **Retain Existing Format**: Continue using the current schema structure with minimal changes.
2. **Provide Derived Data**: Return core metadata such as table names, pivot tables, columns, relationships, and constraints in a uniform way.
3. **Ease of Adoption**: Developers can drop in this function without needing to refactor existing schema definitions.

---

## **3. Scope**

### **In-Scope**

- **Single Entry Point**: A function (tentatively named `useSchemaInfo`) that takes an array of schema objects in the current format.
- **Derived Metadata**:
  - **Table Names**: Gather all `tableName` values.
  - **Pivot Tables**: Identify those with `isPivot: true`.
  - **Primary Keys**: Identify the first column with `primary_key: true`.
  - **Required Columns**: Identify columns that are considered non-nullable (or appear in `requiredColumns`).
  - **Child Tables**: Identify tables referencing a given table (from `childTables` or from foreign key definitions).
  - **Relationships**: Combine `hasMany`, `belongsTo`, and `belongsToMany` data into a cohesive structure.

### **Out-of-Scope**

- **Schema Validation**: The function will not validate or enforce data constraints.
- **React Integration**: Despite the `use` prefix, this PRD describes a generic utility function, not a React hook.
- **UI or Code Generation**: The function only returns data; scaffolding UI components or generating migrations is not included here.

---

## **4. Functional Requirements**

1. **Accept the Current Schema Structure**:
   - Each table has:
     - **`tableName`**: A string.
     - **`requiredColumns`**: A string array of required column names.
     - **`columnsInfo`**: An array of objects with fields like `column_name`, `data_type`, `is_nullable`, `column_default`, `primary_key`, and possibly a `foreign_key`.
     - **`childTables`**: A string array listing tables that reference this table.
     - **`hasMany`**, **`belongsTo`**, **`belongsToMany`**: Arrays describing relationship types.
     - **`pivotRelationships`**: An array of objects (e.g., `{ relatedTable: string, pivotTable: string }`).
     - **`foreignTables`** and **`foreignKeys`** (optional in some definitions).
     - **`isPivot`**: A boolean for pivot tables.

2. **Return a Structured Object** containing:
   - **`schema`**: The unmodified input array for direct reference.
   - **`tableNames`** (`string[]`): All table names.
   - **`pivotTables`** (`string[]`): All tables marked as `isPivot`.
   - **`getPrimaryKey(tableName: string): string`**: Returns the first primary key column name for the specified table.
   - **`getForeignTables(tableName: string): string[]`**: Returns the foreign tables array.
   - **`getRequiredColumns(tableName: string): string[]`**: Returns columns that are required (from `requiredColumns` or `is_nullable: 'NO'`).
   - **`getColumnsInfo(tableName: string): IColumnInfo[]`**: Returns the `columnsInfo` array for that table.
   - **`getChildTables(tableName: string): string[]`**: Returns the `childTables` array.
   - **`getRelationships(tableName: string): IRelationships`**: Returns all relationships in a single object.
   - **`isPivot(tableName: string): boolean`**: Returns whether a table is a pivot table.

3. **Type Definitions**:

   ```typescript
   interface IRelationships {
     hasOne?: string[];
     hasMany?: string[];
     belongsTo?: string[];
     belongsToMany?: string[];
     pivotRelationships?: {
       relatedTable: string;
       pivotTable: string;
     }[];
   }

   interface ISchemaInfoResult {
     schema: ISchemaInfo[];
     tableNames: string[];
     pivotTables: string[];
     getPrimaryKey: (tableName: string) => string;
     getForeignTables: (tableName: string) => string[];
     getRequiredColumns: (tableName: string) => string[];
     getColumnsInfo: (tableName: string) => IColumnInfo[];
     getChildTables: (tableName: string) => string[];
     getRelationships: (tableName: string) => IRelationships;
     isPivot: (tableName: string) => boolean;
   }
   ```

---

## **5. Non-Functional Requirements**

1. **Performance**:
   - Uses Map for efficient table lookups
   - Handles typical usage with tens or hundreds of tables efficiently
2. **Error Handling**:
   - Returns empty arrays/objects for nonexistent tables
   - Returns empty string for nonexistent primary keys
3. **Type Safety**:
   - Full TypeScript support with strict type checking
   - Explicit interfaces for all return types

---

## **6. Sample Usage**

```typescript
import useSchemaInfo from '@/utils/useSchemaInfo';
import type { ISchemaInfo } from '@/interfaces/interfaces';

const mockSchema: ISchemaInfo[] = [
  {
    tableName: 'users',
    columnsInfo: [
      {
        column_name: 'id',
        data_type: 'integer',
        is_nullable: 'NO',
        primary_key: true,
      },
      // ... more columns
    ],
    requiredColumns: ['email'],
    childTables: ['posts'],
    hasMany: ['posts'],
    belongsTo: [],
  },
  // ... more tables
];

const {
  schema,
  tableNames,
  pivotTables,
  getPrimaryKey,
  getForeignTables,
  getRequiredColumns,
  getColumnsInfo,
  getChildTables,
  getRelationships,
  isPivot,
} = useSchemaInfo(mockSchema);

// Usage examples
console.log(getPrimaryKey('users')); // 'id'
console.log(isPivot('post_tags')); // true
console.log(getRequiredColumns('users')); // ['id', 'email']
```

---

## **7. Implementation Details**

1. **Table Mapping**:
   - Uses a Map for O(1) table lookups
   - Caches table information for efficient access

2. **Return Values**:
   - Empty string for nonexistent primary keys
   - Empty arrays for nonexistent tables' relationships
   - Empty objects for nonexistent tables' relationships
   - `false` for nonexistent tables' pivot check

3. **Nullish Coalescing**:
   - Uses `??` operator for optional fields
   - Ensures consistent handling of undefined values

---

## **8. Testing Requirements**

1. **Test Cases**:
   - Basic table operations (names, pivots)
   - Primary key retrieval
   - Required columns identification
   - Relationship mapping
   - Edge cases (nonexistent tables)
   - Pivot table identification

2. **Mock Data**:
   - Representative schema with various relationships
   - Includes pivot and non-pivot tables
   - Covers all relationship types

---

## **9. Success Criteria**

- **Type Safety**: No any types, proper interfaces
- **Error Handling**: Graceful handling of missing data
- **Performance**: O(1) lookups for most operations
- **Usability**: Clear, consistent API surface

---

## **10. Future Enhancements**

1. **Phase 1 (Current)**:
   - Basic schema information retrieval
   - Relationship mapping
   - Pivot table handling

2. **Phase 2 (Future)**:
   - Advanced relationship helpers
   - Schema validation options
   - Performance optimizations
   - Additional utility functions

---

This PRD reflects the current implementation of `useSchemaInfo`, focusing on providing a robust, type-safe way to access and manipulate schema information.
