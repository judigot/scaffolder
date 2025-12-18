---
title: Schema Management API
---

# Schema Management API

Technical reference for the Schema Management API endpoints and services.

## Overview

The Schema Management API provides endpoints for saving, loading, and deleting schema files in both local development and production (GitHub) environments.

## API Endpoints

### Save Local File

**Endpoint**: `POST /save-local-file`

**Description**: Saves a file to the local filesystem (development mode only).

**Request Body**:
```json
{
  "filePath": "Schemas/my-schema.json",
  "content": "[{\"tableName\": \"users\", ...}]"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File saved successfully",
  "filePath": "Schemas/my-schema.json"
}
```

**Errors**:
- `400`: Invalid file path or content
- `500`: File system error

### Delete Local File

**Endpoint**: `POST /delete-local-file`

**Description**: Deletes a file from the local filesystem (development mode only).

**Request Body**:
```json
{
  "filePath": "Schemas/my-schema.json"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully",
  "filePath": "Schemas/my-schema.json"
}
```

**Errors**:
- `400`: Invalid file path
- `404`: File not found
- `500`: File system error

### Create GitHub File

**Endpoint**: `POST /create-github-file`

**Description**: Creates or updates a file in a GitHub repository (production mode).

**Authentication**: Requires Auth0 Bearer token in Authorization header.

**Request Body**:
```json
{
  "publicRepoURL": "https://github.com/owner/repo",
  "filePath": "Schemas/my-schema.json",
  "content": "[{\"tableName\": \"users\", ...}]",
  "commitMessage": "Update schema: my-schema.json",
  "branch": "main"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File created successfully",
  "url": "https://github.com/owner/repo/blob/main/Schemas/my-schema.json"
}
```

**Errors**:
- `400`: Missing required fields, invalid URL, or USE_USER_ENV detected
- `401`: Authentication required
- `500`: GitHub API error

### Delete GitHub File

**Endpoint**: `POST /delete-github-file`

**Description**: Deletes a file from a GitHub repository (production mode).

**Authentication**: Requires Auth0 Bearer token in Authorization header.

**Request Body**:
```json
{
  "publicRepoURL": "https://github.com/owner/repo",
  "filePath": "Schemas/my-schema.json",
  "commitMessage": "Delete schema: my-schema.json",
  "branch": "main"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Errors**:
- `400`: Missing required fields, invalid URL, or file not found
- `401`: Authentication required
- `500`: GitHub API error

## Service Layer

### Schema Service

The `schemaService.ts` module provides high-level functions for schema operations:

#### `saveSchema(params: ISaveSchemaParams)`

Saves a schema to either local files or GitHub repository based on environment.

**Parameters**:
- `schemaName`: Name of the schema (without .json extension)
- `content`: Schema content as `ISchemaInfo[]`
- `publicRepoURL`: GitHub repository URL (production mode)
- `getAccessToken`: Function to get Auth0 access token (production mode)

**Returns**: `Promise<ISchemaOperationResult>`

#### `deleteSchema(params: IDeleteSchemaParams)`

Deletes a schema from either local files or GitHub repository based on environment.

**Parameters**:
- `schemaName`: Name of the schema (without .json extension)
- `publicRepoURL`: GitHub repository URL (production mode)
- `getAccessToken`: Function to get Auth0 access token (production mode)

**Returns**: `Promise<ISchemaOperationResult>`

## Environment Detection

The system automatically detects the environment using:

```typescript
const isProduction = import.meta.env.PROD;
export const isUsingLocalFiles = !isProduction;
```

- **Development**: `isUsingLocalFiles = true` → Uses local file endpoints
- **Production**: `isUsingLocalFiles = false` → Uses GitHub API endpoints

## Schema Store

The `useSchemaStore` Zustand store manages schema state:

### State

- `availableSchemas`: Array of available schema files
- `selectedSchemaName`: Currently selected schema name (null for master)
- `originalSchemaContent`: Original schema content for dirty tracking
- `isSaving`: Saving operation in progress
- `isDeleting`: Deletion operation in progress
- `saveError`: Error message from save operation
- `deleteError`: Error message from delete operation

### Actions

- `loadSchemasFromUserFiles(userFiles)`: Extract schemas from user files structure
- `selectSchema(schemaName)`: Select and load a schema
- `setOriginalSchemaContent(content)`: Set original content for dirty tracking
- `isDirty(currentContent)`: Check if schema has unsaved changes
- `generateUniqueSchemaName(baseName)`: Generate unique schema name
- `generateDuplicateName(originalName)`: Generate duplicate schema name

## Schema File Format

Schemas are stored as JSON arrays of `ISchemaInfo` objects (full format):

```json
[
  {
    "tableName": "users",
    "columnsInfo": [
      {
        "column_name": "user_id",
        "data_type": "number",
        "is_nullable": "NO",
        "primary_key": true
      }
    ],
    "hasOne": ["profile"],
    "hasMany": ["posts"]
  }
]
```

**Important**: Schema files should always use the **full format** (`ISchemaInfo[]`) for:
- Human readability
- Version control (easier Git diffs)
- Complete information preservation
- AI agent readability

For API payloads and network transmission, use the **compressed format** (`ISchemaInfoSlim`). See the [Schema Formats Guide](/documentation/api-reference/schema-management/schema-formats/) for detailed information on when to use each format.

## Security

### Path Traversal Protection

All file operations include path traversal protection:

- Paths are normalized and validated
- Only paths within `src/files/` are allowed
- Relative paths (`../`) are stripped

### GitHub Authentication

Production mode requires:

- Valid Auth0 authentication token
- GitHub token configured in user settings
- Repository access permissions

### Content Validation

- Schema JSON is validated before saving
- Invalid JSON is rejected with clear error messages
- File paths are sanitized and validated

## Error Handling

All operations return structured error responses:

```typescript
interface ISchemaOperationResult {
  success: boolean;
  message: string;
  error?: string;
}
```

Errors are displayed in the UI with actionable messages.

## Conversion Utilities

The application provides utilities to convert between full and compressed schema formats:

```typescript
import { convertSchema } from '@/utils/convertSchemaFormat';

// Convert full format to compressed (for API payloads)
const compressed = convertSchema({
  schema: fullSchema,
  target: 'compressed',
});

// Convert compressed format to full (after receiving from API)
const full = convertSchema({
  schema: compressedSchema,
  target: 'full',
});
```

See the [Schema Formats Guide](/documentation/api-reference/schema-management/schema-formats/) for detailed usage guidelines.

## Related Documentation

- [Schema Formats Guide](/documentation/api-reference/schema-management/schema-formats/) - **When to use full vs compressed format**
- [Schema Management Feature](/features/schema-management/) - User guide for schema management
- [Schemas Directory](/documentation/structure/repository-folders/schemas/) - Schema file organization

