import { executePostgreSQL } from '../utils/executePostgreSQL';
import { executeMySQL } from '../utils/executeMySQL';
import { extractDBConnectionInfo } from '../utils/extractDBConnectionInfo';
import { IGNORED_TABLES_LARAVEL } from '../constants';
/**
 * Helper function to safely extract table name from database row
 * @param row Database row object
 * @param fieldName Field name to extract ('tablename' for PostgreSQL, 'table_name' for MySQL)
 * @returns Table name as string or null if not found
 */
const extractTableName = (row, fieldName) => {
  if (row === null || row === undefined || typeof row !== 'object') {
    return null;
  }
  try {
    // Use Reflect.get for safe property access without type assertions
    const value = Reflect.get(row, fieldName);
    if (typeof value !== 'string') {
      return null;
    }
    return value;
  } catch {
    return null;
  }
};
/**
 * Generate DROP TABLE commands for tables that are safe to delete (not in ignored list)
 * @param connectionString Database connection string
 * @param dbType Database type ('postgresql' or 'mysql')
 * @returns String with DROP TABLE commands for tables that should be deleted
 */
export const cherryPickTablesToDelete = async (connectionString, dbType) => {
  try {
    if (dbType === 'postgresql') {
      // Query to get all table names in public schema
      const query = `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public';
      `;
      const result = await executePostgreSQL(connectionString, query);
      if (!Array.isArray(result)) {
        return '';
      }
      // Filter out ignored tables and generate DROP commands
      const tablesToDelete = [];
      for (const row of result) {
        const tableName = extractTableName(row, 'tablename');
        // Guard clause: skip if table name extraction failed
        if (tableName === null) {
          continue;
        }
        // Guard clause: skip if table is in ignored list
        if (IGNORED_TABLES_LARAVEL.includes(tableName)) {
          continue;
        }
        tablesToDelete.push(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
      }
      return tablesToDelete.join('\n');
    }
    // For MySQL, get table names from information_schema
    const { dbName } = extractDBConnectionInfo(connectionString);
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${dbName}';
    `;
    const result = await executeMySQL(connectionString, query);
    if (!Array.isArray(result)) {
      return '';
    }
    // Filter out ignored tables and generate DROP commands
    const tablesToDelete = [];
    for (const row of result) {
      const tableName = extractTableName(row, 'table_name');
      // Guard clause: skip if table name extraction failed
      if (tableName === null) {
        continue;
      }
      // Guard clause: skip if table is in ignored list
      if (IGNORED_TABLES_LARAVEL.includes(tableName)) {
        continue;
      }
      tablesToDelete.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    }
    return tablesToDelete.join('\n');
  } catch (error) {
    console.error('Error generating table deletion commands:', error);
    return '';
  }
};
/**
 * Creates or resets a database using the provided database connection info
 * @param database Database connection information object or connection string
 * @param SQLSchema Optional SQL schema to apply after database creation
 * @returns Object indicating success or failure with a message
 */
export const createOrResetDatabase = async (database, SQLSchema = null) => {
  try {
    let connectionString;
    let extractedDbType;
    // Check if database is a string (direct connection string) or an object (database info)
    if (typeof database === 'string') {
      // Use the connection string directly
      connectionString = database;
      // Log for debugging (using allowed console method and redacting password)
      try {
        const { dbType } = extractDBConnectionInfo(connectionString);
        extractedDbType = dbType;
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Invalid database connection string',
        };
      }
    } else {
      // Validate database information
      const {
        name,
        user,
        password,
        host,
        port,
        type = 'postgresql',
      } = database;
      // Check for empty values
      if (!name || !user || !host || !port) {
        return {
          success: false,
          message: 'Missing required database connection information',
        };
      }
      // Ensure port is a valid number
      if (isNaN(parseInt(port, 10))) {
        return {
          success: false,
          message: 'Database port must be a valid number',
        };
      }
      // Construct connection string
      connectionString = `${type}://${user}:${password}@${host}:${port}/${name}`;
      // Try to extract database connection info to verify the format is correct
      try {
        const result = extractDBConnectionInfo(connectionString);
        extractedDbType = result.dbType;
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Invalid database connection string',
        };
      }
    }
    // Prepare SQL based on database type
    if (extractedDbType === 'postgresql') {
      // Use selective deletion instead of dropping entire schema
      const dropTableCommands = await cherryPickTablesToDelete(
        connectionString,
        extractedDbType,
      );
      const sql =
        SQLSchema !== null
          ? `${dropTableCommands}\n${SQLSchema}`
          : dropTableCommands;
      if (sql.trim()) {
        await executePostgreSQL(connectionString, sql);
      }
    } else {
      // For MySQL, also use selective deletion
      const dropTableCommands = await cherryPickTablesToDelete(
        connectionString,
        extractedDbType,
      );
      const sql =
        SQLSchema !== null
          ? `${dropTableCommands}\n${SQLSchema}`
          : dropTableCommands;
      if (sql.trim()) {
        await executeMySQL(connectionString, sql);
      }
    }
    return {
      success: true,
      message:
        SQLSchema !== null
          ? 'Successfully created database and applied schema'
          : 'Successfully reset database',
    };
  } catch (error) {
    console.error('Database operation error:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unknown database operation error',
    };
  }
};
