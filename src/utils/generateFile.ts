import { toPascalCase } from '../helpers/toPascalCase';
import { format as formatSQL } from 'sql-formatter';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { getColumnDefinition, getForeignKeyConstraints } from '@/utils/common';

const quoteTableName = (tableName: string): string => `"${tableName}"`;

const generateSQLSchema = (schemaInfo: ISchemaInfo[]): string => {
  return schemaInfo
    .map(({ table, columnsInfo }) => {
      const quotedTableName = quoteTableName(table);
      const columns = columnsInfo
        .map((col) => getColumnDefinition(col, 'sql-tables'))
        .join(',\n  ');
      const foreignKeyConstraints = getForeignKeyConstraints(
        table,
        schemaInfo,
      ).join(',\n  ');
      const allColumnsAndKeys = [columns, foreignKeyConstraints]
        .filter(Boolean)
        .join(',\n  ');

      return `DROP TABLE IF EXISTS ${quotedTableName} CASCADE;\nCREATE TABLE ${quotedTableName} (\n${allColumnsAndKeys}\n);`;
    })
    .join('\n');
};

const generateTypescriptInterfaces = (schemaInfo: ISchemaInfo[]): string => {
  return schemaInfo
    .map(({ table, columnsInfo }) => {
      const interfaceName = toPascalCase(table);
      const properties = columnsInfo
        .map((col) => getColumnDefinition(col, 'ts-interfaces'))
        .join('\n  ');
      return `export interface I${interfaceName} {\n  ${properties}\n}`;
    })
    .join('\n\n');
};

const generateFile = (
  schemaInfo: ISchemaInfo[],
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  switch (fileType) {
    case 'sql-tables':
      return formatSQL(generateSQLSchema(schemaInfo));
    case 'ts-interfaces':
      return generateTypescriptInterfaces(schemaInfo);
    default:
      throw new Error('Invalid file type specified');
  }
};

export default generateFile;
