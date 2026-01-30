# Database Integration Proposal

## Overview

This proposal outlines the design and implementation plan for integrating database data sources (SQL databases, MongoDB, etc.) into the project builder system. The goal is to extend the existing `--data-source` flag to support database connections while maintaining backward compatibility with file-based data sources.

## Current Architecture

### Existing File-Based Data Sources

The system currently supports file-based data sources using YAML files:

```yaml
# structure.yaml
Employee Files:
  - FOLDER_LOOP({{basic-info.name}}'s Files --data-source=/DataSources/People/**/info.yaml):
    - CREATE_FILE({{basic-info.name}}'s Resume.html --scoped --template ./templates/Resume.txt)
```

**How it works:**
1. `--data-source` flag accepts a glob pattern (e.g., `/DataSources/People/**/info.yaml`)
2. `findFilesMatchingGlob()` searches the file structure for matching YAML files
3. Each match is parsed and flattened into a `DataContext`
4. Templates use `[[USE_DATA(property.path)]]` to access data
5. `LOOP_DATA_SOURCES` template command aggregates multiple data sources

### Key Components

- **`findFilesMatchingGlob()`**: Searches file structure, parses YAML, returns `IDataSourceMatch[]`
- **`flattenData()`**: Converts nested YAML objects to dot-notation keys
- **`createDataContextReplacements()`**: Creates augmented data with folder info
- **`processLoopFolders()`**: Generates files from data sources
- **`processDynamicFolders()`**: Creates folders from data sources
- **`processLoopDataSources()`**: Template command for aggregating data

## Proposed Design

### Core Principle: Extend, Don't Replace

The design extends the existing `--data-source` flag to recognize database URI patterns while maintaining full backward compatibility with file-based patterns.

### Database URI Pattern

```
--data-source=db://connection-name[?query=...]
```

**Examples:**
- `db://employees` - Uses default query from config
- `db://employees?query=SELECT * FROM employees WHERE active=true` - Overrides query
- `sql://postgresql://user:pass@host/db?query=SELECT * FROM users` - Direct connection (for testing)

### Configuration File

**Location:** `files/DataSources/databases.yaml`

**Structure:**
```yaml
connections:
  connection-name:
    type: postgresql | mysql | sqlite | mongodb | sqlserver
    # Connection details (type-specific)
    host: localhost
    port: 5432
    database: database_name
    user: ${DB_USER}  # Supports environment variables
    password: ${DB_PASSWORD}
    
    # Optional: default query
    query: "SELECT * FROM table_name WHERE condition = true"
    
    # MongoDB-specific
    collection: collection_name
    connectionString: mongodb://localhost:27017
    
    # SQL Server-specific
    instance: instance_name
    
    # SSL/TLS options
    ssl:
      enabled: true
      rejectUnauthorized: false
      ca: /path/to/ca-cert.pem
```

### Implementation Architecture

#### 1. Data Source Provider Interface

```typescript
// src/utils/project-builder/utils/dataSourceProviders.ts

export interface IDataSourceProvider {
  name: string;
  canHandle(pattern: string): boolean;
  findMatches(
    pattern: string,
    config: IDataSourceConfig,
    userFiles: IStructure,
  ): Promise<IDataSourceMatch[]>;
}

export interface IDataSourceConfig {
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'sqlserver';
  connection?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    connectionString?: string;
    instance?: string;
    ssl?: {
      enabled: boolean;
      rejectUnauthorized?: boolean;
      ca?: string;
    };
  };
  query?: string;
  collection?: string; // MongoDB
  mapping?: Record<string, string>; // Map DB fields to data context keys
}
```

#### 2. Provider Implementations

**PostgreSQL Provider:**
```typescript
export class PostgreSQLProvider implements IDataSourceProvider {
  name = 'postgresql';
  
  canHandle(pattern: string): boolean {
    return pattern.startsWith('db://') || pattern.startsWith('sql://postgresql://');
  }
  
  async findMatches(
    pattern: string,
    config: IDataSourceConfig,
    userFiles: IStructure,
  ): Promise<IDataSourceMatch[]> {
    // Parse connection name or direct connection string
    const connection = await this.getConnection(config);
    
    // Parse query from pattern or use default from config
    const query = this.extractQuery(pattern) || config.query || 'SELECT * FROM table';
    
    // Execute query
    const result = await connection.query(query);
    
    // Convert rows to IDataSourceMatch format
    return result.rows.map((row, index) => {
      const data = flattenData(row as Record<string, unknown>);
      return {
        folder: {
          name: row.id?.toString() || `row-${index}`,
          type: 'folder',
          children: [],
        },
        data: { ...row, ...data },
        folderPath: `db/${config.connection?.database}/row-${index}`,
      };
    });
  }
}
```

**MongoDB Provider:**
```typescript
export class MongoDBProvider implements IDataSourceProvider {
  name = 'mongodb';
  
  canHandle(pattern: string): boolean {
    return pattern.startsWith('db://') || pattern.startsWith('mongodb://');
  }
  
  async findMatches(
    pattern: string,
    config: IDataSourceConfig,
    userFiles: IStructure,
  ): Promise<IDataSourceMatch[]> {
    const client = await this.getClient(config);
    const db = client.db(config.connection?.database);
    const collection = db.collection(config.collection || 'documents');
    
    // Parse query from pattern or use default
    const query = this.extractQuery(pattern) 
      ? JSON.parse(this.extractQuery(pattern)!)
      : config.query 
        ? (typeof config.query === 'string' ? JSON.parse(config.query) : config.query)
        : {};
    
    const cursor = collection.find(query);
    const documents = await cursor.toArray();
    
    return documents.map((doc, index) => {
      // Convert MongoDB _id to string and flatten
      const { _id, ...rest } = doc;
      const data = flattenData(rest as Record<string, unknown>);
      
      return {
        folder: {
          name: _id?.toString() || `doc-${index}`,
          type: 'folder',
          children: [],
        },
        data: { id: _id?.toString(), ...rest, ...data },
        folderPath: `mongodb/${config.connection?.database}/${config.collection}/${_id}`,
      };
    });
  }
}
```

#### 3. Updated `findFilesMatchingGlob` Function

```typescript
// src/utils/project-builder/utils/dataSourceUtils.ts

export const findFilesMatchingGlob = async (
  userFiles: IStructure,
  globPattern: string,
): Promise<IDataSourceMatch[]> => {
  // Check if it's a database pattern
  if (globPattern.startsWith('db://') || 
      globPattern.startsWith('sql://') || 
      globPattern.startsWith('mongodb://')) {
    
    // Load database configuration
    const dbConfig = await loadDatabaseConfig(userFiles);
    
    // Parse connection name from pattern
    const connectionName = extractConnectionName(globPattern);
    const connectionConfig = dbConfig.connections?.[connectionName];
    
    if (!connectionConfig) {
      throw new Error(`Database connection '${connectionName}' not found in databases.yaml`);
    }
    
    // Get appropriate provider
    const provider = getProviderForType(connectionConfig.type);
    
    if (!provider) {
      throw new Error(`Unsupported database type: ${connectionConfig.type}`);
    }
    
    // Execute query and return matches
    return await provider.findMatches(globPattern, connectionConfig, userFiles);
  }
  
  // Fallback to existing file-based logic (synchronous)
  return findFilesMatchingGlobSync(userFiles, globPattern);
};
```

#### 4. Configuration Loader

```typescript
// src/utils/project-builder/utils/loadDatabaseConfig.ts

export const loadDatabaseConfig = async (
  userFiles: IStructure,
): Promise<IDatabaseConfig> => {
  const configPath = '/DataSources/databases.yaml';
  const configFile = findFileInStructure(userFiles, configPath);
  
  if (!configFile) {
    return { connections: {} };
  }
  
  try {
    const parsed = parse(configFile.content);
    
    // Resolve environment variables
    return resolveEnvironmentVariables(parsed);
  } catch (error) {
    console.error('Error loading database config:', error);
    return { connections: {} };
  }
};

const resolveEnvironmentVariables = (config: any): any => {
  // Recursively replace ${VAR_NAME} with process.env.VAR_NAME
  // ...
};
```

## Usage Examples

### Example 1: Basic Database Connection

**Configuration:**
```yaml
# files/DataSources/databases.yaml
connections:
  employees:
    type: postgresql
    host: localhost
    database: company_db
    user: ${DB_USER}
    password: ${DB_PASSWORD}
    query: "SELECT id, name, email, department FROM employees WHERE active = true"
```

**Structure.yaml:**
```yaml
Employee Reports:
  - LOOP_FOLDERS({{id}}-{{name}}-report.html --data-source=db://employees --template=./templates/EmployeeReport.txt)
```

**Template:**
```html
<!-- templates/EmployeeReport.txt -->
<h1>Employee Report: {{name}}</h1>
<p>ID: {{id}}</p>
<p>Email: {{email}}</p>
<p>Department: {{department}}</p>
```

### Example 2: Custom Query Override

```yaml
# Use different queries for the same connection
Sales Team:
  - LOOP_FOLDERS({{name}}-sales.html --data-source=db://employees?query=SELECT * FROM employees WHERE department='Sales' --template=./templates/SalesReport.txt)

Engineering Team:
  - LOOP_FOLDERS({{name}}-eng.html --data-source=db://employees?query=SELECT * FROM employees WHERE department='Engineering' --template=./templates/EngReport.txt)
```

### Example 3: MongoDB Integration

**Configuration:**
```yaml
# databases.yaml
connections:
  users:
    type: mongodb
    connectionString: mongodb://localhost:27017
    database: app_db
    collection: users
    query: {"status": "active", "role": "customer"}
```

**Structure.yaml:**
```yaml
User Profiles:
  - FOLDER_LOOP({{username}} --data-source=db://users):
    - CREATE_FILE({{username}}-profile.html --scoped --template ./templates/UserProfile.txt)
    - CREATE_FILE({{username}}-orders.html --scoped --template ./templates/UserOrders.txt)
```

### Example 4: Aggregated Master List

**Template using LOOP_DATA_SOURCES:**
```html
<!-- templates/EmployeeMasterList.txt -->
<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>Name</th>
      <th>Department</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    [[LOOP_DATA_SOURCES(db://employees --template="
    <tr>
      <td>[[USE_DATA(id)]]</td>
      <td>[[USE_DATA(name)]]</td>
      <td>[[USE_DATA(department)]]</td>
      <td>[[USE_DATA(email)]]</td>
    </tr>
    " --separator="\n")]]
  </tbody>
</table>
```

### Example 5: Multiple Database Sources

```yaml
# databases.yaml
connections:
  employees:
    type: postgresql
    host: localhost
    database: hr_db
    query: "SELECT * FROM employees"
  
  customers:
    type: mongodb
    connectionString: mongodb://localhost:27017
    database: crm_db
    collection: customers
    query: {"status": "active"}
  
  products:
    type: postgresql
    host: prod-db.example.com
    database: inventory
    query: "SELECT * FROM products WHERE in_stock = true"
```

```yaml
# structure.yaml
Employee Reports:
  - LOOP_FOLDERS(... --data-source=db://employees ...)

Customer Reports:
  - LOOP_FOLDERS(... --data-source=db://customers ...)

Product Catalogs:
  - LOOP_FOLDERS(... --data-source=db://products ...)
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Create provider interface and base classes**
   - `IDataSourceProvider` interface
   - `IDataSourceConfig` interface
   - Base provider class with common utilities

2. **Configuration system**
   - `loadDatabaseConfig()` function
   - Environment variable resolution
   - Configuration validation

3. **Update `findFilesMatchingGlob`**
   - Make it async
   - Add database pattern detection
   - Integrate provider system

### Phase 2: PostgreSQL Provider (Week 2)

1. **PostgreSQL provider implementation**
   - Connection pooling
   - Query execution
   - Result transformation
   - Error handling

2. **Testing**
   - Unit tests for provider
   - Integration tests with test database
   - Error scenario testing

### Phase 3: MongoDB Provider (Week 3)

1. **MongoDB provider implementation**
   - Client connection
   - Collection queries
   - Document transformation
   - BSON to JSON conversion

2. **Testing**
   - Unit tests
   - Integration tests
   - Edge case handling

### Phase 4: Additional Providers (Week 4)

1. **MySQL provider**
2. **SQLite provider** (for local development)
3. **SQL Server provider** (optional)

### Phase 5: Documentation & Examples (Week 5)

1. **Update documentation**
   - README updates
   - API documentation
   - Migration guide

2. **Example projects**
   - Database-driven employee files
   - Customer report generation
   - Product catalog generation

## Technical Considerations

### 1. Async/Await Migration

**Current State:**
- `findFilesMatchingGlob()` is synchronous
- Used in `processLoopFolders()` and `processDynamicFolders()`

**Required Changes:**
- Make `findFilesMatchingGlob()` async
- Update all callers to use `await`
- Ensure backward compatibility for file-based sources

### 2. Connection Pooling

**Strategy:**
- Create connection pools per database type
- Reuse connections across multiple queries
- Implement connection lifecycle management
- Handle connection errors gracefully

### 3. Query Security

**Considerations:**
- Parameterized queries to prevent SQL injection
- Query validation and sanitization
- Read-only queries by default
- Optional write permission flag

### 4. Performance

**Optimizations:**
- Cache database connections
- Batch queries when possible
- Lazy loading of data
- Connection timeout handling

### 5. Error Handling

**Scenarios:**
- Connection failures
- Query syntax errors
- Missing configuration
- Timeout handling
- Graceful degradation

## Benefits

### 1. Consistency

- Same API (`--data-source` flag) for files and databases
- Same template syntax (`[[USE_DATA(...)]]`)
- Same data structure (`DataContext`)

### 2. Flexibility

- Mix file-based and database sources
- Override queries per use case
- Support multiple database types

### 3. Maintainability

- Centralized configuration
- DRY principle (define once, use many times)
- Environment variable support

### 4. Scalability

- Handle large datasets
- Connection pooling
- Efficient query execution

### 5. Developer Experience

- Simple syntax
- No new learning curve
- Backward compatible
- Clear error messages

## Migration Path

### For Existing Projects

**No changes required!** File-based data sources continue to work exactly as before:

```yaml
# Still works
Employee Files:
  - FOLDER_LOOP(... --data-source=/DataSources/People/**/info.yaml ...)
```

### For New Database Projects

1. Create `databases.yaml` configuration file
2. Define database connections
3. Use `db://connection-name` in `--data-source` flag
4. Templates work the same way

## Future Enhancements

### 1. Query Builder

```yaml
--data-source=db://employees?filter=department=Sales&sort=name&limit=10
```

### 2. Relationship Support

```yaml
--data-source=db://employees?include=orders,projects
```

### 3. Caching

```yaml
--data-source=db://employees?cache=5m  # Cache for 5 minutes
```

### 4. Real-time Updates

```yaml
--data-source=db://employees?watch=true  # Auto-refresh on changes
```

### 5. API Data Sources

```yaml
--data-source=api://https://api.example.com/users?auth=token
```

## Dependencies

### Required Packages

```json
{
  "pg": "^8.11.0",           // PostgreSQL
  "mysql2": "^3.6.0",        // MySQL
  "mongodb": "^6.0.0",       // MongoDB
  "better-sqlite3": "^9.0.0" // SQLite (optional)
}
```

### Optional Packages

```json
{
  "mssql": "^10.0.0",        // SQL Server
  "redis": "^4.6.0"          // Redis (future)
}
```

## Testing Strategy

### Unit Tests

- Provider implementations
- Configuration loading
- Query parsing
- Data transformation

### Integration Tests

- Real database connections
- Query execution
- Error scenarios
- Performance testing

### Example Test Cases

```typescript
describe('PostgreSQL Provider', () => {
  it('should connect to database', async () => {
    // Test connection
  });
  
  it('should execute query and return matches', async () => {
    // Test query execution
  });
  
  it('should handle connection errors', async () => {
    // Test error handling
  });
  
  it('should flatten database rows correctly', async () => {
    // Test data transformation
  });
});
```

## Security Considerations

### 1. Credential Management

- Store credentials in environment variables
- Never commit credentials to version control
- Support for secret management systems

### 2. Query Validation

- Validate query syntax
- Prevent dangerous operations (DROP, DELETE, etc.)
- Parameterized queries only

### 3. Access Control

- Read-only mode by default
- Optional write permissions
- Connection-level permissions

## Conclusion

This proposal extends the existing data source system to support databases while maintaining simplicity, consistency, and backward compatibility. The design leverages the current architecture and requires minimal changes to existing code, making it a low-risk, high-value enhancement.

The implementation can be done incrementally, starting with PostgreSQL support, then adding MongoDB and other databases as needed. The modular provider system makes it easy to add new database types in the future.

