import { type ISchemaInfo, isITableArray } from '@/interfaces/interfaces.ts';
import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import introspect from '@/utils/introspect.ts';
import convertIntrospectedStructure from '@/utils/convertIntrospectedStructure.ts';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import type { IExecuteCustomSchemaRequest } from '@/interfaces/IExecuteCustomSchemaRequest.ts';

export const executeCustomSchemaService = async (
  data: IExecuteCustomSchemaRequest,
): Promise<ISchemaInfo[]> => {
  const { dbConnection, SQLSchemaEditable } = data;

  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }

  const { dbType } = extractDBConnectionInfo(dbConnection);

  if (dbType === 'postgresql') {
    await executePostgreSQL(
      dbConnection,
      `DROP SCHEMA public CASCADE; CREATE SCHEMA public; ${SQLSchemaEditable}`,
    );
  }
  if (dbType === 'mysql') {
    await executeMySQL(
      dbConnection,
      `
      USE $DB_NAME;

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
      ${SQLSchemaEditable}`,
    );
  } else {
    throw new Error('Unsupported database type');
  }

  const introspectionResult = await introspect(dbConnection, dbType);
  if (isITableArray(introspectionResult)) {
    return convertIntrospectedStructure(introspectionResult);
  }

  throw new Error('Invalid introspection result');
};
