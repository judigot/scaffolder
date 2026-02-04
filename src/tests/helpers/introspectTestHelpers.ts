import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { format as formatSQL } from 'sql-formatter';
import type { DBTypes, ISchemaInfo } from '@/interfaces/interfaces.ts';
import { isITableArray } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';
import convertIntrospectedStructure from '@/utils/convertIntrospectedStructure.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import { extractDBConnectionInfo } from '@/utils/extractDBConnectionInfo.ts';

import generateSQLSchema from '@/utils/generateSQLSchema.ts';
import introspect from '@/utils/introspect.ts';

/**
 * Generate a unique schema name for test isolation.
 */
const generateUniqueSchemaName = (): string => {
  const id = randomBytes(4).toString('hex');
  return `test_${id}`;
};

/**
 * Sets up the form store with the given database connection string.
 * This ensures generateSQLSchema uses the correct database type for SQL generation.
 */
export const setupFormStore = (dbConnection: string): void => {
  const { dbType } = extractDBConnectionInfo(dbConnection);
  const quote = dbType === 'postgresql' ? '"' : '`';

  useFormStore.setState({
    dbConnection,
    dbType,
    quote,
  });
};

/**
 * Creates database tables from schemaInfo and returns the introspected schema.
 * Uses unique schemas for PostgreSQL to allow parallel test execution.
 */
export const createAndIntrospectDatabase = async (
  schemaInfo: ISchemaInfo[],
  dbConnection: string,
): Promise<ISchemaInfo[]> => {
  setupFormStore(dbConnection);
  const { dbType } = extractDBConnectionInfo(dbConnection);

  /* Generate SQL schema */
  const sqlSchema = generateSQLSchema(schemaInfo);
  const fullSQL = formatSQL(sqlSchema);

  /* Create database tables */
  if (dbType === 'postgresql') {
    /* Use unique schema per test for isolation */
    const schemaName = generateUniqueSchemaName();
    await executePostgreSQL(
      dbConnection,
      `DROP SCHEMA IF EXISTS ${schemaName} CASCADE; CREATE SCHEMA ${schemaName}; SET search_path TO ${schemaName}; ${fullSQL}`,
    );

    /* Introspect the database with the specific schema */
    const introspectionResult = await introspect(
      dbConnection,
      dbType,
      schemaName,
    );

    /* Clean up the schema after introspection */
    await executePostgreSQL(
      dbConnection,
      `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`,
    );

    if (!isITableArray(introspectionResult)) {
      throw new Error('Invalid introspection result');
    }

    return convertIntrospectedStructure(introspectionResult);
  }

  /* MySQL: Use unique database per test for isolation (requires root/privileged user) */
  const dbName = generateUniqueSchemaName();
  try {
    /* Create unique database, run schema, introspect, then drop */
    await executeMySQL(
      dbConnection,
      `CREATE DATABASE IF NOT EXISTS ${dbName};`,
    );
    await executeMySQL(
      dbConnection,
      `USE ${dbName}; SET FOREIGN_KEY_CHECKS = 0; ${fullSQL}; SET FOREIGN_KEY_CHECKS = 1;`,
    );

    /* Introspect the unique database */
    const mysqlConnectionWithDb = dbConnection.replace(
      /\/[^/]+$/,
      `/${dbName}`,
    );
    const introspectionResult = await introspect(mysqlConnectionWithDb, dbType);

    /* Clean up */
    await executeMySQL(dbConnection, `DROP DATABASE IF EXISTS ${dbName};`);

    if (!isITableArray(introspectionResult)) {
      throw new Error('Invalid introspection result');
    }

    return convertIntrospectedStructure(introspectionResult);
  } catch (error) {
    /* Clean up on error */
    try {
      await executeMySQL(dbConnection, `DROP DATABASE IF EXISTS ${dbName};`);
    } catch {
      /* Ignore cleanup errors */
    }
    console.error('Error creating MySQL tables:', error);
    throw error;
  }
};

/**
 * Gets the connection string for a database type.
 * Uses environment variables if available, otherwise falls back to docker-compose defaults.
 */
export const getTestConnectionString = (dbType: DBTypes): string => {
  if (dbType === 'postgresql') {
    return (
      process.env.POSTGRES_TEST_URL ??
      process.env.DATABASE_URL ??
      'postgresql://scaffolder:scaffolder123@localhost:15432/scaffolder'
    );
  }

  return (
    process.env.MYSQL_TEST_URL ??
    'mysql://root:scaffolder123@localhost:13306/scaffolder'
  );
};

/**
 * Checks if a database is reachable by attempting a simple connection.
 * Returns true if the database is available, false otherwise.
 */
export const checkDatabaseConnection = async (
  dbType: DBTypes,
): Promise<boolean> => {
  const dbConnection = getTestConnectionString(dbType);
  try {
    if (dbType === 'postgresql') {
      await executePostgreSQL(dbConnection, 'SELECT 1');
    } else {
      await executeMySQL(dbConnection, 'SELECT 1');
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Executes a SQL file and introspects the resulting database.
 * Used for testing comprehensive SQL schemas.
 */
export const executeSQLFileAndIntrospect = async (
  sqlFilePath: string,
  dbConnection: string,
): Promise<ISchemaInfo[]> => {
  setupFormStore(dbConnection);
  const { dbType } = extractDBConnectionInfo(dbConnection);

  /* Read SQL file and remove INSERT statements and REFRESH MATERIALIZED VIEW statements (they can cause issues in tests) */
  let sqlContent = readFileSync(join(process.cwd(), sqlFilePath), 'utf-8');

  /* Split by the SAMPLE DATA section and only keep the part before it */
  /* Find the start of the SAMPLE DATA section */
  const sampleDataMarker =
    '-- ============================================================================\n-- 21. SAMPLE DATA\n-- ============================================================================';
  const sampleDataIndex = sqlContent.indexOf(sampleDataMarker);
  if (sampleDataIndex !== -1) {
    /* Find the last complete statement before the SAMPLE DATA section */
    const beforeSampleData = sqlContent.substring(0, sampleDataIndex);
    /* Find the last semicolon followed by whitespace/newline to ensure we end at a complete statement */
    /* Also check for comment blocks - find the last complete statement that's not inside a comment */
    let lastSemicolon = beforeSampleData.lastIndexOf(';');

    /* Ensure we're not cutting in the middle of a comment block */
    /* Check if there's an unclosed /* comment after the last semicolon */
    const afterLastSemicolon = beforeSampleData.substring(lastSemicolon + 1);
    const openCommentCount = (afterLastSemicolon.match(/\/\*/g) ?? []).length;
    const closeCommentCount = (afterLastSemicolon.match(/\*\//g) ?? []).length;

    /* If there are unclosed comments, find the last semicolon before any open comment */
    if (openCommentCount > closeCommentCount) {
      /* Find the last semicolon before any unclosed comment */
      const commentStart = beforeSampleData.lastIndexOf('/*');
      if (commentStart !== -1 && commentStart > lastSemicolon) {
        /* Find semicolon before this comment */
        lastSemicolon = beforeSampleData
          .substring(0, commentStart)
          .lastIndexOf(';');
      }
    }

    if (lastSemicolon !== -1) {
      sqlContent = beforeSampleData.substring(0, lastSemicolon + 1);
    } else {
      sqlContent = beforeSampleData;
    }
  }

  /* Remove any remaining REFRESH MATERIALIZED VIEW statements */
  sqlContent = sqlContent.replace(
    /REFRESH MATERIALIZED VIEW[\s\S]*?;\s*/gi,
    '',
  );

  /* Execute SQL to create database */
  if (dbType === 'postgresql') {
    try {
      await executePostgreSQL(
        dbConnection,
        `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${sqlContent}`,
      );
    } catch (error) {
      console.error('Error executing comprehensive SQL schema:', error);
      throw error;
    }
  } else {
    /* Note: Comprehensive schema is PostgreSQL-specific, so MySQL may not work */
    await executeMySQL(
      dbConnection,
      `
      USE $DB_NAME;

      SET FOREIGN_KEY_CHECKS = 0;

      /* Get all tables in the database */
      SET @tables = NULL;
      SELECT GROUP_CONCAT(CONCAT('\`', table_name, '\`') SEPARATOR ', ') INTO @tables
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_type = 'BASE TABLE';

      /* Drop all tables if any exist */
      IF @tables IS NOT NULL AND @tables != '' THEN
        SET @sql = CONCAT('DROP TABLE IF EXISTS ', @tables);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
      END IF;

      SET FOREIGN_KEY_CHECKS = 1;
      ${sqlContent}`,
    );
  }

  /* Introspect the database */
  const introspectionResult = await introspect(dbConnection, dbType);

  if (!isITableArray(introspectionResult)) {
    throw new Error('Invalid introspection result');
  }

  /* Convert to ISchemaInfo */
  return convertIntrospectedStructure(introspectionResult);
};
