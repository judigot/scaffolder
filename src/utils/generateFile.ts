import { toPascalCase } from '../helpers/toPascalCase';
import { format as formatSQL } from 'sql-formatter';
import { IRelationshipInfo } from '@/interfaces/interfaces';
import { getColumnDefinition, getForeignKeyConstraints } from '@/utils/common';

const quoteTableName = (tableName: string): string => `"${tableName}"`;

const generateSQLSchema = (relationships: IRelationshipInfo[]): string => {
  return relationships
    .map(({ table, columnsInfo }) => {
      const quotedTableName = quoteTableName(table);
      const columns = columnsInfo
        .map((col) => getColumnDefinition(col, 'sql-tables'))
        .join(',\n  ');
      const foreignKeyConstraints = getForeignKeyConstraints(
        table,
        relationships,
      ).join(',\n  ');
      const allColumnsAndKeys = [columns, foreignKeyConstraints]
        .filter(Boolean)
        .join(',\n  ');

      return `DROP TABLE IF EXISTS ${quotedTableName} CASCADE;\nCREATE TABLE ${quotedTableName} (\n${allColumnsAndKeys}\n);`;
    })
    .join('\n');
};

const generateTypescriptInterfaces = (
  relationships: IRelationshipInfo[],
): string => {
  return relationships
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
  relationships: IRelationshipInfo[],
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  switch (fileType) {
    case 'sql-tables':
      return formatSQL(generateSQLSchema(relationships));
    case 'ts-interfaces':
      return generateTypescriptInterfaces(relationships);
    default:
      throw new Error('Invalid file type specified');
  }
};

export default generateFile;
