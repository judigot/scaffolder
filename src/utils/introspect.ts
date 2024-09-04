import fs from 'fs';
import path from 'path';
import { executePostgreSQL, executeMySQL } from '..';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo';

const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const readSqlFile = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, `../${filename}`), 'utf8');
};

export const introspect = async (dbConnection: string): Promise<unknown> => {
  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }

  const { dbType, dbName } = extractDBConnectionInfo(dbConnection);

  const query = readSqlFile(`introspect_${String(dbType)}.sql`);
  let result: unknown;

  if (dbType === 'postgresql') {
    result = await executePostgreSQL(dbConnection, query);
  }

  if (dbType === 'mysql') {
    const mysqlIntrospectionQuery = query.replace('$DB_NAME', dbName);
    result = await executeMySQL(dbConnection, mysqlIntrospectionQuery);
  }

  if (result === null || result === undefined) {
    throw new Error(`Unsupported database type`);
  }

  return result;
};

export default introspect;
