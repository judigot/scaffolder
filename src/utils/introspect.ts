import fs from 'fs';
import path from 'path';
import { executePostgreSQL, executeMySQL } from '..';
import convertIntrospectedStructure, {
  ITable,
} from '@/utils/convertIntrospectedStructure';
import convertIntrospectedMysqlStructure, {
  ITableMysql,
} from '@/utils/convertIntrospectedMysqlStructure';

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
    const isITableArray = (data: unknown): data is ITable[] => {
      return (
        Array.isArray(data) &&
        data.every(
          (item) =>
            item !== null &&
            typeof item === 'object' &&
            'table_name' in item &&
            'columns' in item &&
            'check_constraints' in item,
        )
      );
    };

    const result = await executePostgreSQL(dbConnection, pgIntrospectionQuery);
    if (isITableArray(result)) {
      return convertIntrospectedStructure(result);
    } else {
      throw new Error('Unexpected result format');
    }
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
    const isITableArray = (data: unknown): data is ITableMysql[] => {
      return (
        Array.isArray(data) &&
        data.every(
          (item) =>
            item !== null &&
            typeof item === 'object' &&
            'TABLE_NAME' in item &&
            'table_definition' in item,
        )
      );
    };

    const result = await executeMySQL(dbConnection, mysqlIntrospectionQuery);
    if (isITableArray(result)) {
      return convertIntrospectedMysqlStructure(result);
    } else {
      throw new Error('Unexpected result format');
    }
  } else {
    throw new Error('Unsupported database type');
  }
};

export default introspect;
