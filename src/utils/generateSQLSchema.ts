import { format as formatSQL } from 'sql-formatter';
import { ISchemaInfo } from '@/interfaces/interfaces';
import {
  generateColumnDefinition,
  getForeignKeyConstraints,
  quoteTableName,
} from '@/utils/common';

const generateSQLSchema = (schemaInfo: ISchemaInfo[]): string => {
  return formatSQL(
    schemaInfo
      .map(({ table, columnsInfo }) => {
        const quotedTableName = quoteTableName(table);
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

        return `DROP TABLE IF EXISTS ${quotedTableName};\nCREATE TABLE ${quotedTableName} (\n  ${allColumnsAndKeys}\n);`;
      })
      .join('\n'),
  );
};

export default generateSQLSchema;
