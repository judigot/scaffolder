# USE_USER_ENV Template Command Guide

## Overview
The `USE_USER_ENV` command allows you to access user environment variables stored in Auth0 user metadata within templates. These variables are typically used for API keys, database connection strings, and other sensitive configuration values that vary per user.

## Syntax

```
[[USE_USER_ENV(VAR_NAME)]]
```

### Parameters

- **VAR_NAME**: The name of the environment variable to access from the user's metadata.

## How It Works

1. **User Metadata**: Environment variables are stored in the user's Auth0 metadata under the `env` property.
2. **Variable Resolution**: The system looks up the variable name in `userMetadata.env`.
3. **Value Conversion**: Values are automatically converted to strings for display.
4. **Graceful Degradation**: If user metadata is unavailable (e.g., Auth0 Management API credentials are missing), the placeholder is replaced with an empty string.

## Behavior When Metadata is Unavailable

The project builder works gracefully without Auth0 Management API credentials:

- **Missing Metadata**: If user metadata cannot be fetched, `USE_USER_ENV` placeholders are replaced with empty strings
- **Missing Variable**: If a specific variable doesn't exist in the user's metadata, the placeholder is replaced with an empty string
- **File Tracking**: Files containing `USE_USER_ENV` are tracked in the `filesUsingUserEnv` array, so users know which files need environment variables

## Value Type Handling

### Strings
```yaml
# User metadata structure:
env:
  API_KEY: "sk-1234567890abcdef"
```
```
[[USE_USER_ENV(API_KEY)]]
```
Output: `sk-1234567890abcdef`

### Numbers
```yaml
env:
  PORT: 3000
```
```
[[USE_USER_ENV(PORT)]]
```
Output: `3000`

### Booleans
```yaml
env:
  DEBUG: true
```
```
[[USE_USER_ENV(DEBUG)]]
```
Output: `true`

### Arrays
```yaml
env:
  ALLOWED_ORIGINS: ["http://localhost:3000", "https://example.com"]
```
```
[[USE_USER_ENV(ALLOWED_ORIGINS)]]
```
Output: `http://localhost:3000,https://example.com`

### Objects
```yaml
env:
  DATABASE_CONFIG:
    host: "localhost"
    port: 5432
```
```
[[USE_USER_ENV(DATABASE_CONFIG)]]
```
Output: `{"host":"localhost","port":5432}` (JSON stringified)

### Null/Undefined/Missing
```
[[USE_USER_ENV(NONEXISTENT_VAR)]]
```
Output: (empty string)

## Usage Examples

### Example 1: API Configuration
```typescript
// config.ts template
export const config = {
  apiKey: '[[USE_USER_ENV(API_KEY)]]',
  apiUrl: '[[USE_USER_ENV(API_URL)]]',
  environment: '[[USE_USER_ENV(ENVIRONMENT)]]',
};
```

Generated output (when variables are set):
```typescript
export const config = {
  apiKey: 'sk-1234567890abcdef',
  apiUrl: 'https://api.example.com',
  environment: 'production',
};
```

Generated output (when metadata unavailable):
```typescript
export const config = {
  apiKey: '',
  apiUrl: '',
  environment: '',
};
```

### Example 2: Database Connection String
```typescript
// database.ts template
const connectionString = `postgresql://[[USE_USER_ENV(DB_USER)]]:[[USE_USER_ENV(DB_PASSWORD)]]@[[USE_USER_ENV(DB_HOST)]]:[[USE_USER_ENV(DB_PORT)]]/[[USE_USER_ENV(DB_NAME)]]`;
```

### Example 3: Environment-Specific Configuration
```json
{
  "app": {
    "name": "My App",
    "version": "1.0.0"
  },
  "api": {
    "baseUrl": "[[USE_USER_ENV(API_BASE_URL)]]",
    "timeout": [[USE_USER_ENV(API_TIMEOUT)]]
  },
  "database": {
    "url": "[[USE_USER_ENV(DATABASE_URL)]]"
  }
}
```

### Example 4: Docker Compose with User Env
```yaml
# docker-compose.yml template
services:
  app:
    environment:
      - DATABASE_URL=[[USE_USER_ENV(DATABASE_URL)]]
      - REDIS_URL=[[USE_USER_ENV(REDIS_URL)]]
      - API_KEY=[[USE_USER_ENV(API_KEY)]]
```

## Best Practices

1. **Document Required Variables**: Clearly document which environment variables are needed for each template
2. **Use Descriptive Names**: Use clear, uppercase variable names (e.g., `DATABASE_URL` not `db`)
3. **Handle Missing Values**: Be aware that variables may be empty if metadata is unavailable
4. **Security**: Never commit user environment variables to version control - they should only exist in user metadata
5. **Validation**: Consider validating that required variables are present before using them

## Security Considerations

- **Encryption**: User environment variables can be encrypted in Auth0 metadata using a passphrase
- **Access Control**: Only authenticated users can access their own environment variables
- **No Exposure**: Variables are never exposed in client-side code unless explicitly included in generated files
- **Metadata Storage**: Variables are stored in Auth0 user metadata, which requires proper Auth0 Management API configuration

## Limitations

- **Requires Auth0**: User metadata is stored in Auth0, so Auth0 authentication is required
- **Management API**: Fetching metadata requires Auth0 Management API credentials (though the builder works without them)
- **Empty on Failure**: If metadata cannot be fetched, all `USE_USER_ENV` placeholders become empty strings
- **String Conversion**: All values are converted to strings
- **Complex Objects**: Objects are JSON stringified when accessed directly
- **Arrays**: Arrays are comma-separated when accessed directly

## File Tracking

Files that contain `USE_USER_ENV` placeholders are automatically tracked:

- **During Build**: The build process scans generated files for remaining `USE_USER_ENV` patterns
- **Result Tracking**: Files with unresolved `USE_USER_ENV` are listed in `filesUsingUserEnv` array
- **User Awareness**: This helps users identify which files need environment variables to be fully functional

## Error Handling

The system handles errors gracefully:

1. **API Failures**: If the `/api/user-metadata` endpoint fails, `fetchUserMetadata()` returns `null` instead of throwing
2. **Missing Credentials**: If Auth0 Management API credentials are missing, the builder continues with `null` metadata
3. **Missing Variables**: If a variable doesn't exist, the placeholder is replaced with an empty string
4. **Type Errors**: Invalid types are converted to strings or return empty strings

## See Also

- `USE_FORM_DATA` - Access form data instead of user environment variables
- `USE_DATA` - Access data from external YAML files
- `USE_TEMPLATE` - Include other templates
- [User Metadata API](/api/user-metadata) - Endpoint for managing user environment variables

