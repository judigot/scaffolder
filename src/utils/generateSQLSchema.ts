import { format as formatSQL } from 'sql-formatter';
import { ISchemaInfo } from '@/interfaces/interfaces';
import {
  generateColumnDefinition,
  getForeignKeyConstraints,
  quote,
} from '@/utils/common';

const generateSQLSchema = (schemaInfo: ISchemaInfo[]): string => {
  return formatSQL(
    schemaInfo
      .map(({ table, columnsInfo }) => {
        const columns = columnsInfo
          .map((columnName) =>
            generateColumnDefinition({ columnName, columnType: 'sql-tables' }),
          )
          .join(',\n  ');
        const foreignKeyConstraints = getForeignKeyConstraints(
          table,
          schemaInfo,
        ).join(',\n  ');
        const allColumnsAndKeys = [columns, foreignKeyConstraints]
          .filter(Boolean)
          .join(',\n  ');

        return `DROP TABLE IF EXISTS ${quote}${table}${quote} CASCADE;\nCREATE TABLE ${quote}${table}${quote} (\n  ${allColumnsAndKeys}\n);`;
      })
      .join('\n'),
  );
};

export default generateSQLSchema;
