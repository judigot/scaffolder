import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import { DBTypes } from '@/interfaces/interfaces.ts';

interface IDatabaseInfo {
  name: string;
  user: string;
  password: string;
  host: string;
  port: string;
  type?: DBTypes; // Optional type field, defaults to postgresql if not provided
}

/**
 * Creates or resets a database using the provided database connection info
 * @param database Database connection information object or connection string
 * @param SQLSchema Optional SQL schema to apply after database creation
 * @returns Object indicating success or failure with a message
 */
export const createOrResetDatabase = async (
  database: IDatabaseInfo | string,
  SQLSchema: string | null = null
): Promise<{ success: boolean; message: string }> => {
  try {
    let connectionString: string;
    let extractedDbType: DBTypes;
    
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
          message: error instanceof Error ? error.message : 'Invalid database connection string'
        };
      }
    } else {
      // Validate database information
      const { name, user, password, host, port, type = 'postgresql' } = database;
      
      // Check for empty values
      if (!name || !user || !host || !port) {
        return { 
          success: false, 
          message: 'Missing required database connection information' 
        };
      }
      
      // Ensure port is a valid number
      if (isNaN(parseInt(port, 10))) {
        return {
          success: false,
          message: 'Database port must be a valid number'
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
          message: error instanceof Error ? error.message : 'Invalid database connection string'
        };
      }
    }

    // Prepare SQL based on database type
    if (extractedDbType === 'postgresql') {
      const sql = SQLSchema !== null 
        ? `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${SQLSchema}`
        : 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;';
      
      await executePostgreSQL(connectionString, sql);
    } else {
      // Must be MySQL since extractDBConnectionInfo only returns 'postgresql' or 'mysql'
      // Extract dbName for MySQL
      const { dbName } = extractDBConnectionInfo(connectionString);
      
      const sql = `
        USE ${dbName};

        SET FOREIGN_KEY_CHECKS = 0;

        SET @tables = NULL;
        SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables
        FROM information_schema.tables 
        WHERE table_schema = (SELECT DATABASE());

        SET @tables = IFNULL(@tables, 'dummy');
        SET @sql = CONCAT('DROP TABLE IF EXISTS ', @tables);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET FOREIGN_KEY_CHECKS = 1;
        ${SQLSchema ?? ''}
      `;
      
      await executeMySQL(connectionString, sql);
    }

    return { 
      success: true, 
      message: SQLSchema !== null 
        ? 'Successfully created database and applied schema' 
        : 'Successfully reset database'
    };
  } catch (error) {
    console.error('Database operation error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown database operation error'
    };
  }
}; 