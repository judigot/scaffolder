import fs from 'fs';
import path from 'path';
import { executePostgreSQL, executeMySQL } from '..';

const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const readSqlFile = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, `../${filename}`), 'utf8');
};

export const introspect = async (dbConnection: string): Promise<unknown> => {
  const pgIntrospectionQuery = readSqlFile('introspect_postgresql.sql');
  const mysqlIntrospectionQueryTemplate = readSqlFile('introspect_mysql.sql');

  if (dbConnection.startsWith('postgresql')) {
    const result = await executePostgreSQL(dbConnection, pgIntrospectionQuery);
    return result;
  } else if (dbConnection.startsWith('mysql')) {
    const match = dbConnection.match(
      /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/,
    );
    if (!match) {
      throw new Error('Invalid MySQL connection string');
    }
    const [, , , , , database] = match;
    const mysqlIntrospectionQuery = mysqlIntrospectionQueryTemplate.replace(
      '$DB_NAME',
      database,
    );

    const result = await executeMySQL(dbConnection, mysqlIntrospectionQuery);
    return result;
  } else {
    throw new Error('Unsupported database type');
  }
};

export default introspect;
