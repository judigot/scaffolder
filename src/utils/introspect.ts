import fs from 'node:fs';
import path from 'node:path';
import { IGNORED_TABLES_LARAVEL } from '@/constants.ts';
import type { DBTypes } from '@/interfaces/interfaces.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import { extractDBConnectionInfo } from '@/utils/extractDBConnectionInfo.ts';

const readSqlFile = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, `../${filename}`), 'utf8');
};

export const introspect = async (
  dbConnection: string,
  dbType: DBTypes,
  schema?: string,
): Promise<unknown> => {
  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }

  const { dbName } = extractDBConnectionInfo(dbConnection);

  let query = readSqlFile(`introspect_${dbType}.sql`);
  let result: unknown;

  if (dbType === 'postgresql') {
    /* Replace 'public' with custom schema if explicitly provided */
    if (schema !== undefined && schema.length > 0) {
      query = query.replace(/'public'/g, `'${schema}'`);
    }
    result = await executePostgreSQL(dbConnection, query);
  }

  if (dbType === 'mysql') {
    const mysqlIntrospectionQuery = query.replace(/\$DB_NAME/g, dbName);
    result = await executeMySQL(dbConnection, mysqlIntrospectionQuery);
  }

  if (result === null || result === undefined) {
    throw new Error(`Unsupported database type`);
  }

  // Filter out tables that are in the ignoredTables_laravel array
  const filteredResult = (Array.isArray(result) ? result : []).filter(
    (table: { table_name: string }) => {
      return !IGNORED_TABLES_LARAVEL.includes(table.table_name);
    },
  );

  return filteredResult;
};

export default introspect;
