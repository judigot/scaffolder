import { format as formatSQL } from 'sql-formatter';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { getColumnDefinition, getForeignKeyConstraints } from '@/utils/common';

const quoteTableName = (tableName: string): string => `"${tableName}"`;

const generateSQLSchema = (schemaInfo: ISchemaInfo[]): string => {
  return formatSQL(
    schemaInfo
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
      .join('\n'),
  );
};

export default generateSQLSchema;
