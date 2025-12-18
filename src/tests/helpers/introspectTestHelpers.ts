import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DBTypes, ISchemaInfo } from '@/interfaces/interfaces.ts';
import { isITableArray } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';
import generateSQLSchema from '@/utils/generateSQLSchema.ts';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables.ts';
import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import { extractDBConnectionInfo } from '@/utils/extractDBConnectionInfo.ts';
import introspect from '@/utils/introspect.ts';
import convertIntrospectedStructure from '@/utils/convertIntrospectedStructure.ts';
import { format as formatSQL } from 'sql-formatter';

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
 */
export const createAndIntrospectDatabase = async (
  schemaInfo: ISchemaInfo[],
  dbConnection: string,
): Promise<ISchemaInfo[]> => {
  setupFormStore(dbConnection);
  const { dbType } = extractDBConnectionInfo(dbConnection);

  /* Generate SQL schema */
  const deleteTablesQueries = generateSQLDeleteTables(schemaInfo);
  const sqlSchema = generateSQLSchema(schemaInfo);
  const fullSQL = `${deleteTablesQueries.join('\n')}\n\n${formatSQL(sqlSchema)}`;

  /* Create database tables */
  if (dbType === 'postgresql') {
    await executePostgreSQL(
      dbConnection,
      `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${fullSQL}`,
    );
  } else {
    try {
      /* Clean slate: Drop all tables first */
      await executeMySQL(
        dbConnection,
        `
        USE $DB_NAME;

        SET FOREIGN_KEY_CHECKS = 0;

        /* Get all tables in the database and drop them */
        SET @tables = NULL;
        SELECT GROUP_CONCAT(CONCAT('\`', table_name, '\`') SEPARATOR ', ') INTO @tables
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        AND table_type = 'BASE TABLE';

        SET @tables = IFNULL(@tables, '');
        SET @sql = IF(@tables != '', CONCAT('DROP TABLE IF EXISTS ', @tables), 'SELECT 1');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        SET FOREIGN_KEY_CHECKS = 1;
        ${fullSQL}`,
      );
    } catch (error) {
      console.error('Error creating MySQL tables:', error);
      throw error;
    }
  }

  /* Introspect the database */
  const introspectionResult = await introspect(dbConnection, dbType);

  if (!isITableArray(introspectionResult)) {
    throw new Error('Invalid introspection result');
  }

  /* Convert to ISchemaInfo */
  return convertIntrospectedStructure(introspectionResult);
};

/**
 * Gets the default connection string for a database type.
 * Uses ports from docker-compose setup.
 */
export const getTestConnectionString = (dbType: DBTypes): string => {
  if (dbType === 'postgresql') {
    return 'postgresql://scaffolder:scaffolder123@localhost:15432/scaffolder';
  }

  return 'mysql://scaffolder:scaffolder123@localhost:13306/scaffolder';
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
